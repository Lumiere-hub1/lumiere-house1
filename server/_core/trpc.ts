import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getWorkspaceMembership } from "../db";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/**
 * Workspace-scoped authorization primitive. Procedures using this middleware
 * must receive an input object containing a positive integer workspaceId.
 */
export const workspaceProcedure = protectedProcedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    const rawInput = await opts.getRawInput();
    const workspaceId = (rawInput as { workspaceId?: unknown })?.workspaceId;
    if (typeof workspaceId !== "number" || !Number.isInteger(workspaceId) || workspaceId <= 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "workspaceId is required." });
    }
    const user = ctx.user;
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    const access = await getWorkspaceMembership(user.id, workspaceId);
    if (!access) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this workspace." });
    return next({ ctx: { ...ctx, user, workspace: access.workspace, membership: access.membership } });
  }),
);

export const adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
