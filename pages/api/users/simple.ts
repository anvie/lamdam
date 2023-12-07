import { apiHandler } from "@/lib/ApiHandler";
import { toApiRespDoc } from "@/lib/docutil";
import { User } from "@/models/User";

export default apiHandler(async (req, res) => {
    try {
        const { page, perPage, keyword, role } = req.query;

        if (req.method !== "GET") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }

        const limit = Number(perPage || 10);
        const skip = (Number(page || 1) - 1) * limit;

        let filter = {}
        if (keyword) {
            filter = {
                $or: [
                    { name: { $regex: keyword, $options: "i" } },
                    { email: { $regex: keyword, $options: "i" } },
                ],
            }
        }

        if (role) {
            const roles = Array.isArray(role) ? role : [role];
            filter = {
                ...filter,
                role: { $in: roles },
            }
        }

        const users = await User.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ name: 1 })

        const hasNext = await User.find(filter)
            .skip(skip + limit)
            .limit(1)
            .then((result) => result.length > 0);

        const entries = users
            .map((user) => ({
                _id: user._id,
                name: user.name,
                image: user.image,
            }))
            .map(toApiRespDoc);

        return res.json({ result: { entries, paging: { hasNext } } })
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}, { withAuth: true })