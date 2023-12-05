import { apiHandler } from "@/lib/ApiHandler"
import { toApiRespDoc } from "@/lib/docutil"
import { DataRecord } from "@/types"
import type { NextApiRequest, NextApiResponse } from "next/types"

import { __error } from "@/lib/logger"
import { Collection } from "@/models/Collection"
import { getRecordModel } from "@/models/DataRecordRow"
import { Types } from "mongoose"
import { User } from "next-auth"

type Data = {
    error?: string;
    result?: {
        entries: DataRecord[],
        paging?: {
            hasNext: boolean,
            hasPrev: boolean
        }
    };
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>, user?: User) {
    try {
        if (req.method !== "GET") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        // immutable
        const { collectionId, keyword, fromId, toId, status } = req.query;

        // muttable
        let { creators = [], features = ["prompt"], sort = "desc" } = req.query;

        const colDoc = await Collection.findOne({ _id: collectionId });

        if (!colDoc) {
            return res.status(404).json({ error: "collection not found" });
        }

        creators = Array.isArray(creators) ? creators : [creators];
        features = Array.isArray(features) ? features : [features];

        let filter: any = {}

        if (keyword) {
            filter = {
                $or: [
                    { prompt: { $regex: keyword, $options: "i" } },
                    { response: { $regex: keyword, $options: "i" } },
                    { input: { $regex: keyword, $options: "i" }, },
                ]
            }
        }

        if (user?.role && ['annotator', 'contributor'].includes(user.role)) {
            console.log("🚀 ~ file: index.ts:75 ~ handler ~ user?.role :", user?.role)
            filter = {
                ...filter,
                $and: [
                    {
                        $or: [
                            { creatorId: user?.id },
                            { status: "approved" }
                        ]
                    }
                ]
            }
        }

        if (status && status !== "all") {
            filter = {
                ...filter,
                status: Array.isArray(status) ? { $in: status.map(s => s.trim()) } : status.trim()
            }
        }

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

        let sortBy: any = {}
        sortBy = { _id: sort === "asc" ? 1 : -1 }

        // fromId is indicator of next page
        if (fromId) {
            filter = {
                ...filter,
                _id: sort === "asc" ? {
                    $gt: new Types.ObjectId(String(fromId))
                } : {
                    $lt: new Types.ObjectId(String(fromId))
                }
            }
        }
        // toId is indicator of prev page
        else if (toId) {
            filter = {
                ...filter,
                _id: sort === "asc" ? {
                    $lt: new Types.ObjectId(String(toId))
                } : {
                    $gt: new Types.ObjectId(String(toId))
                }
            }
            sortBy._id = sort === "asc" ? -1 : 1
        }

        let paging = { hasNext: false, hasPrev: false, totalPage: 0, firstId: null, lastId: null }

        const model = getRecordModel(colDoc.name)
        let records = await model.find(filter)
            .limit(10)
            .sort(sortBy)

        if(toId) {
            records = records.reverse()
        }

        if (records.length > 0) {
            const firstId = records[0]._id
            const lastId = records[records.length - 1]._id

            const pagingData = await model.aggregate([
                {
                    $facet: {
                        total: [
                            {
                                $match: {
                                    ...filter,
                                    _id: {
                                        $ne: null
                                    }
                                }
                            },
                            { $sort: sortBy },
                            { $group: { _id: null, count: { $sum: 1 } } },
                            {
                                $project: {
                                    _id: 0,
                                    count: 1,
                                    page: {
                                        $ceil: { $divide: ["$count", 10] }
                                    }
                                }
                            },
                        ],
                        hasPrev: [
                            {
                                $match: {
                                    ...filter,
                                    _id: sort === "asc" ? { $lt: firstId } : { $gt: firstId }
                                }
                            },
                            { $limit: 1 },
                            { $sort: sortBy },
                            { $project: { _id: 1 } },
                        ],
                        hasNext: [
                            {
                                $match: {
                                    ...filter,
                                    _id: sort === "asc" ? { $gt: lastId } : { $lt: lastId }
                                }
                            },
                            { $limit: 1 },
                            { $sort: sortBy },
                            { $project: { _id: 1 } },
                        ],
                    },
                },
                { $unwind: "$total" },
                {
                    $project: {
                        totalPage: "$total.page",
                        count: "$total.count",
                        hasPrev: { $gt: [{ $size: "$hasPrev" }, 0] },
                        hasNext: { $gt: [{ $size: "$hasNext" }, 0] },
                    },
                },
            ]);

            if (pagingData.length > 0) {
                paging = {
                    ...pagingData[0],
                    firstId,
                    lastId,
                }
            }
        }

        const result = {
            entries: records.map(toApiRespDoc),
            paging,
        };

        return res.status(200).json({ result });
    } catch (error: any) {
        __error("err:", error);
        return res.status(404).json({ error: error.message });
    }
}

export default apiHandler(handler, { withAuth: true });
