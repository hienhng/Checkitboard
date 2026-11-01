import { createApp } from "./app.js";

async function main() {
  // Only the standalone server needs Vite and filesystem serving.
  const { setupVite, serveStatic, log } = await import("./vite.js");
  const { server } = await createApp(async (app, server) => {
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
  });

  // Serve the API and client together. Windows does not support reusePort.
  const port = Number(process.env.PORT || 5000);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
}

main().catch(error => {
  console.error("Failed to start the server:", error);
  process.exitCode = 1;
});
