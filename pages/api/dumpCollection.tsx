const db = require("../../lib/db");

import { apiHandler } from "@/lib/ApiHandler";
import { __debug, __error } from "@/lib/logger";
import { DumpCollectionSchema } from "@/lib/schema";
import { Collection } from "@/models/Collection";
import type { NextApiRequest, NextApiResponse } from "next/types";
import path from "path";

import mongoose from "mongoose";
import fs from "fs";

const DUMP_PATH = process.env.DUMP_PATH as string;

if (!DUMP_PATH) {
  throw new Error("DUMP_PATH not set");
}

type Data = {
  error?: string;
  result?: Object;
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { id: collectionId } = DumpCollectionSchema.parse(req.body);
  __debug('collectionId:', collectionId)

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

  // if dumpPath not exists throw error
  if (!fs.existsSync(DUMP_PATH)) {
    __error("dumpPath not exists:", dumpPath);
    return res.status(500).json({ error: "dumpPath not exists" });
  }


  const db = mongoose.connection.db;

  let counter = 0
  const cursor = db.collection(col.name).find();
  let fout = null;
  try {
    // open file and write to it row by row from docs
    fout = fs.createWriteStream(dumpPath);

    fout.write("[\n");
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc){
        continue;
      }
      fout.write(JSON.stringify({
        instruction: doc.prompt,
        input: doc.input || '',
        output: doc.response,
        history: doc.history || []
      }, null, 2));
      if (await cursor.hasNext()) {
        fout.write(",\n");
      }
      counter++;
    }
    fout.write("]\n");

    fout.close();

    return res.json({
      result: {
        status: "done",
        total: counter
      }
    });
  } catch (err: any) {
    __error("cannot write to file: " + err.message);
    return res.status(500).json({ error: err.message });
  }finally{
    if (fout !== null){
      fout.close();
    }
    __debug("dumped", counter, "rows");
  }
}

export default apiHandler(handler);
