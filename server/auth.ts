import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { pool } from "../db";
import { User } from "@shared/schema";

declare global {
  namespace Express {
    // Define the interface without extending User
    interface User {
      id: number;
      email: string;
      name: string;
      role: string;
      profilePicture?: string | null;
      emailVerified?: boolean;
      createdAt?: Date;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    console.warn("No SESSION_SECRET env variable set. Using a default secret for development.");
  }

  const PgSession = connectPgSimple(session);

  const sessionSettings: session.SessionOptions = {
    store: new PgSession({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "default_secret_for_development_only",
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid',
    cookie: {
      secure: false, // Allow in development without HTTPS
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? 'strict' : false, // Disable sameSite in dev
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Incorrect email or password" });
          }
          if (!(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Incorrect email or password" });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, name, role } = req.body;
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Create new user with hashed password and email verification
      const hashedPassword = await hashPassword(password);
      const { generateVerificationToken, sendVerificationEmail } = await import("./email-verification");
      
      const verificationToken = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        role,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: expiresAt,
      });

      // Send verification email
      try {
        console.log(`Attempting to send verification email to ${user.email}`);
        await sendVerificationEmail({
          email: user.email,
          name: user.name,
          verificationToken,
        });
        console.log(`Verification email sent successfully to ${user.email}`);
      } catch (emailError) {
        console.error("Error sending verification email:", emailError);
        console.error("Email error details:", emailError instanceof Error ? emailError.message : String(emailError));
        // Continue with registration even if email fails
      }

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json(user);
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: error.message || "Error during registration" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: User, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Authentication failed" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      profilePicture: req.user.profilePicture,
      emailVerified: req.user.emailVerified,
    });
  });

  // Add a route to link a parent's email to a student
  app.post("/api/link-parent", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { parentEmail, studentId } = req.body;

    try {
      // Check if the user making this request is an educator or the student themselves
      if (req.user.role !== "educator" && req.user.id !== studentId) {
        return res.status(403).json({ message: "Unauthorized to link parent to this student" });
      }

      const result = await storage.linkParentToStudent({
        parentEmail,
        studentId,
      });

      res.status(201).json(result);
    } catch (error: any) {
      console.error("Error linking parent:", error);
      res.status(500).json({ message: error.message || "Error linking parent to student" });
    }
  });
}
