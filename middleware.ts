import { withAuth } from "next-auth/middleware";

// middleware is applied to all routes, use conditionals to select

export default withAuth(
    function middleware(req) {
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