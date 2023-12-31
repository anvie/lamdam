import { apiHandler } from "@/lib/ApiHandler";
import { __error } from "@/lib/logger";
import { DeleteRecordSchema } from "@/lib/schema";
import { Collection } from "@/models/Collection";
import mongoose, { Types } from "mongoose";
import type { NextApiRequest, NextApiResponse } from "next/types";

type Data = {
  error?: string;
  result?: Object;
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { id, collectionId } = DeleteRecordSchema.parse(req.body);

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const colDoc = await Collection.findOne({ _id: collectionId });

    if (!colDoc) {
      return res.status(404).end();
    }

    const col = mongoose.connection.collection(colDoc.name);

    const rv = await col.deleteOne({ _id: new Types.ObjectId(id) });

    // decrease count
    await Collection.updateOne({ _id: collectionId }, { $set: { count: await col.countDocuments() } });

    return res.json({
      result: {
        deletedCount: rv.deletedCount,
      }
    });
  } catch (err: any) {
    __error(err);
    return res.status(404).json({
      error: "Cannot delete record"
    })
  }
}

export default apiHandler(handler, { withAuth: true });
