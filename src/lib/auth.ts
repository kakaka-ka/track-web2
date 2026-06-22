import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user: { name?: string | null; role?: string };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username as string;
        const password = credentials?.password as string;
        if (!username || !password) return null;

        // 1. Try database accounts first
        try {
          const user = await prisma.adminUser.findUnique({ where: { username } });
          if (user) {
            const ok = await bcrypt.compare(password, user.passwordHash);
            if (ok) return { id: String(user.id), name: user.username, role: user.role };
            return null;
          }
        } catch (e) {
          console.error("[auth] DB lookup failed:", e);
          // DB unavailable — fall through to env var backup
        }

        // 2. Env var fallback (emergency backup)
        const envUser = process.env.ADMIN_USERNAME ?? "admin";
        const envPass = process.env.ADMIN_PASSWORD ?? "admin123";
        if (username === envUser && password === envPass) {
          return { id: "env", name: username, role: "super_admin" };
        }

        return null;
      },
    }),
  ],
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.role) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.role = token.role as string;
      return session;
    },
    authorized({ auth: session, request }) {
      const isApi = request.url.includes("/api/admin/");
      if (!session) {
        if (isApi) return Response.json({ error: "Unauthorized" }, { status: 401 });
        return false;
      }
      return true;
    },
  },
});
