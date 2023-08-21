import { apiHandler } from "@/lib/ApiHandler";
import { toApiRespDoc } from "@/lib/docutil";
import { __debug, __error } from "@/lib/logger";
import { UpdateRecordSchema } from "@/lib/schema";
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
  const { id, prompt, response, input, history, collectionId } =
    UpdateRecordSchema.parse(req.body);

  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const colDoc = await Collection.findOne({ _id: collectionId });

  if (!colDoc) {
    return res.status(404).end();
  }

  const col = mongoose.connection.db.collection(colDoc.name);

  return col.updateOne(
    { _id: new Types.ObjectId(id) },
    {
      $set: {
        prompt,
        response,
        input,
        history,
        createdAt: getCurrentTimeMillis(),
        lastUpdated: getCurrentTimeMillis(),
        collectionId,
      },
    }
  ).then(async (resp: any) => {
    __debug('resp:', resp);

    const doc = await col.findOne({_id: new Types.ObjectId(id) })
    __debug('doc:', doc)

    return res.json({
      result: toApiRespDoc(doc),
    });
  })
  .catch((err: any) => {
    __error('err:', err)
    return res.status(500).json({
      error: err,
    });
  });

  // return DataRecordRow.updateOne(
  //   { _id: id },
  //   {
  //     $set: {
  //       prompt,
  //       response,
  //       input,
  //       history,
  //       createdAt: getCurrentTimeMillis(),
  //       lastUpdated: getCurrentTimeMillis(),
  //       collectionId,
  //     },
  //   }
  // )
  // .then((doc: any) => {
  //   __debug('doc:', doc)
  //   res.json({
  //     result: doc,
  //   });
  // })
  // .catch((err: any) => {
  //   __error('err:', err)
  //   res.status(500).json({
  //     error: err,
  //   });
  // });
}

export default apiHandler(handler);
