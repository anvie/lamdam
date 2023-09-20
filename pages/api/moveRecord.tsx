import { apiHandler } from "@/lib/ApiHandler";
import { toApiRespDoc } from "@/lib/docutil";
import { __debug, __error } from "@/lib/logger";
import { MoveRecordSchema } from "@/lib/schema";
import { getCurrentTimeMillis } from "@/lib/timeutil";
import { Collection } from "@/models/Collection";
import type { NextApiRequest, NextApiResponse } from "next/types";
import mongoose, { Types } from "mongoose";
const db = require("../../lib/db");

type Data = {
  error?: string;
  result?: Object[];
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { id, colSrcId, colDstId } = MoveRecordSchema.parse(req.body);

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const colDest = await Collection.findOne({ _id: colDstId });

    if (!colDest) {
      return res.status(404).end();
    }

    const colSrc = await Collection.findOne({ _id: colSrcId });

    if (!colSrc) {
      return res.status(404).end();
    }

    const colSrcObj = mongoose.connection.db.collection(colSrc.name);
    const colDstObj = mongoose.connection.db.collection(colDest.name);

    const doc = await colSrcObj.findOne({ _id: new Types.ObjectId(id) });

    return colDstObj
      .insertOne({
        ...doc,
        lastUpdated: getCurrentTimeMillis(),
        meta: {},
      })
      .then(async (resp: any) => {
        __debug("resp:", resp);

        // remove from source collection
        await colSrcObj.deleteOne({ _id: new Types.ObjectId(id) });

        // decrease and increase collection count
        await Collection.updateOne({ _id: colSrcId }, { $inc: { count: -1 } });
        await Collection.updateOne({ _id: colDstId }, { $inc: { count: 1 } });

        const doc = await colDstObj.findOne({ _id: resp.insertedId });
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
