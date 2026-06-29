import { connectDB } from "@/lib/mongodb/mongodb";
import { UserService } from "@/services/UserService";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: ["openid", "email", "profile"].join(" "),
        },
      },
      httpOptions: {
        timeout: 10000,
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }: Record<string, any>) {
      const userData = { ...user } as {
        id: string;
        name: string;
        email: string;
        image: string;
      };
      const access_token = account?.access_token;
      const refresh_token = account?.refresh_token;
      try {
        await connectDB();
        const userService = UserService.getInstance();
        await userService.createUser({ ...userData, access_token, refresh_token });
        return true;
      } catch (error) {
        console.error("Failed to create/update user during sign-in:", error);
        return false;
      }
    },
    async redirect({ url, baseUrl }: Record<string, any>) {
      if (url.startsWith("/")) return `${baseUrl}/workspace`;
      if (new URL(url).origin === baseUrl) return `${baseUrl}/workspace`;
      if (url.includes("/api/auth/signout") || url.includes("/auth/signin")) {
        return `${baseUrl}/login`;
      }
      return baseUrl;
    },
    async session({ session, token }: Record<string, any>) {
      // token.userId is set in the jwt callback on sign-in.
      // If it's missing (e.g., JWT was issued before the jwt callback set it),
      // try to recover it from the DB using the token's email.
      let userId = token?.userId;

      if (!userId && token?.email) {
        try {
          await connectDB();
          const userService = UserService.getInstance();
          const dbUser = await userService.findByEmail(token.email);
          if (dbUser) {
            userId = dbUser._id.toString();
            console.warn("[auth] session: recovered userId from email lookup — user should sign out and back in to fix token");
          }
        } catch {
          // ignore — if DB is down we can't recover
        }
      }

      if (!userId) return { ...session, user: undefined };

      session.user.id = userId;
      if (token?.access_token) session.user.access_token = token.access_token;
      if (token?.refresh_token) session.user.refresh_token = token.refresh_token;
      return session;
    },
    async jwt({ token, user, account }: Record<string, any>) {
      if (account) {
        if (account.access_token) token.access_token = account.access_token;
        if (account.refresh_token) token.refresh_token = account.refresh_token;
      }
      if (user) {
        try {
          await connectDB();
          const userService = UserService.getInstance();
          const dbUser = await userService.findByEmail(user.email);
          if (dbUser) {
            token.userId = dbUser._id.toString();
          } else {
            console.error("[auth] jwt: user not found in DB for email:", user.email);
          }
        } catch (error) {
          console.error("[auth] jwt: DB lookup failed:", (error as Error)?.message);
        }
      }
      return token;
    },
  },
};
