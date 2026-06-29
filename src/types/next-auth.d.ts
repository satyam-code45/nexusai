import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      access_token?: string;
      refresh_token?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    access_token?: string;
    refresh_token?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    access_token?: string;
    refresh_token?: string;
  }
}
