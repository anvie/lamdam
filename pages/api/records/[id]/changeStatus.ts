import { apiHandler } from "@/lib/ApiHandler";
import { RecordStatusSchema } from "@/lib/schema";
import { Collection } from "@/models/Collection";
import { getRecordModel } from "@/models/DataRecordRow";
import { NextApiRequest, NextApiResponse } from "next";
import { User } from "next-auth";

export default apiHandler(async (req: NextApiRequest, res: NextApiResponse, user?: User) => {
    try {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }

        const { id } = req.query;
        const { status, collectionId } = await RecordStatusSchema.parseAsync(req.body);

        const col = await Collection.findById(collectionId);
        if (!col) {
            res.status(404).json({ error: "Collection not found" });
            return;
        }

        let meta: any = {
            lastModifiedBy: user?.id,
        }

        if (status === "approved") {
            meta = {
                ...meta,
                approvedBy: user?.id,
                approvedAt: Date.now(),
            }
        } else if (status === "rejected") {
            meta = {
                ...meta,
                rejectedBy: user?.id,
                rejectedAt: Date.now(),
            }
        }

        const record = await getRecordModel(col.name).findByIdAndUpdate(id, {
            status,
            meta,
        });

        if (!record) {
            res.status(404).json({ error: "Record not found" });
            return;
        }

        res.status(200).json({ result: record });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}, {
    withAuth: true,
    roles: ["superuser", "corrector"]
})