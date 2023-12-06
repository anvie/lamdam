import { apiHandler } from "@/lib/ApiHandler";
import { User } from "@/models/User";
import mongoose from "mongoose";

export default apiHandler(async (req, res) => {
    try {
        const { id } = req.query;
        if (req.method !== "GET") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }

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
                                            date: {
                                                $toDate: "$createdAt",
                                            },
                                            format: "%Y-%m-%d",
                                            timezone: "Asia/Jakarta",
                                        },
                                    },
                                },
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
                    userId: 1,
                    stats: {
                        total: {
                            $size: "$records",
                        },
                        today: {
                            $size: {
                                $filter: {
                                    input: "$records",
                                    as: "rec",
                                    cond: {
                                        $eq: [
                                            "$$rec.date",
                                            {
                                                $dateToString: {
                                                    format: "%Y-%m-%d",
                                                    date: new Date(),
                                                    timezone: "Asia/Jakarta",
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                        thisMonth: {
                            $size: {
                                $filter: {
                                    input: "$records",
                                    as: "rec",
                                    cond: {
                                        $eq: [
                                            "$$rec.month",
                                            {
                                                $month: new Date(),
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                        pending: {
                            $size: {
                                $filter: {
                                    input: "$records",
                                    as: "rec",
                                    cond: {
                                        $eq: ["$$rec.status", "pending"],
                                    },
                                },
                            },
                        },
                        rejected: {
                            $size: {
                                $filter: {
                                    input: "$records",
                                    as: "rec",
                                    cond: {
                                        $eq: ["$$rec.status", "rejected"],
                                    },
                                },
                            },
                        },
                        approved: {
                            $size: {
                                $filter: {
                                    input: "$records",
                                    as: "rec",
                                    cond: {
                                        $eq: ["$$rec.status", "approved"],
                                    },
                                },
                            },
                        },
                    },
                },
            },
            { $match: { userId: String(id) } }
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

        return res.json({ result: result[0].stats })
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}, {
    withAuth: true,
})