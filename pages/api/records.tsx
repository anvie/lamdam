import { apiHandler } from "@/lib/ApiHandler";
import { toApiRespDoc } from "@/lib/docutil";
import { DataRecordRow } from "@/models/DataRecordRow";
import { DataRecord } from "@/types";
import type { NextApiRequest, NextApiResponse } from "next/types";

// import db from "@/lib/db";
const db = require("../../lib/db");
const mongoose = require("mongoose");

import { Collection } from "@/models/Collection";
import { __debug, __error } from "@/lib/logger";

type Data = {
  error?: string;
  result?: DataRecord[];
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const {
    query: { collectionId, q },
    method,
  } = req;

  if (method !== "GET") {
    res.status(405).end();
    return;
  }

  const colDoc = await Collection.findOne({ _id: collectionId });
  __debug('colDoc:', colDoc)

  if (!colDoc) {
    return res.status(404).end();
  }
  const col = mongoose.connection.db.collection(colDoc.name);

  let query:any = {};

  if (q) {
    query = { ...query, prompt: { $regex: q, $options: "i" } };
  }

  __debug('query:', query)

  return await col.find(query)
    .sort({ createdAt: -1 })
    .limit(15)
    .toArray()
    .then((docs: any[]) => {
      return res.json({ result: docs.map(toApiRespDoc).map((rec) => {
        rec.history = rec.history ? rec.history : [];
        return rec
      }) });
    }).catch((err:any) => {
      __error('err:', err)
     return res.status(404).json({ result: [] });
    })

  // return await DataRecordRow.find({}).sort({createdAt:-1}).then((docs: any[]) => {
  //   return res.json({ result: docs.map(toApiRespDoc) });
  // });
}

export default apiHandler(handler);
