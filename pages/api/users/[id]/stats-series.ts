import { apiHandler } from "@/lib/ApiHandler";
import { getDaysInCurrentMonth } from "@/lib/timeutil";
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
        }

        // get month from date
        const month = date ? new Date(String(date)).getMonth() + 1 : new Date().getMonth() + 1;
        const days = getDaysInCurrentMonth()

        const collections: string[] = await mongoose.connection.collection("collections")
            .find({})
            .project({ _id: 0, name: 1 })
            .toArray()
            .then((result: any) => result.map((c: any) => c.name));

        const pipeline = [
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
                            timezone: "Asia/Jakarta",
                        },
                    },
                    datetime: {
                        $dateToString: {
                            date: {
                                $toDate: "$createdAt",
                            },
                            timezone: "Asia/Jakarta",
                        },
                    },
                },
            },
            {
                $addFields: {
                    hour: {
                        $hour: {
                            $toDate: "$datetime"
                        }
                    }
                }
            },
            {
                $project: {
                    status: 1,
                    month: 1,
                    date: {
                        $cond: [
                            { $eq: ["$hour", 0] },
                            {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: {
                                        $dateSubtract: {
                                            startDate: {
                                                $toDate: "$datetime"
                                            },
                                            unit: "hour",
                                            amount: 7,
                                        },
                                    },
                                }
                            },
                            "$date",
                        ]
                    },
                    datetime: 1
                }
            },
            { $match: { month } },
            {
                $group: {
                    _id: {
                        status: "$status",
                        date: "$date",
                    },
                    count: { $sum: 1 },
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    pending: {
                        $sum: {
                            $cond: [
                                { $eq: ["$_id.status", "pending"] },
                                "$count",
                                0
                            ]
                        }
                    },
                    approved: {
                        $sum: {
                            $cond: [
                                { $eq: ["$_id.status", "approved"] },
                                "$count",
                                0
                            ]
                        }
                    },
                    rejected: {
                        $sum: {
                            $cond: [
                                { $eq: ["$_id.status", "rejected"] },
                                "$count",
                                0
                            ]
                        }
                    },
                    total: {
                        $sum: "$count"
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    stats: {
                        pending: "$pending",
                        approved: "$approved",
                        rejected: "$rejected",
                        total: "$total",
                        isAchieved: {
                            $cond: [
                                { $gte: ["$total", "$$dailyTarget"] },
                                true,
                                false
                            ]
                        },
                    }
                }
            },
            { $sort: { date: 1 } },
        ] as any

        const result = await User.aggregate([
            {
                $addFields: {
                    userId: { $toString: "$_id" },
                }
            },
            { $match: { userId: String(id) } },
            {
                $facet: {
                    role: [
                        {
                            $project: {
                                _id: 0,
                                name: "$role",
                            }
                        },
                    ],
                    others: [
                        {
                            $match: {
                                role: {
                                    $nin: ["corrector"],
                                },
                            },
                        },
                        {
                            $addFields: {
                                dailyTarget: {
                                    $round: {
                                        $divide: [
                                            "$meta.monthlyTarget",
                                            days
                                        ]
                                    }
                                },
                            }
                        },
                        ...collections.map((col) => {
                            return {
                                $lookup: {
                                    from: col,
                                    localField: "userId",
                                    foreignField: "creatorId",
                                    as: col,
                                    let: {
                                        dailyTarget: "$dailyTarget"
                                    },
                                    pipeline,
                                },
                            }
                        }),
                        {
                            $project: {
                                timeSeries: {
                                    $concatArrays: collections.map((col) => `$${col}`),
                                }
                            }
                        },
                    ],
                    corrector: [
                        {
                            $match: {
                                role: "corrector",
                            },
                        },
                        {
                            $lookup: {
                                from: "users",
                                as: "meta_stats",
                                pipeline: [
                                    {
                                        $match: {
                                            role: "annotator",
                                        },
                                    },
                                    {
                                        $group: {
                                            _id: null,
                                            monthlyTarget: {
                                                $sum: "$meta.monthlyTarget",
                                            },
                                        },
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            monthlyTarget: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        { $unwind: "$meta_stats" },
                        {
                            $addFields: {
                                dailyTarget: {
                                    $round: {
                                        $divide: [
                                            "$meta_stats.monthlyTarget",
                                            days
                                        ]
                                    }
                                },
                            }
                        },
                        ...collections.map((col) => {
                            return {
                                $lookup: {
                                    from: col,
                                    localField: "userId",
                                    foreignField: "meta.lastModifiedBy",
                                    as: col,
                                    let: {
                                        dailyTarget: "$dailyTarget"
                                    },
                                    pipeline,
                                },
                            }
                        }),
                        {
                            $project: {
                                timeSeries: {
                                    $concatArrays: collections.map((col) => `$${col}`),
                                }
                            }
                        },
                    ]
                }
            },
            { $unwind: "$role" },
            {
                $addFields: {
                    timeSeries: {
                        $cond: [
                            { $eq: ["$role.name", "corrector"] },
                            { $arrayElemAt: ["$corrector.timeSeries", 0] },
                            { $arrayElemAt: ["$others.timeSeries", 0] },
                        ]
                    },
                }
            },
            {
                $project: {
                    timeSeries: 1,
                    daysAchieved: {
                        $size: {
                            $filter: {
                                input: "$timeSeries",
                                as: "ts",
                                cond: {
                                    $eq: ["$$ts.stats.isAchieved", true]
                                }
                            }
                        }
                    },
                    daysNotAchieved: {
                        $size: {
                            $filter: {
                                input: "$timeSeries",
                                as: "ts",
                                cond: {
                                    $eq: ["$$ts.stats.isAchieved", false]
                                }
                            }
                        }
                    },
                    totalRecords: {
                        $sum: {
                            $map: {
                                input: "$timeSeries",
                                as: "ts",
                                in: "$$ts.stats.total"
                            }
                        }
                    },
                    pendingRecords: {
                        $sum: {
                            $map: {
                                input: "$timeSeries",
                                as: "ts",
                                in: "$$ts.stats.pending"
                            }
                        }
                    },
                    approvedRecords: {
                        $sum: {
                            $map: {
                                input: "$timeSeries",
                                as: "ts",
                                in: "$$ts.stats.approved"
                            }
                        }
                    },
                    rejectedRecords: {
                        $sum: {
                            $map: {
                                input: "$timeSeries",
                                as: "ts",
                                in: "$$ts.stats.rejected"
                            }
                        }
                    },
                }
            },
        ])

        if (result.length == 0) {
            return res.json({ result: [] })
        }

        return res.json({ result: result[0] })
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}, {
    withAuth: true,
})