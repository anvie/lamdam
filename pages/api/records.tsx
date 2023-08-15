import { apiHandler } from "@/lib/ApiHandler";
import { toApiRespDoc } from "@/lib/docutil";
import { DataRecordRow } from "@/models/DataRecordRow";
import { DataRecord } from "@/types";
import type { NextApiRequest, NextApiResponse } from "next/types";

type Data = {
  error?: string;
  result?: DataRecord[];
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const {
    body: {
      name,
      description,
      days,
      availableForGrades,
      showTime,
      beginTs,
      endTs,
    },
    method,
  } = req;

  if (method !== "GET") {
    res.status(405).end();
    return;
  }

  return await DataRecordRow.find({}).sort({createdAt:-1}).then((docs: any[]) => {
    return res.json({ result: docs.map(toApiRespDoc) });
  });

  // return res.json({
  //   result: [
  //       {
  //           id: "123",
  //           prompt: "Hello",
  //           response: "Hello, how are you?",
  //           history: [],
  //           createdAt: 0,
  //           lastUpdated: 0,
  //           updateHistory: []
  //       },
  //       {
  //           id: "456",
  //           prompt: "Bagaimana kabar?",
  //           response: "Aku baik-baik saja",
  //           history: [],
  //           createdAt: 0,
  //           lastUpdated: 0,
  //           updateHistory: []
  //       }
  //   ]
  // })
}

export default apiHandler(handler);
