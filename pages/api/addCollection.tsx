import { apiHandler } from "@/lib/ApiHandler";
import db from "@/lib/db";
import { toApiRespDoc } from "@/lib/docutil";
import { AddCollectionSchema } from "@/lib/schema";
import { getCurrentTimeMillis } from "@/lib/timeutil";
import { Collection } from "@/models/Collection";
import { DataRecordModel } from "@/models/DataRecordRow";
import { User } from "next-auth";
import type { NextApiRequest, NextApiResponse } from "next/types";

type Data = {
  error?: string;
  result?: Object[];
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>, user?: User) {
  const { name, description, creator, dataType } = AddCollectionSchema.parse(req.body);

  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  return Collection({
    name,
    description,
    creator: user?.name || creator,
    creatorId: user?.id,
    createdAt: getCurrentTimeMillis(),
    lastUpdated: getCurrentTimeMillis(),
    meta: {
      dataType
    }
  })
    .save()
    .then((doc: any) => {
      db.model(doc.name, DataRecordModel, doc.name);

      res.json({
        result: toApiRespDoc(doc),
      });
    })
    .catch((err: any) => {
      res.status(500).json({
        error: err,
      });
    });
}

export default apiHandler(handler, { withAuth: true });
