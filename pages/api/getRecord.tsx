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
import { Types } from "mongoose";
import { GetRecordSchema } from "@/lib/schema";

type Data = {
  error?: string;
  result?: DataRecord[];
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { collectionId, id } = GetRecordSchema.parse(req.query);

  if (req.method !== "GET") {
    res.status(405).end();
    return;
  }

  const colDoc = await Collection.findOne({ _id: collectionId });
  __debug('colDoc:', colDoc)

  if (!colDoc) {
    return res.status(404).end();
  }
  const col = mongoose.connection.db.collection(colDoc.name);

  return await col.findOne({_id: new Types.ObjectId(id)})
    .then((doc: any) => {
      return res.json({ result: toApiRespDoc(doc) });
    }).catch((err:any) => {
      __error('err:', err)
     return res.status(404).json({ result: [] });
    })

  // return await DataRecordRow.find({}).sort({createdAt:-1}).then((docs: any[]) => {
  //   return res.json({ result: docs.map(toApiRespDoc) });
  // });
}

export default apiHandler(handler);
