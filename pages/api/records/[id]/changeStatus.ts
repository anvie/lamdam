import { siteConfig } from "@/config/site";
import { apiHandler } from "@/lib/ApiHandler";
import { RecordStatusSchema } from "@/lib/schema";
import { Collection } from "@/models/Collection";
import { getRecordModel } from "@/models/DataRecordRow";
import { User } from "@/models/User";
import { NextApiRequest, NextApiResponse } from "next";
import { User as UserAuth } from "next-auth";

export default apiHandler(async (req: NextApiRequest, res: NextApiResponse, user?: UserAuth) => {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        } else if (!siteConfig.approvalMode) {
            return res.status(400).json({ error: "Approval mode is disabled" });
        }

        const { id } = req.query;
        const { status, collectionId, rejectReason } = await RecordStatusSchema.parseAsync(req.body);
        if (status === 'rejected' && !rejectReason) throw new Error('Reject reason is required')

        const col = await Collection.findById(collectionId);
        if (!col) {
            return res.status(404).json({ error: "Collection not found" });
        }

        let meta: any = {
            lastModifiedBy: user?.id,
        }

        if (status === "approved") {
            meta = {
                ...meta,
                approvedBy: user?.id,
                approvedAt: Date.now(),
                rejectReason: null,
            }
        } else if (status === "rejected") {
            meta = {
                ...meta,
                rejectedBy: user?.id,
                rejectedAt: Date.now(),
                rejectReason,
            }
        }

        const dbUser = await User.findById(user?.id).exec();

        const record = await getRecordModel(col.name).findByIdAndUpdate(id, {
            status,
            meta,
            lastUpdated: Date.now(),
        });

        if (!record) {
            res.status(404).json({ error: "Record not found" });
            return;
        }

        await dbUser.updateLastActivity()

        res.status(200).json({ result: record });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}, {
    withAuth: true,
    roles: ["superuser", "corrector"]
})