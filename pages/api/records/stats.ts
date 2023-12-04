import { apiHandler } from "@/lib/ApiHandler";
import db from "@/lib/db";
import { Collection } from "@/models/Collection";
import { getRecordModel } from "@/models/DataRecordRow";
import { User } from "@/models/User";

export default apiHandler(async (req, res, user) => {
    try {
        const { collectionId } = req.query;
        if (req.method !== "GET") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        } else if (!collectionId) {
            res.status(400).json({ error: "Missing collectionId" });
            return;
        }

        const col = await Collection.findById(collectionId);
        if (!col) {
            res.status(404).json({ error: "Collection not found" });
            return;
        }

        const result = await getRecordModel(col.name).aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                }
            },
            //  replace newRoot with addFields
            {
                $addFields: {
                    status: "$_id",
                    count: "$count",
                }
            },
            {
                $project: {
                    _id: 0,
                }
            },
            {
                $group: {
                    _id: null,
                    stats: {
                        $push: {
                            k: "$status",
                            v: "$count",
                        }
                    }
                }
            },
            {
                $replaceRoot: {
                    newRoot: {
                        $arrayToObject: "$stats",
                    }
                }
            }
        ])

        if (result.length == 0) {
            return res.json({
                result: {
                    total: 0,
                    today: 0,
                    thisMonth: 0,
                    pending: 0,
                    rejected: 0,
                    approved: 0,
                }
            })
        }

        return res.json({ result: result[0] })
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}, {
    withAuth: true,
})