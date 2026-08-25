import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { randomUUID } from "crypto";
import { ENV, getRuntimeDiagnostics } from "./env";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

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

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
