import { apiHandler } from "@/lib/ApiHandler";
import { __debug } from "@/lib/logger";
import { ImportRecordsSchema } from "@/lib/schema";
import { Collection } from "@/models/Collection";
import mongoose from "mongoose";
import { NextApiResponse } from "next";

type Data = {
    error?: string;
    result?: Object;
};

export default apiHandler(async (req, res: NextApiResponse<Data>) => {
    try {
        const { records, collection_id } = ImportRecordsSchema.parse(req.body);
        __debug("collectionId:", collection_id);
        __debug("records:", records.length);

        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }

        const col = await Collection.findOne({ _id: collection_id });

        if (!col) {
            res.status(404).json({ error: "Not found" });
            return;
        }

        if (records.length === 0) {
            res.status(400).json({ error: "No records to import" });
            return;
        }

        const db = mongoose.connection.db;

        const new_records = records.map((record) => {
            return {
                prompt: record.instruction,
                response: record.response,
                input: record.input,
                history: record.history,
            }
        })
        const result = await db.collection(col.name).insertMany(new_records);
        if (result.acknowledged) {
            // increase collection count
            await Collection.updateOne(
                { _id: collection_id },
                { $inc: { count: result.insertedCount } }
            );

            return res.status(200).json({
                result: {
                    success: result.acknowledged ?? false,
                    inserted: result.insertedCount
                }
            });
        } else {
            return res.status(500).json({
                error: "Failed to import records"
            });
        }
    } catch (error: any) {
        __debug("error:", error);
        res.status(500).json({ error: error.message });
    }
});