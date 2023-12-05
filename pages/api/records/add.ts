import { apiHandler } from "@/lib/ApiHandler";
import { hashString } from "@/lib/crypto";
import { toApiRespDoc } from "@/lib/docutil";
import { __debug, __error } from "@/lib/logger";
import { AddRecordSchema } from "@/lib/schema";
import { getCurrentTimeMillis } from "@/lib/timeutil";
import { Collection } from "@/models/Collection";
import mongoose from "mongoose";
import { User } from "next-auth";
import type { NextApiRequest, NextApiResponse } from "next/types";

type Data = {
  error?: string;
  result?: Object[];
};

// Message formatter for hashing
function formattedMessage(
  prompt: string,
  input: string,
  response: string,
  history: string[][]
): string {
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

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  user?: User
) {
  const {
    prompt,
    response,
    input,
    history,
    collectionId,
    outputPositive,
    outputNegative,
  } = AddRecordSchema.parse(req.body);

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const colDoc = await Collection.findOne({ _id: collectionId });

    if (!colDoc) {
      return res.status(404).end();
    }

    const col = mongoose.connection.collection(colDoc.name);

    let formattedResponse = response;

    if (colDoc.meta.dataType === "rm") {
      formattedResponse =
        outputPositive + "\n\n----------\n\n" + outputNegative;
    }

    const hash = hashString(formattedMessage(prompt, input, response, history));
    __debug("hash:", hash);

    // get collection's indices
    const indices = await col.indexes();
    __debug("indices:", indices);

    // create index `hash` if not exists, and make it unique
    if (!indices.find((index: any) => index.name === "hash_1")) {
      await col.createIndex({ hash: 1 }, { unique: true });
    }

    return col
      .insertOne({
        prompt,
        response: formattedResponse,
        input,
        history,
        creator: user?.name,
        creatorId: user?.id,
        createdAt: getCurrentTimeMillis(),
        lastUpdated: getCurrentTimeMillis(),
        hash,
        status: 'pending',
        meta: {},
      })
      .then(async (resp: any) => {
        // __debug("resp:", resp);

        // increase collection count
        await Collection.updateOne(
          { _id: collectionId },
          { $inc: { count: 1 } }
        );

        const doc = await col.findOne({ _id: resp.insertedId });
        // __debug("doc:", doc);

        return res.json({
          result: toApiRespDoc(doc),
        });
      })
      .catch((err: any) => {
        __error("err:", err);
        if (err.code === 11000) {
          return res.status(400).json({
            error: "This record already exists",
          });
        }
        return res.status(500).json({
          error: err,
        });
      });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
}

export default apiHandler(handler, { withAuth: true });
