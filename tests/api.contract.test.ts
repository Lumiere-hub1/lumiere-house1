import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

function createContext(user: TrpcContext["user"] = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("tRPC API contracts", () => {
  it("returns a healthy public system response", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.system.health({ timestamp: Date.now() })).resolves.toEqual({ ok: true });
  });

  it("returns null for an unauthenticated auth.me query", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.auth.me()).resolves.toBeNull();
  });

  it("rejects protected workspace reads without a signed-in user", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.workspaces.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
