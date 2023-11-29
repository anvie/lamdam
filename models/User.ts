import { __log } from "@/lib/logger";
import mongoose, { Schema } from "mongoose";
import { UserRoles } from ".";

const UserModel = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    image: { type: String, required: true },
    status: {
        type: String,
        enum: ["blocked", "active"],
        default: "active",
    },
    role: {
        type: String,
        enum: UserRoles,
        default: "contributor",
    },
    registeredAt: Number,
    lastActivity: Number,
    meta: {
        monthlyTarget: { type: Number, default: 0 },
    }
})

const User = mongoose.models.User || mongoose.model("User", UserModel)

const SessionModel = new Schema({
    userId: { type: String, required: true },
    expires: { type: Date, required: true },
    sessionToken: { type: String, required: true, index: { unique: true } },
    accessToken: { type: String, required: true, index: { unique: true } },
})

const Session = mongoose.models.Session || mongoose.model("Session", SessionModel)

const AccountModel = new Schema({
    userId: { type: String, required: true },
    providerId: { type: String, required: true },
    providerAccountId: { type: String, required: true },
    refreshToken: { type: String, required: true },
    accessToken: { type: String, required: true },
    accessTokenExpires: { type: Date },
})

const Account = mongoose.models.Account || mongoose.model("Account", AccountModel)

export { Account, Session, User };

User.prototype.updateLastActivity = async function () {
    __log('updateLastActivity', this._id)
    await User.updateOne({ _id: this._id }, { lastActivity: Date.now() })
}