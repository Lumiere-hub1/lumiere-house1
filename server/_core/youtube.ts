/**
 * YouTube Data API v3 client for the /TRENDS command.
 *
 * Uses fetch rather than googleapis: we need two read-only endpoints, and the
 * official client pulls in a very large dependency tree for no benefit in a
 * serverless bundle.
 *
 * QUOTA is the real constraint. The default project allowance is 10,000 units
 * per day and search.list costs 100 of them — so roughly 100 /TRENDS calls a
 * day for the whole product, shared across every workspace. videos.list costs
 * 1, so enriching the results with statistics is essentially free by
 * comparison. The command is rate limited in the router accordingly, and this
 * module surfaces quota exhaustion as its own error so the UI can say what
 * actually happened rather than blaming the topic.
 */
import { ENV } from "./env";

const SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";

/** More than this and the list stops being scannable on a phone. */
const RESULT_COUNT = 8;

/** Thrown when trends cannot be fetched; the router converts it to a tRPC error. */
export class YouTubeUnavailableError extends Error {}

export type TrendingVideo = {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
};

export function isYouTubeConfigured(): boolean {
  return Boolean(ENV.youtubeApiKey);
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Google returns 403 for several very different situations. Distinguishing them
 * matters: "you have run out of quota for today" and "this key is not allowed
 * to call this API" need completely different actions from the operator.
 */
export function describeGoogleError(status: number, body: string): string {
  let reason = "";
  try {
    reason = JSON.parse(body)?.error?.errors?.[0]?.reason ?? "";
  } catch {
    reason = "";
  }
  if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
    return "The daily YouTube research quota is used up. It resets at midnight Pacific time.";
  }
  if (reason === "keyInvalid" || reason === "badRequest") {
    return "The YouTube API key was rejected. Check YOUTUBE_API_KEY on the server.";
  }
  if (reason === "accessNotConfigured") {
    return "YouTube Data API v3 is not enabled for this API key's Google Cloud project.";
  }
  if (status === 401) {
    return "The YouTube API key is not valid for the Data API. It must be a plain API key, not an OAuth client id.";
  }
  return `YouTube research is unavailable right now (${status}).`;
}

async function callYouTube(url: URL): Promise<any> {
  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    throw new YouTubeUnavailableError("YouTube could not be reached. No research was returned.");
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(JSON.stringify({ event: "youtube_api_error", status: response.status, body: body.slice(0, 400) }));
    throw new YouTubeUnavailableError(describeGoogleError(response.status, body));
  }
  return response.json();
}

/**
 * The most-viewed recent videos for a topic.
 *
 * Recency is bounded to the last 30 days deliberately: an all-time search
 * returns the same handful of years-old videos every time, which tells an
 * owner-operator nothing about what to film this week.
 */
export async function fetchTrendingVideos(topic: string): Promise<TrendingVideo[]> {
  if (!ENV.youtubeApiKey) {
    throw new YouTubeUnavailableError("Trend research is not configured. Set YOUTUBE_API_KEY on the server.");
  }

  const searchUrl = new URL(SEARCH_ENDPOINT);
  searchUrl.searchParams.set("key", ENV.youtubeApiKey);
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("order", "viewCount");
  searchUrl.searchParams.set("publishedAfter", daysAgoIso(30));
  searchUrl.searchParams.set("maxResults", String(RESULT_COUNT));
  searchUrl.searchParams.set("q", topic);

  const search = await callYouTube(searchUrl);
  const ids: string[] = (search.items ?? []).map((item: any) => item?.id?.videoId).filter((id: unknown): id is string => typeof id === "string");
  if (!ids.length) return [];

  // One extra call, costing 1 quota unit, turns a bare list of titles into
  // something an operator can actually judge.
  const videosUrl = new URL(VIDEOS_ENDPOINT);
  videosUrl.searchParams.set("key", ENV.youtubeApiKey);
  videosUrl.searchParams.set("part", "snippet,statistics");
  videosUrl.searchParams.set("id", ids.join(","));

  const videos = await callYouTube(videosUrl);

  return (videos.items ?? [])
    .map((item: any): TrendingVideo => ({
      videoId: String(item.id),
      title: String(item.snippet?.title ?? "Untitled"),
      channelTitle: String(item.snippet?.channelTitle ?? "Unknown channel"),
      publishedAt: String(item.snippet?.publishedAt ?? ""),
      url: `https://www.youtube.com/watch?v=${item.id}`,
      viewCount: Number(item.statistics?.viewCount ?? 0),
      likeCount: Number(item.statistics?.likeCount ?? 0),
      commentCount: Number(item.statistics?.commentCount ?? 0),
    }))
    .sort((a: TrendingVideo, b: TrendingVideo) => b.viewCount - a.viewCount);
}
