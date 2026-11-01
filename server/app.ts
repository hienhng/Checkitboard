import "./env.js";
import express, { type ErrorRequestHandler, type Express } from "express";
import type { Server } from "node:http";
import { registerRoutes } from "./routes.js";

export async function createApp(configureClient?: (app: Express, server: Server) => void | Promise<void>) {
  const app = express();
  app.disable("x-powered-by");
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  // Leave room below Vercel's 4.5 MB request limit for JSON/base64 uploads.
  app.use(express.json({ limit: "4mb" }));
  app.use(express.urlencoded({ extended: false, limit: "4mb" }));

  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) {
        // Never log response bodies: auth responses and tokens are private.
        console.log(`${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`);
      }
    });
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const server = await registerRoutes(app);
  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "API route not found" });
  });

  await configureClient?.(app, server);

  const handleError: ErrorRequestHandler = (err, _req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500;
    const message = status === 413
      ? "Request too large. Profile pictures must be 2 MB or smaller."
      : status >= 500 && app.get("env") === "production"
        ? "Internal Server Error"
        : err.message || "Internal Server Error";
    res.status(status).json({ message });
  };
  app.use(handleError);

  return { app, server };
}
