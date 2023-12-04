import NuSidProvider from "@/lib/NuSid";
import clientPromise from "@/lib/clientPromise";
import { createConnection } from "@/lib/db";
import { User } from "@/models/User";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import moment from "moment";
import NextAuth, { type NextAuthOptions } from "next-auth";
import { OAuthConfig } from "next-auth/providers";
import GoogleProvider from "next-auth/providers/google";

createConnection()

let providers: OAuthConfig<any>[] = []

if (process.env.NUID_CLIENT_ID && process.env.NUID_CLIENT_SECRET) {
    providers.push(
        NuSidProvider({
            clientId: process.env.NUID_CLIENT_ID,
            clientSecret: process.env.NUID_CLIENT_SECRET,
        }),
    )
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })
    )
}

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
        maxAge: 60 * 60 * 24,
    },
    secret: process.env.NEXTAUTH_SECRET,
    adapter: MongoDBAdapter(clientPromise),
    callbacks: {
        async session({ session, user, token }) {
            if (session.user) {
                session.user.id = user?.id ?? token.sub
                session.user.role = user?.role ?? token.role
                session.user.status = user?.status ?? token.status
                session.user.meta = user?.meta ?? token.meta
            }

            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role
                token.status = user.status
                token.meta = user.meta
            }
            return token;
        },
        signIn: async ({ user: { email } }) => {
            const blockedUri = `/login?status=failed&reason=BLOCKED`;
            const user = await User.findOne({ email }).exec()

            if (user) {
                (!user.role) && (user.role = 'contributor')
                if (!user.registeredAt) {
                    user.registeredAt = user._id.getTimestamp().getTime()
                }

                await user.save()

                if (user.status === 'blocked') {
                    return blockedUri
                } else if (['annotator', 'corrector'].includes(user.role) && user.status === 'active') {
                    if (!user.lastActivity) return true

                    const days = moment(user.lastActivity).diff(moment(), 'days')
                    // if the dasy >= 3 then set user status to blocked
                    if (days >= 3) {
                        await User.updateOne({ _id: user.id }, { status: 'blocked' })
                        return blockedUri
                    }
                }
            }

            return true
        }
    },
    providers,
    pages: {
        signIn: "/login",
    },
}

export default NextAuth(authOptions)
