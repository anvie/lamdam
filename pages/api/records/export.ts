import { apiHandler } from "@/lib/ApiHandler";
import { __debug } from "@/lib/logger";
import { ExportRecordsSchema } from "@/lib/schema";
import { Collection } from "@/models/Collection";
import mongoose from "mongoose";
import { NextApiResponse } from "next";

type Data = {
    error?: string;
    result?: Object;
};

export default apiHandler(async (req, res: NextApiResponse<Data>) => {
    try {
        const { ids, collection_id } = ExportRecordsSchema.parse(req.body);
        __debug("collectionId:", collection_id);

        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }

        const col = await Collection.findOne({ _id: collection_id });

        if (!col) {
            res.status(404).json({ error: "Not found" });
            return;
        }

        const db = mongoose.connection.db;

        // find ids records in collection
        let cursor: mongoose.mongo.FindCursor<mongoose.mongo.WithId<mongoose.mongo.BSON.Document>>
        if (ids.length > 0) {
            cursor = db
                .collection(col.name)
                .find({ _id: { $in: Object.freeze(ids.map(id => new mongoose.Types.ObjectId(id))) }, status: "approved" })
        } else {
            cursor = db
                .collection(col.name)
                .find({ status: "approved" })
        }

        const records = await cursor.toArray();
        const result = records.map(r => {
            return {
                instruction: r.prompt,
                response: r.response,
                input: r.input,
                history: r.history,
            }
        })

        res.status(200).json({ result });
    } catch (error: any) {
        __debug("error:", error);
        res.status(500).json({ error: error.message });
    }
});