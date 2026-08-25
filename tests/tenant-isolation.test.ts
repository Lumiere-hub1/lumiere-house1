import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";
import type { TrpcContext } from "../server/_core/context";

const user = {
  id: 42,
  openId: "local_test_user",
  name: "Test User",
  email: "test@example.com",
  passwordHash: null,
  loginMethod: "email",
  role: "user" as const,
  emailVerifiedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createContext(): TrpcContext {
  return {
    user,
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("workspace tenant isolation", () => {
  it("rejects a workspace request before the handler can read resources", async () => {
    const membership = vi.spyOn(db, "getWorkspaceMembership").mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createContext());
    await expect(caller.analytics.list({ workspaceId: 999999 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(membership).toHaveBeenCalledWith(user.id, 999999);
    membership.mockRestore();
  });
});
