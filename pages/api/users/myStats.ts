import { apiHandler } from "@/lib/ApiHandler";
import { getDaysInCurrentMonth } from "@/lib/timeutil";
import { User } from "@/models/User";
import mongoose from "mongoose";

export default apiHandler(async (req, res, user) => {
    try {
        if (req.method !== "GET") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }

        const collections: string[] = await mongoose.connection.collection("collections")
            .find({})
            .project({ _id: 0, name: 1 })
            .toArray()
            .then((result: any) => result.map((c: any) => c.name));

        const days = getDaysInCurrentMonth()
        let result = {
            total: 0,
            today: 0,
            thisMonth: 0,
            pending: 0,
            rejected: 0,
            approved: 0,
            targets: {}
        }

        let monthlyTarget = user?.meta?.monthlyTarget || 0;
        let dailyTarget = monthlyTarget / days;

        const isAnnotator = user?.role === 'annotator';

        if (user?.role === 'corrector') {
            const annotatorMonthlyTargets = await User.aggregate([
                {
                    $match: {
                        role: 'annotator',
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: "$meta.monthlyTarget"
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        total: 1,
                    }
                }
            ])

            if (annotatorMonthlyTargets.length > 0) {
                monthlyTarget = annotatorMonthlyTargets[0].total;
                dailyTarget = monthlyTarget / days;
            }

        }

        const userStats = await User.aggregate([
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
                        foreignField: isAnnotator ? "creatorId" : "meta.lastModifiedBy",
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
                                    monthModified: {
                                        $month: {
                                            $toDate: "$lastUpdated",
                                        },
                                    },
                                    dateModified: {
                                        $dateToString: {
                                            format: "%Y-%m-%d",
                                            date: {
                                                $toDate: "$lastUpdated",
                                            },
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
                                            isAnnotator ? "$$rec.date" : "$$rec.dateModified",
                                            {
                                                $dateToString: {
                                                    format: "%Y-%m-%d",
                                                    date: new Date(),
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
                                            isAnnotator ? "$$rec.month" : "$$rec.monthModified",
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
            { $match: { userId: user?.id } }
        ])

        if (userStats.length !== 0) {
            result = userStats[0].stats;
        }

        return res.json({
            result: {
                ...result,
                targets: {
                    monthly: monthlyTarget,
                    daily: Math.round(dailyTarget),
                },
            }
        })
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}, {
    withAuth: true,
})