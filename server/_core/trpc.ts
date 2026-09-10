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

/**
 * Workspace-scoped, and additionally requires a confirmed email address.
 *
 * Applied to actions that spend money, reach outside the product, or act on the
 * user's behalf — not to reading, and deliberately NOT to workspace creation.
 * Gating onboarding would leave a new account unable to do anything at all,
 * which is the "block login entirely" behaviour under a different name; a user
 * whose verification email is delayed or lost would be stuck with no route
 * forward. They can look around, finish setup, and connect a platform account;
 * they cannot burn API credits until the address is confirmed.
 *
 * Connecting is deliberately NOT gated. It spends nothing, it is the user
 * authorizing us to their own account through the provider's own consent
 * screen, and gating it would make a lost verification email block the one
 * step a new account most needs to take. Keep this list and the wording in
 * components/unverified-email-banner.tsx in agreement — they drifted once, and
 * the banner told users connections were locked when they were not.
 */
export const verifiedWorkspaceProcedure = workspaceProcedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    const user = ctx.user;
    if (!user?.emailVerifiedAt) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Confirm your email address to use this. Check your inbox, or request a new confirmation link from Settings.",
      });
    }
    // Pass `user` through explicitly: spreading ctx alone widens it back to the
    // base context, where user is nullable, and every downstream ctx.user
    // access stops type-checking.
    return next({ ctx: { ...ctx, user } });
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
