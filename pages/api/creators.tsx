import { apiHandler } from "@/lib/ApiHandler"
import { Collection } from "@/models/Collection"
import type { NextApiRequest, NextApiResponse } from "next/types"


const db = require("../../lib/db");

async function handler(req: NextApiRequest, res: NextApiResponse<string[]>) {
	const {
		method,
	} = req;

	if (method !== "GET") {
		res.status(405).end();
		return;
	}

	const items = await Collection.find();
	const creators: string[] = [];

	for (const { creator } of items) {
		if (!creators.includes(creator)) creators.push(creator);
	}
	return res.json(creators);

	// return await DataRecordRow.find({}).sort({createdAt:-1}).then((docs: any[]) => {
	//   return res.json({ result: docs.map(toApiRespDoc) });
	// });
}

export default apiHandler(handler);
