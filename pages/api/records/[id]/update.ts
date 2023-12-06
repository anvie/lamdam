import { apiHandler } from "@/lib/ApiHandler";
import { toApiRespDoc } from "@/lib/docutil";
import { __debug, __error } from "@/lib/logger";
import { UpdateRecordSchema } from "@/lib/schema";
import { getCurrentTimeMillis } from "@/lib/timeutil";
import { Collection } from "@/models/Collection";
import type { NextApiRequest, NextApiResponse } from "next/types";

import mongoose, { Types } from "mongoose";
import { User as UserAuth } from "next-auth";
import { User } from "@/models/User";

type Data = {
  error?: string;
  result?: Object[];
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>, user?: UserAuth) {
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

  const col = mongoose.connection.collection(colDoc.name);

  const dbUser = await User.findById(user?.id).exec();

  // let _normalizedHistory:any = history;

  // // check if inside history array all value only empty string ("") then remove it from array
  // if (_normalizedHistory.every((h: string) => h === "")) {
  //   _normalizedHistory = [];
  // }

  // if (_normalizedHistory.length > 0) {
  //   // check, history length must be even
  //   if (_normalizedHistory.filter((h:any) => h !== "").length % 2 !== 0) {
  //     return res.status(400).json({
  //       error: "History length must be even, got " + _normalizedHistory.length,
  //     });
  //   }

  //   // filter out empty history
  //   _normalizedHistory = _normalizedHistory.filter((h: string) => h !== "");

  //   const grouped = [];

  //   for (let i = 0; i < _normalizedHistory.length; i += 2) {
  //     grouped.push(_normalizedHistory.slice(i, i + 2));
  //   }

  //   _normalizedHistory = grouped;
  // }

  // __debug("_normalizedHistory:", _normalizedHistory);

  return col
    .updateOne(
      { _id: new Types.ObjectId(id) },
      {
        $set: {
          prompt,
          response,
          input,
          history,
          lastUpdated: getCurrentTimeMillis(),
          collectionId,
          status: 'pending'
        },
      }
    )
    .then(async (resp: any) => {
      // __debug("resp:", resp);
      await dbUser.updateLastActivity();

      const doc = await col.findOne({ _id: new Types.ObjectId(id) });
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

export default apiHandler(handler, { withAuth: true });
