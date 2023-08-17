import { apiHandler } from "@/lib/ApiHandler";
import { toApiRespDoc } from "@/lib/docutil";
import { __debug, __error } from "@/lib/logger";
import { AddCollectionSchema, DumpCollectionSchema } from "@/lib/schema";
import { getCurrentTimeMillis } from "@/lib/timeutil";
import { Collection } from "@/models/Collection";
import type { NextApiRequest, NextApiResponse } from "next/types";
import path from "path";
import mongoose from "mongoose";
const db = require("../../lib/db");
import fs from "fs";

const DUMP_PATH = process.env.DUMP_PATH as string;

if (!DUMP_PATH) {
  throw new Error("DUMP_PATH not set");
}

type Data = {
  error?: string;
  result?: Object[];
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { id: collectionId } = DumpCollectionSchema.parse(req.body);

  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const col = await Collection.findOne({ _id: collectionId });

  if (!col) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const dumpPath = path.join(DUMP_PATH, `${col.name}.json`);
  __debug("dumpPath:", dumpPath);

  const db = mongoose.connection.db;

  const docs = await db.collection(col.name).find({}).toArray();
  try {
    // open file and write to it row by row from docs
    const fout = fs.createWriteStream(dumpPath);
    fout.write("[\n");
    for (const doc of docs) {
      const line = JSON.stringify(doc, null, 2) + "\n";
      fout.write(line);
    }
    fout.write("]\n");

    fout.close();
  } catch (err: any) {
    __error("cannot write to file: " + err.message);
    res.status(500).json({ error: err.message });
    return;
  }
}

export default apiHandler(handler);
