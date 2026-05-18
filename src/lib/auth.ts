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
       * SECURITY NOTE: allowDangerousEmailAccountLinking is enabled
       * 
       * This allows users to link their Google account to an existing account
       * with the same email address, even if they didn't originally sign up with Google.
       * 
       * Why it's safe here (for now):
       * - Google OAuth provider verifies email ownership before allowing sign-in,
       *   so an attacker cannot spoof a Google login for someone else's email.
       * 
       * Why it could become dangerous:
       * - If Credentials (username/password) authentication is added as a provider,
       *   an attacker could potentially:
       *   1. Guess/crack a user's password before they set up Google OAuth
       *   2. Link their Google account to that compromised credential account
       *   3. Lock the original user out if they can't recover their credentials
       * 
       * RECOMMENDATION:
       * - If adding Credentials provider, either:
       *   a) Disable this flag and require explicit account linking by the user, OR
       *   b) Implement additional security (email verification, MFA) before linking
       * - Consider implementing account recovery mechanisms
       * - Log all account linking events for security audits
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
        const emailVerified = (profile as any)?.email_verified
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
