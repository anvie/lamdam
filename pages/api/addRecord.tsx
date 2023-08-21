import { apiHandler } from "@/lib/ApiHandler";
import { toApiRespDoc } from "@/lib/docutil";
import { __debug, __error } from "@/lib/logger";
import { AddRecordSchema } from "@/lib/schema";
import { getCurrentTimeMillis } from "@/lib/timeutil";
import { Collection } from "@/models/Collection";
import { DataRecordRow } from "@/models/DataRecordRow";
import type { NextApiRequest, NextApiResponse } from "next/types";
import mongoose from "mongoose";
const db = require("../../lib/db");

type Data = {
  error?: string;
  result?: Object[];
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { prompt, response, input, history, collectionId } =
    AddRecordSchema.parse(req.body);

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const colDoc = await Collection.findOne({ _id: collectionId });

    if (!colDoc) {
      return res.status(404).end();
    }

    const col = mongoose.connection.db.collection(colDoc.name);

    return col
      .insertOne({
        prompt,
        response,
        input,
        history,
        createdAt: getCurrentTimeMillis(),
        lastUpdated: getCurrentTimeMillis(),
        meta: {},
      })
      .then(async (resp: any) => {
        // __debug("resp:", resp);

        // increase collection count
        await Collection.updateOne(
          { _id: collectionId },
          { $inc: { count: 1 } }
        );

        const doc = await col.findOne({ _id: resp.insertedId });
        // __debug("doc:", doc);

        return res.json({
          result: toApiRespDoc(doc),
        });
      })
      .catch((err: any) => {
        __error("err:", err);
        return res.status(500).json({
          error: err,
        });
      });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
}

export default apiHandler(handler);
