import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

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

        try {
          const { prisma } = await import("@/lib/prisma");
          const bcrypt = await import("bcryptjs");
          const user = await prisma.adminUser.findUnique({ where: { username } });
          if (user) {
            const ok = await bcrypt.compare(password, user.passwordHash);
            if (ok) return { id: String(user.id), name: user.username, role: user.role };
            return null;
          }
        } catch (e) {
          console.error("[auth] DB lookup failed:", e);
        }

        // Env var fallback
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
  },
});
