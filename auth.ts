import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";
import { AppRole } from "@/lib/roles";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        if (!user.emailVerified) {
          return null;
        }

        const isValidPassword = await compare(password, user.passwordHash);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    authorized: async ({ auth, request }) => {
      const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");

      if (isDashboardRoute) {
        return !!auth?.user;
      }

      return true;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role as AppRole;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = (token.role as AppRole | undefined) ?? "AUTHOR";
      }

      return session;
    },
    redirect: async ({ url, baseUrl }) => {
      if (url.startsWith("/")) {
        return url;
      }

      try {
        const parsedUrl = new URL(url);
        const parsedBaseUrl = new URL(baseUrl);

        if (parsedUrl.origin === parsedBaseUrl.origin) {
          return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
        }
      } catch {
        return "/dashboard";
      }

      return "/dashboard";
    },
  },
});
