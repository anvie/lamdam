import { apiHandler } from "@/lib/ApiHandler";
import { EditUserSchema } from "@/lib/schema";
import { User } from "@/models/User";
import { NextApiRequest, NextApiResponse } from "next";
import { User as UserAuth } from "next-auth";

const methods: Record<string, any> = {
    post: async (req: NextApiRequest, res: NextApiResponse, currentUser: UserAuth) => {
        try {
            const { id } = req.query;
            const { role, status, meta: { monthlyTarget } } = await EditUserSchema.parseAsync(req.body);

            const user = await User.findById(id);
            if (!user) {
                res.status(404).json({ error: "User not found" });
                return;
            }

            role && (user.role = role);
            status && (user.status = status);
            monthlyTarget && (user.meta.monthlyTarget = Number(monthlyTarget));

            await user.save();

            res.status(200).json({ result: user });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },
    get: async (req: NextApiRequest, res: NextApiResponse, currentUser: UserAuth) => {
        const { id } = req.query;

        const user = await User.findById(id);

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.status(200).json({ result: user });
    },
    delete: async (req: NextApiRequest, res: NextApiResponse, currentUser: UserAuth) => {
        const { id } = req.query;

        if (currentUser.id === id) {
            res.status(400).json({ error: "You cannot delete yourself" });
            return;
        }

        const user = await User.findById(id);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        await user.delete();

        res.status(200).json({ result: "ok" });
    },
}

export default apiHandler(async (req, res, user) => {
    try {
        const method = req.method?.toLowerCase() || "get";

        const invokeMethod = methods[method];
        if (!invokeMethod) {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }

        await invokeMethod(req, res, user);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}, {
    withAuth: true,
    roles: ["superuser"],
})