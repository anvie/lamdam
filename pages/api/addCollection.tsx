import { apiHandler } from "@/lib/ApiHandler";
import { toApiRespDoc } from "@/lib/docutil";
import { AddCollectionSchema } from "@/lib/schema";
import { getCurrentTimeMillis } from "@/lib/timeutil";
import { Collection } from "@/models/Collection";
import { DataRecordModel } from "@/models/DataRecordRow";
import { User } from "@/models/User";
import mongoose from "mongoose";
import { User as UserAuth } from "next-auth";
import type { NextApiRequest, NextApiResponse } from "next/types";

type Data = {
  error?: string;
  result?: Object[];
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>, user?: UserAuth) {
  const { name, description, creator, dataType } = AddCollectionSchema.parse(req.body);

  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const dbUser = await User.findById(user?.id).exec();

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
      mongoose.connection.model(doc.name, DataRecordModel, doc.name);
      dbUser.updateLastActivity()

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
