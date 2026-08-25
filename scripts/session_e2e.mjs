const base = process.env.LUMIERE_API_BASE || "http://127.0.0.1:3000";
const email = `lumiere.e2e.${Date.now()}@example.com`;
const password = "SecureTest-2026";

async function trpc(path, input, token, method = "POST") {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const query = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  const response = await fetch(`${base}/api/trpc/${path}${method === "GET" ? query : ""}`, { method, headers, ...(method === "POST" ? { body: JSON.stringify({ json: input }) } : {}) });
  const json = await response.json();
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}: ${JSON.stringify(json)}`);
  return json?.result?.data?.json;
}

const signup = await trpc("auth.signup", { name: "Lumiere Session E2E", email, password });
const firstToken = signup.sessionToken;
if (!firstToken) throw new Error("Signup did not return a session token");
const workspace = await trpc("workspaces.create", { name: "E2E Workspace", industry: "Testing", location: "Remote" }, firstToken);
const workspaceId = workspace.id;
const refreshedUser = await trpc("auth.me", undefined, firstToken, "GET");
const refreshedWorkspaces = await trpc("workspaces.list", undefined, firstToken, "GET");
if (!refreshedUser || !Array.isArray(refreshedWorkspaces) || !refreshedWorkspaces.some((item) => item.workspace?.id === workspaceId)) {
  console.error(JSON.stringify({ phase: "refresh", hasUser: Boolean(refreshedUser), workspaceIds: Array.isArray(refreshedWorkspaces) ? refreshedWorkspaces.map((item) => item.workspace?.id) : typeof refreshedWorkspaces }));
  throw new Error("Refresh did not preserve user/workspace resolution");
}

const logoutResponse = await fetch(`${base}/api/auth/logout`, { method: "POST", headers: { authorization: `Bearer ${firstToken}` } });
if (!logoutResponse.ok) throw new Error(`Logout failed: ${logoutResponse.status}`);
const afterLogout = await trpc("auth.me", undefined, undefined, "GET");
if (afterLogout !== null) throw new Error("Revoked session still resolved as authenticated");

const login = await trpc("auth.login", { email, password });
const secondToken = login.sessionToken;
if (!secondToken || secondToken === firstToken) throw new Error("Login did not issue a fresh session token");
const restoredUser = await trpc("auth.me", undefined, secondToken, "GET");
const restoredWorkspaces = await trpc("workspaces.list", undefined, secondToken, "GET");
if (!restoredUser || !restoredWorkspaces.some((item) => item.workspace?.id === workspaceId)) throw new Error("Login again did not restore the correct workspace");
console.log(JSON.stringify({ ok: true, email, workspaceId, refreshResolved: true, logoutInvalidated: true, reloginRestoredWorkspace: true }));
