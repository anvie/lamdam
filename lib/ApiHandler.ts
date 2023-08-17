import type { NextApiRequest, NextApiResponse } from "next";
// const expressJwt = require("express-jwt");
// const util = require("util");
import getConfig from "next/config";

// const { serverRuntimeConfig } = getConfig();

// if(!serverRuntimeConfig.jwtSecret) {
//     throw new Error("jwtSecret is not defined in next.config.js");
// }

export { apiHandler };

// export { jwtMiddleware };

// function jwtMiddleware(
//   req: NextApiRequest,
//   res: NextApiResponse
// ): NextApiResponse<any> | Promise<void> {
//   const middleware = expressJwt({
//     secret: serverRuntimeConfig.jwtSecret,
//     algorithms: ["HS256"],
//     requestProperty: "user",
//   }).unless({
//     path: [
//       // public routes that don't require authentication
//       "/api/authChallengeCode",
//       "/api/authAuthenticateUser"
//     ],
//   });

//   return util.promisify(middleware)(req, res);
// }

function errorHandler(err: any, res: NextApiResponse) {
  if (typeof err === "string") {
    // custom application error
    return res.status(400).json({ message: err });
  }

  if (err.name === "UnauthorizedError") {
    // jwt authentication error
    return res.status(401).json({ message: "Invalid Token" });
  }

  // default to 500 server error
  return res.status(500).json({ message: err.message });
}

function apiHandler<T>(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => NextApiResponse | Promise<T>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // global middleware, aktifkan ini kalau mau pakai jwt based authentication
      // await jwtMiddleware(req, res);

      // route handler
      await handler(req, res);
    } catch (err) {
      // global error handler
      errorHandler(err, res);
    }
  };
}

