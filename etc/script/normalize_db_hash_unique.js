import { hashString } from "@/lib/crypto";
import mongoose from "mongoose";

const yargs = require("yargs");

// Message formatter for hashing
function formattedMessage(prompt, input, response, history) {
  const formattedHistory = history
    ? history.map(function (historyItem) {
        if (historyItem.length === 0) {
          return "\n";
        }
        return JSON.stringify(historyItem);
      })
    : [];
  return `
${formattedHistory.join("\n")}
${prompt}
${input}
${response}`.trim();
}

async function normalizeRecords(colRecords) {
  const cursor = colRecords.find({});

  var count = 0;

  await cursor.forEach(async function (record) {
    const id = record._id;

    const prompt = record.prompt;
    const input = record.input;
    const response = record.response;
    const history = record.history || [];

    const hash = hashString(formattedMessage(prompt, input, response, history));

    if (hash) {
      const rv = await colRecords.updateOne({ _id: id }, { $set: { hash } });

      // console.log("Updated:", rv.modifiedCount);
      count += rv.modifiedCount;
    }
  });

  console.log("Updated:", count);
}

async function ensureIndex(colRecords) {
  // ensure index
  await colRecords.createIndex({ hash: 1 }, { unique: true });
}

async function normalizeAllRecords() {
  const db = require("@lib/db");

  // get all registered collections names
  const colCol = mongoose.connection.collection("collections");

  const collectionNames = (await (await colCol.find({})).toArray()).map(
    (c) => c.name
  );

  for (var i = 0; i < collectionNames.length; i++) {
    const collectionName = collectionNames[i];
    console.log(`Normalizing "${collectionName}"...`);
    const colRecords = mongoose.connection.collection(collectionName);
    await normalizeRecords(colRecords);
  }

  // create index
  for (var i = 0; i < collectionNames.length; i++) {
    const collectionName = collectionNames[i];
    const colRecords = mongoose.connection.collection(collectionName);
    while (true) {
      try {
        await ensureIndex(colRecords);
        break;
      } catch (e) {
        // if got E11000 error then remove duplicate records and try again
        console.log(e);
        if (e.code === 11000) {
          // index: hash_1 dup key: { : "34f903de969eeb5873d6538826f7dc884a655dc0" }
          const matches = e.message.match(/"([^"]+)"/);
          let _hash = "";

          if (matches && matches.length > 1) {
            _hash = matches[1];
          }

          console.log("Removing duplicate record with hash:", _hash);
          const deleted = await colRecords.deleteOne({ hash: _hash });
          console.log("Deleted:", deleted.deletedCount);

          console.log("trying again...");
        }
      }
    }
  }
}

function main() {
  console.log("Normalizing hash unique field for all records...");
  void normalizeAllRecords()
    .then(() => {
      console.log("Done");
      process.exit(0);
    })
    .catch((e) => {
      console.log(e);
      process.exit(1);
    });
}

main();
