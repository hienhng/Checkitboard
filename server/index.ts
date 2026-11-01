import "./env";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
// Increase body size limits for profile picture uploads (up to 10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Check AI service status on startup
  try {
    const { isAIConfigured, getPrimaryAIProvider } = await import("./ai");
    const { isGeminiConfigured } = await import("./gemini");
    
    console.log("AI Service Status:");
    console.log("- AI Configured:", isAIConfigured());
    console.log("- Primary Provider:", getPrimaryAIProvider());
    console.log("- Gemini Configured:", isGeminiConfigured());
    
    if (isGeminiConfigured()) {
      console.log("Gemini API integration is ready!");
    } else {
      console.log("Gemini API key not found. AI features will use fallback providers.");
    }
  } catch (error) {
    console.error("Error checking AI service status:", error);
  }

  const server = await registerRoutes(app);

  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "API route not found" });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    if (res.headersSent) {
      return next(err);
    }
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
  });

  // Serve the API and client together. Windows does not support reusePort.
  const port = Number(process.env.PORT || 5000);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
