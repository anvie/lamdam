const db = require("../../lib/db");

import { apiHandler } from "@/lib/ApiHandler";
import { __debug, __error } from "@/lib/logger";
import { DumpCollectionSchema } from "@/lib/schema";
import { Collection } from "@/models/Collection";
import type { NextApiRequest, NextApiResponse } from "next/types";
import path from "path";

import * as crypto from "crypto";
import fs from "fs";
import mongoose from "mongoose";

const DUMP_PATH = process.env.DUMP_PATH as string;

if (!DUMP_PATH) {
  throw new Error("DUMP_PATH not set");
}

type Data = {
  error?: string;
  result?: Object;
};

// @TODO(Robin): rename this endpoint file name to `compileCollection`.
async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { id: collectionId } = DumpCollectionSchema.parse(req.body);
  __debug("collectionId:", collectionId);

  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const col = await Collection.findOne({ _id: collectionId });

  if (!col) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const dataType = col.meta.dataType || "sft";

  let fileName = `${col.name}.json`;

  if (dataType === "rm") {
    fileName = `comparison_${col.name}.json`;
  }

  const dumpPath = path.join(DUMP_PATH, fileName);
  __debug("dumpPath:", dumpPath);

  // if dumpPath not exists throw error
  if (!fs.existsSync(DUMP_PATH)) {
    __error("dumpPath not exists:", dumpPath);
    return res.status(500).json({ error: "dumpPath not exists" });
  }

  const db = mongoose.connection.db;

  let counter = 0;
  const cursor = db.collection(col.name).find().sort({ _id: -1 });
  let fout = null;
  try {
    const hash = crypto.createHash("sha1");

    // open file and write to it row by row from docs
    fout = fs.createWriteStream(dumpPath);

    fout.write("[\n");
    hash.update("[\n");
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) {
        continue;
      }

      let dataLine: string = "";

      if (dataType === "rm") {
        dataLine = JSON.stringify(
          {
            instruction: doc.prompt,
            input: doc.input || "",
            output: doc.response.split("\n\n----------\n\n"),
          },
          null,
          2
        );
      } else {
        // default sft
        dataLine = JSON.stringify(
          {
            instruction: doc.prompt,
            input: doc.input || "",
            response: doc.response,
            history: doc.history || [],
          },
          null,
          2
        );
      }

      fout.write(dataLine);
      hash.update(dataLine);

      if (await cursor.hasNext()) {
        fout.write(",\n");
        hash.update(",\n");
      }
      counter++;
    }
    fout.write("]\n");
    hash.update("]\n");

    fout.close();

    // write daaset info if any

    const infoPath = path.join(DUMP_PATH, `dataset_info.json`);
    if (fs.existsSync(infoPath)) {
      const digest = hash.digest("hex");
      __debug(`Dump completed, hash: ${digest}`);

      // read info path as json
      const info = fs.readFileSync(infoPath, "utf-8");
      const infoJson = JSON.parse(info);

      if (dataType === "rm") {
        infoJson[col.name] = {
          file_name: fileName,
          file_sha1: digest,
        };
      } else {
        // for default (sft)
        infoJson[col.name] = {
          file_name: fileName,
          file_sha1: digest,
          columns: {
            prompt: "instruction",
            response: "response",
            history: "history",
            query: "input",
          },
          stage: dataType,
        };
      }

      fs.writeFileSync(infoPath, JSON.stringify(infoJson, null, 2));
    }

    return res.json({
      result: {
        status: "done",
        total: counter,
      },
    });
  } catch (err: any) {
    __error("cannot write to file: " + err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    if (fout !== null) {
      fout.close();
    }
    __debug("dumped", counter, "rows");
  }
}

export default apiHandler(handler);
