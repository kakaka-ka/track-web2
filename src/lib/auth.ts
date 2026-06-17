import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const username = process.env.ADMIN_USERNAME ?? "admin";
        const password = process.env.ADMIN_PASSWORD ?? "admin123";
        if (
          credentials?.username === username &&
          credentials?.password === password
        ) {
          return { id: "1", name: "Admin" };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth: session, request }) {
      const isApi = request.url.includes("/api/admin/");
      if (!session) {
        if (isApi) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        return false; // redirect to /admin/login
      }
      return true;
    },
  },
});
