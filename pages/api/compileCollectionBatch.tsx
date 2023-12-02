const db = require("../../lib/db");

import { apiHandler } from "@/lib/ApiHandler";
import { __debug, __error } from "@/lib/logger";
import { CompileCollectionBatchSchema } from "@/lib/schema";
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

type NotifyType = {
  processing: (col: any) => void;
  done: (col: any) => void;
  failed: (col: any) => void;
  completed: (col: any) => void;
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { ids: collectionIds, batchId } = CompileCollectionBatchSchema.parse(
    req.body
  );
  __debug("collectionIds:", collectionIds);

  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const cols = await Collection.find({ _id: { $in: collectionIds } });

  if (!cols || cols.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // let responseStream = new TransformStream();
  // const streamWriter: WritableStreamDefaultWriter<Uint8Array> =
  //   responseStream.writable.getWriter();
  // const encoder = new TextEncoder();
  let _closed = false;

  let counter = 0;
  let processedAll: string[] = [];
  let failed: string[] = [];

  function notify(state: string, col: any) {
    // streamWriter.write(
    //   encoder.encode(`data: ${JSON.stringify({ state, col: col.id })}\n\n`)
    // );
    const output = `data: ${JSON.stringify({ state, col: col.id })}\n\n`;
    // __debug("output:", output);
    res.write(output);
  }

  const Notify: NotifyType = {
    processing: (col: any) => {
      __debug("processing:", col.name);
      notify("processing", col);
    },
    done: (col: any) => {
      notify("done", col);
      // if (!_closed) {
      //   // streamWriter.close();
      //   _closed = true;
      //   res.end();
      // }
    },
    failed: (col: any) => {
      notify("failed", col);
      // if (!_closed) {
      //   //   streamWriter.close();
      //   _closed = true;
      //   res.end();
      // }
    },
    completed: (col: any) => {
      notify("completed", col);
    },
  };

  return new Promise(async (resolve, reject) => {
    for (var i = 0; i < cols.length; i++) {
      const col = cols[i];
      Notify.processing(col);
      try {
        counter += await compileCollection(col, Notify);
        processedAll.push(col.name);
      } catch (err) {
        __error("Cannot compile collection:", col.name, err);
        failed.push(col.name);
      }
    }
    Notify.completed("success");
    res.end();
    resolve(true);
  });

  // Return response connected to readable
  // return new Response(responseStream.readable, {
  //   headers: {
  //     "Access-Control-Allow-Origin": "*",
  //     "Content-Type": "text/event-stream; charset=utf-8",
  //     Connection: "keep-alive",
  //     "Cache-Control": "no-cache, no-transform",
  //     "X-Accel-Buffering": "no",
  //     "Content-Encoding": "none",
  //   },
  // });
  // return res.end();
  // return res;
}

// export const config = {
//   runtime: "edge",
// };

async function compileCollection(
  col: any,
  notify: NotifyType
): Promise<number> {
  const dataType = col.meta.dataType || "sft";

  let fileName = `${col.name}.json`;

  if (dataType === "rm") {
    fileName = `comparison_${col.name}.json`;
  }

  const outPath = path.join(DUMP_PATH, fileName);
  __debug("outPath:", outPath);

  // if outPath not exists throw error
  if (!fs.existsSync(DUMP_PATH)) {
    __error("outPath not exists:", outPath);
    notify.failed(col);
    throw new Error("outPath not exists");
  }

  const db = mongoose.connection.db;

  let counter = 0;
  const cursor = db.collection(col.name).find().sort({ _id: -1 });
  let fout = null;
  try {
    const hash = crypto.createHash("sha1");

    // open file and write to it row by row from docs
    fout = fs.createWriteStream(outPath);

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

    notify.done(col);
    return counter;
  } catch (err: any) {
    __error("cannot write to file: " + err.message);
    notify.failed(col);
    throw err;
  } finally {
    if (fout !== null) {
      fout.close();
    }
    __debug("compiled", counter, "rows");
  }
}

export default apiHandler(handler);
