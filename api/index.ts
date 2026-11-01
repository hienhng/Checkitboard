import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../server/app.js";

// Share initialization across concurrent requests and warm invocations.
let application: ReturnType<typeof createApp> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    application ??= createApp().catch(error => {
      application = undefined;
      throw error;
    });
    const { app } = await application;
    app(req, res);
  } catch (error) {
    console.error("API initialization failed:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: "Unable to initialize the API" }));
    }
  }
}
