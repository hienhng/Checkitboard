import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

// Shell variables take precedence over the project's local configuration.
if (existsSync(".env")) {
  loadEnvFile(".env");
}
