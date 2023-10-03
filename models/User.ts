import mongoose, { Schema } from "mongoose";

const UserModel = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    image: { type: String, required: true },
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

