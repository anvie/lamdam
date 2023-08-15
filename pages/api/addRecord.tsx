import { apiHandler } from "@/lib/ApiHandler";
import { toApiRespDoc } from "@/lib/docutil";
import { AddRecordSchema } from "@/lib/schema";
import { getCurrentTimeMillis } from "@/lib/timeutil";
import { Collection } from "@/models/Collection";
import { DataRecordRow } from "@/models/DataRecordRow";
import type { NextApiRequest, NextApiResponse } from "next/types";

const db = require("../../lib/db");

type Data = {
  error?: string;
  result?: Object[];
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { prompt, response, history, collectionId } = AddRecordSchema.parse(req.body);

  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  return DataRecordRow({
    prompt, response, history,
    createdAt: getCurrentTimeMillis(),
    lastUpdated: getCurrentTimeMillis(),
    collectionId
  })
    .save()
    .then(async (doc: any) => {

      // increase collection count
      await Collection.updateOne({ _id: doc.collectionId }, {$inc: {count: 1}})

      return res.json({
        result: toApiRespDoc(doc),
      });
    })
    .catch((err: any) => {
      res.status(500).json({
        error: err,
      });
    });
}

export default apiHandler(handler);
