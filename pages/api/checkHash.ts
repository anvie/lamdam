import { apiHandler } from "@/lib/ApiHandler";
import { __debug } from "@/lib/logger";
import { CheckHashSchema, ImportRecordsSchema } from "@/lib/schema";
import { Collection } from "@/models/Collection";
import mongoose from "mongoose";
import { NextApiResponse } from "next";

type Data = {
    error?: string;
    result?: Object;
};

export default apiHandler(async (req, res: NextApiResponse<Data>) => {
    try {
        const { hashes, collection_id } = CheckHashSchema.parse(req.body);
        __debug("collectionId:", collection_id);
        __debug("hashes:", hashes.length);

        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }

        const col = await Collection.findOne({ _id: collection_id });

        if (!col) {
            res.status(404).json({ error: "Not found" });
            return;
        }

        if (hashes.length === 0) {
            res.status(400).json({ error: "No hash(es) to check" });
            return;
        }

        const db = mongoose.connection.db;

        // check duplicate hashes on col.name and return it if duplicate
        const result = await db.collection(col.name)
            .find({ hash: { $in: hashes } })
            .project({ _id: 0, hash: 1 })
            .toArray()
            .then(result => result.map((r) => r.hash));

        return res.status(200).json({ result });
    } catch (error: any) {
        __debug("error:", error);
        res.status(500).json({ error: error.message });
    }
});