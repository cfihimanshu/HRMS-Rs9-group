import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import sequelize from "./sequelize";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import Department from "@/models/sequelize/Department";
import Company from "@/models/sequelize/Company";
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
        await sequelize.authenticate();

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
          user = await User.findOne({ where: { mobile, status: "active" } });
          if (!user) {
            throw new Error("Active or probation user with this mobile number not found");
          }

          if (otp !== "123456") {
            throw new Error("Invalid OTP. For testing, please use 123456");
          }

        } else {
          if (!email || !password) {
            throw new Error("Email and password are required");
          }

          user = await User.findOne({ where: { email, status: "active" } });
          if (!user) {
            throw new Error("Active or probation user with this email not found");
          }

          let isValid = false;
          if (user.password && (user.password.startsWith("$2a$") || user.password.startsWith("$2b$"))) {
            isValid = await bcrypt.compare(password, user.password);
          } else {
            isValid = (password === user.password);
          }
          if (!isValid) {
            throw new Error("Invalid password");
          }
        }

        // Save login history in User collection
        let loginHistory = user.loginHistory ? (typeof user.loginHistory === 'string' ? JSON.parse(user.loginHistory) : user.loginHistory) : [];
        if (!Array.isArray(loginHistory)) loginHistory = [];
        loginHistory.push({
          ip: (req.headers as any)?.["x-forwarded-for"] || "127.0.0.1",
          userAgent: (req.headers as any)?.["user-agent"] || "Unknown",
          timestamp: new Date(),
        });
        user.loginHistory = JSON.stringify(loginHistory);
        await user.save();

        // Write to Audit Log
        await logAudit({
          userId: user.id?.toString() || user.id.toString(),
          action: "USER_LOGIN",
          entity: "User",
          entityId: user.id?.toString() || user.id.toString(),
          details: `User logged in successfully via ${loginType === "otp" ? "OTP" : "Password"}.`,
          ipAddress: (req.headers as any)?.["x-forwarded-for"] || "127.0.0.1",
        });

        // Fetch department and company
        let departmentName = "General";
        let designation = user.role;
        let employeeId = "EMP-UNKNOWN";
        let companyName = "Company";
        try {
          const profile = await EmployeeProfile.findOne({ where: { user: user.id || user.id.toString() } });
          let deptDoc = null;
          if (profile && profile.department) {
             deptDoc = await Department.findOne({ where: { id: profile.department } });
          }
          if (profile) {
            if (profile.designation) designation = profile.designation;
            if (profile.employeeId) employeeId = profile.employeeId;
            if (deptDoc && deptDoc.name) {
              departmentName = deptDoc.name;
            }
          }
          // Assuming user.companies contains an array of company IDs or names,
          // or we can just fetch the first company if it's an array.
          // Since we might not have a direct relation here, let's parse companies.
          let userCompanies = user.companies;
          if (typeof userCompanies === "string") {
            try { userCompanies = JSON.parse(userCompanies); } catch(e) {}
          }
          if (Array.isArray(userCompanies) && userCompanies.length > 0) {
             // For simplicity, we just take the first one or assume it's the company string
             // Try to fetch Company doc
             const compDoc = await Company.findOne({ where: { id: userCompanies[0] } });
             if (compDoc) {
               companyName = compDoc.name;
             } else {
               companyName = String(userCompanies[0]);
             }
          }

        } catch (err) {
          console.error("Error fetching employee profile:", err);
        }

        return {
          id: user.id?.toString() || user.id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          department: departmentName,
          designation: designation,
          employeeId: employeeId,
          company: companyName,
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
        token.employeeId = (user as any).employeeId;
        token.company = (user as any).company;
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
          employeeId: token.employeeId as string,
          company: token.company as string,
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
