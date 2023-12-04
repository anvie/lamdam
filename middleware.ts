import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// middleware is applied to all routes, use conditionals to select

const protectedRoutes = [
    "/users",
    '/annotator-reports'
]

export default withAuth(
    async function middleware(req) {
        const path = req.nextUrl.pathname
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

        if (path.startsWith('/login') && token !== null) {
            return NextResponse.redirect(new URL('/', process.env.NEXTAUTH_URL))
        }

        if (protectedRoutes.includes(path) && token?.role !== 'superuser') {
            return NextResponse.redirect(new URL('/?redirect=1', process.env.NEXTAUTH_URL))
        }
    },
    {
        callbacks: {
            authorized: ({ req, token }) => {
                if (!(process.env.NUID_CLIENT_ID && process.env.NUID_CLIENT_SECRET)) {
                    return true;
                }

                const path = req.nextUrl.pathname
                if (!path.startsWith('/login') && token === null) {
                    return false
                }

                return true
            }
        }
    }
)