import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

import { isAllowedEmail } from "@/lib/auth/allowlist";
import { upsertAuthenticatedUser } from "@/lib/auth/user";

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      authorization: {
        params: { scope: "read:user user:email" },
      },
    }),
  ],
  pages: {
    error: "/unauthorized",
    signIn: "/sign-in",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      return isAllowedEmail(user.email);
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const persistedUser = await upsertAuthenticatedUser({
          email: user.email,
          image: user.image,
          name: user.name,
        });

        token.userId = persistedUser.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }

      return session;
    },
    authorized({ auth: session, request }) {
      const pathname = request.nextUrl.pathname;

      if (
        pathname === "/sign-in" ||
        pathname === "/unauthorized" ||
        pathname.startsWith("/api/")
      ) {
        return true;
      }

      return Boolean(
        session?.user?.id &&
          session.user.email &&
          isAllowedEmail(session.user.email),
      );
    },
  },
});
