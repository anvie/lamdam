import { UserRoleType } from "@/models";
import { type DefaultSession } from "next-auth";

interface IUser extends DefaultUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  status?: "blocked" | "active";
  role?: UserRoleType;
  registeredAt?: number;
  lastActivity?: number;
  meta?: {
    monthlyTarget?: number;
  };
}

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user?: IUser & DefaultSession["user"];
  }

  interface User extends IUser { }

  interface Session {
    user?: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends IUser { }
}