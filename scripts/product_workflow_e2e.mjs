const base = process.env.LUMIERE_API_BASE || "http://127.0.0.1:3000";
const email = `lumiere.product.${Date.now()}@example.com`;
const password = "SecureTest-2026";

async function trpc(path, input, token, method = "POST") {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const query = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  const response = await fetch(`${base}/api/trpc/${path}${method === "GET" ? query : ""}`, { method, headers, ...(method === "POST" ? { body: JSON.stringify({ json: input }) } : {}) });
  const json = await response.json();
  return { response, json, data: json?.result?.data?.json };
}

function expectOk(result, label) {
  if (!result.response.ok) throw new Error(`${label} failed: HTTP ${result.response.status} ${JSON.stringify(result.json)}`);
  return result.data;
}

const signup = expectOk(await trpc("auth.signup", { name: "Lumiere Product E2E", email, password }), "signup");
const token = signup.sessionToken;
const workspace = expectOk(await trpc("workspaces.create", { name: "Product E2E Workspace", industry: "Testing", location: "Remote" }, token), "workspace creation");
const workspaceId = workspace.id;
expectOk(await trpc("workspaces.updateBusiness", { workspaceId, name: "Product E2E Workspace", industry: "Testing", location: "Remote", productsServices: "Outcome-driven marketing", targetCustomer: "Small businesses", website: "https://example.com" }, token), "business information");
const goal = expectOk(await trpc("goals.create", { workspaceId, title: "30 bookings", goalType: "bookings", period: "Next 30 days", currentPerformance: 4, target: 30 }, token), "goal creation");
const campaign = expectOk(await trpc("campaigns.create", { workspaceId, name: "E2E booking campaign", objective: "Create demand for bookings", goalId: goal.id, platforms: ["instagram"] }, token), "campaign creation");
expectOk(await trpc("clients.create", { workspaceId, name: "Consent E2E Client", email: "consent.e2e@example.com", segment: "VIP", consentStatus: "granted" }, token), "client creation");
expectOk(await trpc("analytics.record", { workspaceId, eventType: "booking", value: 4, campaignId: campaign.id }, token), "actual event recording");
const dashboard = expectOk(await trpc("workspaces.dashboard", { workspaceId }, token, "GET"), "Today dashboard");
const summary = expectOk(await trpc("goals.summary", { workspaceId }, token, "GET"), "Results summary");
const events = expectOk(await trpc("analytics.list", { workspaceId }, token, "GET"), "Results actuals");
const breakdown = expectOk(await trpc("analytics.breakdown", { workspaceId }, token, "GET"), "campaign Results breakdown");
const comparison = expectOk(await trpc("analytics.comparison", { workspaceId, periodDays: 30 }, token, "GET"), "period comparison");
const settings = expectOk(await trpc("billing.subscription", { workspaceId }, token, "GET"), "Settings subscription");
const connectors = expectOk(await trpc("connectors.list", { workspaceId }, token, "GET"), "connector status");
const refreshedDashboard = expectOk(await trpc("workspaces.dashboard", { workspaceId }, token, "GET"), "dashboard refresh");
if (!dashboard.goals.length || !dashboard.clients.length || !dashboard.analytics.length || !refreshedDashboard.goals.length || !settings || !connectors.length) throw new Error("Today did not reflect persisted product records");
if (summary.goals[0]?.target !== 30 || summary.actualEventCount < 1 || events.length < 1 || breakdown[0]?.campaignId !== campaign.id || breakdown[0]?.bookings !== 1 || comparison.currentCount < 1) throw new Error("Results did not reflect campaign target and actual evidence");
const connectorBlocked = await trpc("performance.importFromConnector", { workspaceId, provider: "tiktok", idempotencyKey: `blocked-${Date.now()}` }, token);
if (connectorBlocked.response.status !== 412) throw new Error(`Unauthorized connector import was not blocked: HTTP ${connectorBlocked.response.status}`);
const otherEmail = `lumiere.isolation.${Date.now()}@example.com`;
const otherSignup = expectOk(await trpc("auth.signup", { name: "Isolation E2E", email: otherEmail, password }), "second signup");
const unauthorizedDashboard = await trpc("workspaces.dashboard", { workspaceId }, otherSignup.sessionToken, "GET");
if (![401, 403].includes(unauthorizedDashboard.response.status)) throw new Error(`Cross-user workspace access was not rejected: HTTP ${unauthorizedDashboard.response.status}`);
console.log(JSON.stringify({ ok: true, workspaceId, today: { goals: dashboard.goals.length, clients: dashboard.clients.length, analytics: dashboard.analytics.length }, refreshed: { goals: refreshedDashboard.goals.length }, results: { target: summary.goals[0]?.target, actualEventCount: summary.actualEventCount, campaignId: campaign.id, campaignBookings: breakdown[0]?.bookings, trend: comparison.trend }, settings: { plan: settings.plan, status: settings.status }, connectors: connectors.length, connectorImportBlocked: true, crossUserWorkspaceRejected: true }));
