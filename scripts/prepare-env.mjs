import fs from "node:fs";

// Ensures an environment configuration is available during Vercel and CI builds
if (!fs.existsSync(".env") && fs.existsSync(".env.example")) {
  console.log("[BUILD_SETUP] Creating .env from .env.example for build environment...");
  fs.copyFileSync(".env.example", ".env");
}
