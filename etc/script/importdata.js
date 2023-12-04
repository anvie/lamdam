import { __debug } from "@/lib/logger";
import mongoose from "mongoose";
import { getCurrentTimeMillis } from "@lib/timeutil";

const yargs = require("yargs");

async function processJson(input, collectionName) {
  const fs = require("fs");
  let data = JSON.parse(fs.readFileSync(input, "utf8"));

  const db = require("@lib/db");
  const colRecords = mongoose.connection.collection(collectionName);

  data = data.map((d) => {
    return {
      prompt: d.prompt,
      response: d.response,
      instruction: "",
      history: [],
      creator: "robin",
      createdAt: getCurrentTimeMillis(),
      lastUpdated: getCurrentTimeMillis(),
      meta: {},
    };
  });

  const rv = await colRecords.insertMany(data);

  console.log("Inserted:", rv.insertedCount);

  if (rv.insertedCount > 0) {
    // update collection's count
    const colCol = mongoose.connection.collection("collections");
    colCol.updateOne(
      { name: collectionName },
      { $set: { count: await colRecords.countDocuments({}) } }
    );
  }
}

function main() {
  const argv = yargs
    .option("input", {
      alias: "i",
      describe: "Input file",
      type: "string",
      demandOption: true,
    })
    .option("format", {
      alias: "f",
      describe: "Data format, eg: json, jsonl, csv, etc",
      type: "string",
      demandOption: true,
    })
    .option("collection", {
      alias: "c",
      describe: "Destination collection",
      type: "string",
      demandOption: true,
    })
    .help()
    .alias("help", "h").argv;

  console.log("Input:", argv.input);
  console.log("Format:", argv.format);
  console.log("Collection:", argv.collection);

  if (argv.format === "json") {
    void processJson(argv.input, argv.collection);
  }

  __debug("Start import data");
}

main();
