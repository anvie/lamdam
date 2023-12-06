import { apiHandler } from "@/lib/ApiHandler";
import { Collection } from "@/models/Collection";
import { getRecordModel } from "@/models/DataRecordRow";

export default apiHandler(async (req, res, user) => {
    try {
        let { collectionId, keyword, features = [], creators = [] } = req.query;
        if (req.method !== "GET") {
            return res.status(405).json({ error: "Method not allowed" });
        } else if (!collectionId) {
            return res.status(400).json({ error: "Missing collectionId" });
        }

        const col = await Collection.findById(collectionId);
        if (!col) {
            return res.status(400).json({ error: "Collection not found" });
        }

        let filter = {}
        if (keyword) {
            filter = {
                $or: [
                    { prompt: { $regex: keyword, $options: "i" } },
                    { response: { $regex: keyword, $options: "i" } },
                    { input: { $regex: keyword, $options: "i" }, },
                ]
            }
        }

        creators = Array.isArray(creators) ? creators : [creators];
        features = Array.isArray(features) ? features : [features];

        if (creators.length) {
            filter = {
                ...filter,
                creatorId: { $in: creators }
            }
        }

        if (features.length) {
            filter = {
                ...filter,
                $and: [
                    {
                        $or: features.map(f => {
                            const key = f.toLowerCase().trim()
                            return { [key]: { $nin: [null, "", []] } }
                        })
                    }
                ]
            }
        }

        const result = await getRecordModel(col.name).aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                }
            },
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