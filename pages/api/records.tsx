import { apiHandler } from "@/lib/ApiHandler";
import { toApiRespDoc } from "@/lib/docutil";
import { DataRecord } from "@/types";
import type { NextApiRequest, NextApiResponse } from "next/types";

// import db from "@/lib/db";
const db = require("../../lib/db");
const mongoose = require("mongoose");

import { __error } from "@/lib/logger";
import { Collection } from "@/models/Collection";
import { Types } from "mongoose";

type Data = {
    error?: string;
    result?: DataRecord[];
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
    // immutable
    const {
        query: { collectionId, q, order, fromId, toId },
        method,
    } = req;

    // muttable
    let {
        query: { creators = [], features = ["prompt"] },
    } = req;

    if (method !== "GET") {
        res.status(405).end();
        return;
    }

    const colDoc = await Collection.findOne({ _id: collectionId });

    if (!colDoc) {
        return res.status(404).end();
    }
    const col = mongoose.connection.db.collection(colDoc.name);

    creators = Array.isArray(creators) ? creators : [creators];
    features = Array.isArray(features) ? features : [features];

    let query: any = {};

    if (q) {
        let $and: any[] = [];

        if (features.length) {
            let featureQuery: any[] = [];

            for (const feature of features) {
                featureQuery.push({ [feature]: { $regex: q, $options: "i" } });
            }
            $and.push({
                $or: featureQuery,
            });
        }

        if (creators.length) {
            $and.push({
                creator: { $in: creators },
            });
        }
        query = {
            ...query,
            $and: $and,
        };
        console.log(query);
    }

    let sortOrder: any = { _id: -1 };

    // if (order == "createdAt:1"){
    //   sortOrder = { createdAt: 1 };
    // }else if (order == "lastUpdated:1"){
    //   sortOrder = { lastUpdated: 1 };
    // }else if (order == "lastUpdated:-1"){
    //   sortOrder = { lastUpdated: -1 };
    // }

    if (toId) {
        query = { ...query, _id: { $lt: new Types.ObjectId(toId as string) } };
    }
    if (fromId) {
        query = {
            ...query,
            _id: { $gt: new Types.ObjectId(fromId as string) },
        };
        sortOrder = { _id: 1 };
        // __debug('sortOrder:', sortOrder)
    }

    // __debug('query:', query)

    return await col
        .find(query)
        .sort(sortOrder)
        .limit(10)
        .toArray()
        .then((docs: any[]) => {
            if (fromId) {
                // reverse sort order
                docs = docs.reverse();
            }
            return res.json({
                result: docs.map(toApiRespDoc).map((rec) => {
                    rec.history = rec.history ? rec.history : [];
                    return rec;
                }),
            });
        })
        .catch((err: any) => {
            __error("err:", err);
            return res.status(404).json({ result: [] });
        });

    // return await DataRecordRow.find({}).sort({createdAt:-1}).then((docs: any[]) => {
    //   return res.json({ result: docs.map(toApiRespDoc) });
    // });
}

export default apiHandler(handler);
