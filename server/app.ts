import "dotenv/config";
import express from "express";
import path from "path";
import { randomUUID } from "crypto";
import { ENV, getRuntimeDiagnostics } from "./_core/env";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

const app = express();

app.use((req, res, next) => {
  const requestId = typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : randomUUID();
  res.setHeader("X-Request-Id", requestId);
  const startedAt = Date.now();
  res.on("finish", () => {
    console.log(JSON.stringify({ event: "http_request", requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - startedAt }));
  });
  next();
});

// Credentialed CORS must use an explicit allowlist; never reflect arbitrary origins.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const configuredOrigins = ENV.allowedOrigins.split(",").map((value) => value.trim()).filter(Boolean);
  if (ENV.webPreviewUrl) {
    try { configuredOrigins.push(new URL(ENV.webPreviewUrl).origin); } catch { /* invalid preview URL is reported by diagnostics */ }
  }
  if (!ENV.isProduction) configuredOrigins.push("http://localhost:8081", "http://127.0.0.1:8081", "http://localhost:3000", "http://127.0.0.1:3000");
  const allowed = !origin || configuredOrigins.includes(origin);
  if (origin && allowed) res.header("Access-Control-Allow-Origin", origin);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-Id");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    if (!allowed) { res.status(403).json({ error: "Origin is not allowed." }); return; }
    res.sendStatus(200);
    return;
  }
  if (origin && !allowed) { res.status(403).json({ error: "Origin is not allowed." }); return; }
  next();
});

app.use(express.json({
  limit: "50mb",
  verify: (req, _res, buffer) => {
    (req as typeof req & { rawBody?: string }).rawBody = buffer.toString("utf8");
  },
}));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);
registerOAuthRoutes(app);

const healthHandler = (_req: express.Request, res: express.Response) => {
  const diagnostics = getRuntimeDiagnostics();
  const ready = diagnostics.databaseConfigured && diagnostics.sessionSecretConfigured && (!ENV.isProduction || diagnostics.allowedOriginsConfigured);
  res.status(ready ? 200 : 503).json({
    ok: ready,
    timestamp: Date.now(),
    diagnostics,
  });
};
app.get("/api/health", healthHandler);
app.get("/health", healthHandler);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

// Serve the Expo web export (built into `public/` by the Vercel build command).
// Placed after all API/health/oauth routes so those always take priority; only
// requests that don't match an API route fall through to static files here.
const webBuildDir = path.join(process.cwd(), "public");
app.use(express.static(webBuildDir, { extensions: ["html"] }));

// Client-side routes with no matching static file (e.g. dynamic segments) fall
// back to the app shell so Expo Router can resolve them in the browser.
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path === "/health") return next();
  res.sendFile(path.join(webBuildDir, "index.html"), (err) => {
    if (err) next(err);
  });
});

export default app;
