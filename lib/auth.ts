import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "./db";
import User from "@/models/User";
import EmployeeProfile from "@/models/EmployeeProfile";
import Department from "@/models/Department";
import bcrypt from "bcryptjs";
import { logAudit } from "./audit";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        mobile: { label: "Mobile", type: "text" },
        otp: { label: "OTP", type: "text" },
        loginType: { label: "Login Type", type: "text" }, // "password" or "otp"
      },
      async authorize(credentials, req) {
        await dbConnect();

        if (!credentials) {
          throw new Error("Missing credentials");
        }

        const { loginType, email, password, mobile, otp } = credentials;

        let user;

        if (loginType === "otp") {
          if (!mobile || !otp) {
            throw new Error("Mobile number and OTP are required");
          }

          // In standard flow, match OTP. We simulate a valid OTP check for "123456" for demo convenience,
          // or verify if the mobile matches a registered user.
          user = await User.findOne({ mobile, status: "active" });
          if (!user) {
            throw new Error("Active user with this mobile number not found");
          }

          if (otp !== "123456") {
            throw new Error("Invalid OTP. For testing, please use 123456");
          }

        } else {
          if (!email || !password) {
            throw new Error("Email and password are required");
          }

          user = await User.findOne({ email, status: "active" });
          if (!user) {
            throw new Error("Active user with this email not found");
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            throw new Error("Invalid password");
          }
        }

        // Save login history in User collection
        user.loginHistory.push({
          ip: (req.headers as any)?.["x-forwarded-for"] || "127.0.0.1",
          userAgent: (req.headers as any)?.["user-agent"] || "Unknown",
          timestamp: new Date(),
        });
        await user.save();

        // Write to Audit Log
        await logAudit({
          userId: user._id.toString(),
          action: "USER_LOGIN",
          entity: "User",
          entityId: user._id.toString(),
          details: `User logged in successfully via ${loginType === "otp" ? "OTP" : "Password"}.`,
          ipAddress: (req.headers as any)?.["x-forwarded-for"] || "127.0.0.1",
        });

        // Fetch department
        let departmentName = "General";
        let designation = user.role;
        try {
          // ensure Department is loaded so populate works
          await Department.init(); 
          const profile = await EmployeeProfile.findOne({ user: user._id }).populate("department");
          if (profile) {
            if (profile.designation) designation = profile.designation;
            if (profile.department && profile.department.name) {
              departmentName = profile.department.name;
            }
          }
        } catch (err) {
          console.error("Error fetching employee profile:", err);
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          department: departmentName,
          designation: designation,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.department = (user as any).department;
        token.designation = (user as any).designation;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          department: token.department as string,
          designation: token.designation as string,
        } as any;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET || "acolyte-hr-secret-key-1234567890",
};
