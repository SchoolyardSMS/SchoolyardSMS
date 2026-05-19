import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { db as prisma, db } from "./db"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 Days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      /**
       * SECURITY NOTE: allowDangerousEmailAccountLinking is disabled.
       * 
       * Since we are using CredentialsProvider alongside Google OAuth, this flag
       * must remain false. This prevents an attacker from hijacking a pre-registered
       * user credentials account by signing up with a spoofed/unverified OAuth profile
       * of the same email.
       */
      allowDangerousEmailAccountLinking: false,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@schoolyard.dev" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password")
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.hashedPassword) {
          throw new Error("Invalid academic credentials")
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.hashedPassword)

        if (!isPasswordValid) {
          throw new Error("Invalid academic credentials")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const emailVerified = (profile as { email_verified?: boolean })?.email_verified
        if (emailVerified === false) {
          return "/login?error=EmailNotVerified"
        }

        const existingUser = await db.user.findUnique({
          where: { email: user.email! }
        })

        if (!existingUser) {
          return "/login?error=AccessDenied"
        }

        if (existingUser.role) {
          user.role = existingUser.role
          return true
        }

        return "/login?error=AccountPendingVerification"
      }
      return true
    },
    async session({ token, session }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role as string
      }
      return token
    }
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
}
