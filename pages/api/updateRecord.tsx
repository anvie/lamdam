import { apiHandler } from "@/lib/ApiHandler";
import { toApiRespDoc } from "@/lib/docutil";
import { __debug, __error } from "@/lib/logger";
import { AddRecordSchema, UpdateRecordSchema } from "@/lib/schema";
import { getCurrentTimeMillis } from "@/lib/timeutil";
import { DataRecordRow } from "@/models/DataRecordRow";
import type { NextApiRequest, NextApiResponse } from "next/types";

const db = require("../../lib/db");

type Data = {
  error?: string;
  result?: Object[];
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { id, prompt, response, history, collectionId } =
    UpdateRecordSchema.parse(req.body);

  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  return DataRecordRow.updateOne(
    { _id: id },
    {
      $set: {
        prompt,
        response,
        history,
        createdAt: getCurrentTimeMillis(),
        lastUpdated: getCurrentTimeMillis(),
        collectionId,
      },
    }
  )
    .then((doc: any) => {
      __debug('doc:', doc)
      res.json({
        result: doc,
      });
    })
    .catch((err: any) => {
      __error('err:', err)
      res.status(500).json({
        error: err,
      });
    });
}

export default apiHandler(handler);
