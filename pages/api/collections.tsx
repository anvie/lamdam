import { apiHandler } from "@/lib/ApiHandler";
import { toApiRespDoc } from "@/lib/docutil";
import { Collection } from "@/models/Collection";
import type { NextApiRequest, NextApiResponse } from "next/types";

type Data = {
  error?: string;
  result?: Object[];
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { method } = req;
  if (method !== "GET") {
    res.status(405).end();
    return;
  }

  return await Collection.find({})
    .then((docs: any) => {
      return res.json({result: docs.map(toApiRespDoc)})
    });


  // return res.json({
  //   result: [
  //       {
  //           "id": "123",
  //           "name": "nahwu_shorof",
  //           "count": 320
  //       },
  //       {
  //           "id": "245",
  //           "name": "Wikipedia",
  //           "count": 320
  //       }
  //   ]
  // })
}

export default apiHandler(handler);
