import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyCredentials } from "@/modules/auth/auth.service";
import { loginSchema } from "@/modules/auth/auth.validators";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 يوم — كافٍ لـ MVP دون الحاجة لـ Refresh Tokens
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await verifyCredentials(parsed.data.email, parsed.data.password);
        if (!user) return null;

        return user; // { id, name, email, role }
      },
    }),
  ],
  callbacks: {
    // نُضمّن role داخل الـ JWT وقت تسجيل الدخول فقط (توفير استعلام DB في كل طلب)
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: "CUSTOMER" | "ADMIN" | "SUPER_ADMIN" }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};