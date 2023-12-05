import { apiHandler } from "@/lib/ApiHandler";
import { User } from "@/models/User";
import mongoose from "mongoose";

export default apiHandler(async (req, res) => {
    try {
        const { id, date } = req.query;
        if (req.method !== "GET") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        } else if (!id) {
            res.status(400).json({ error: "User id is required" });
            return;
        } else if (!date) {
            res.status(400).json({ error: "params `date` is required" });
            return;
        }

        // get month from date
        const month = new Date(String(date)).getMonth() + 1;

        const collections: string[] = await mongoose.connection.collection("collections")
            .find({})
            .project({ _id: 0, name: 1 })
            .toArray()
            .then((result: any) => result.map((c: any) => c.name));

        const result = await User.aggregate([
            {
                $addFields: {
                    userId: { $toString: "$_id" },
                }
            },
            { $match: { userId: String(id) } },
            ...collections.map((col) => {
                return {
                    $lookup: {
                        from: col,
                        localField: "userId",
                        foreignField: "creatorId",
                        as: col,
                        pipeline: [
                            {
                                $addFields: {
                                    month: {
                                        $month: {
                                            $toDate: "$createdAt",
                                        },
                                    },
                                    date: {
                                        $dateToString: {
                                            format: "%Y-%m-%d",
                                            date: {
                                                $toDate: "$createdAt",
                                            },
                                        },
                                    },
                                },
                            },
                            {
                                $project: {
                                    status: 1,
                                    month: 1,
                                    date: 1,
                                }
                            },
                        ],
                    },
                }
            }),
            {
                $addFields: {
                    records: {
                        $concatArrays: collections.map((col) => `$${col}`),
                    }
                }
            },
            {
                $project: {
                    records: {
                        $filter: {
                            input: "$records",
                            as: "rec",
                            cond: {
                                $eq: ["$$rec.month", month],
                            },
                        },
                    },
                }
            },
        ])

        if (result.length == 0) {
            return res.json({ result: [] })
        }

        return res.json({ result: result[0].records })
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}, {
    withAuth: true,
})