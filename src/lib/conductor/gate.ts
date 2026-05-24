import { headers } from "next/headers";
import path from "node:path";

const ALLOWED_REMOTES = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"]);
const AGENT_REGEX = /^[a-z][a-z0-9-]{0,30}$/;

export function isDevLocalhost(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const h = headers();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]!.trim();
    if (!ALLOWED_REMOTES.has(first)) return false;
  }
  const host = (h.get("host") ?? "").toLowerCase();
  if (host && !host.startsWith("localhost") && !host.startsWith("127.0.0.1") && !host.startsWith("[::1]")) {
    return false;
  }
  return true;
}

export function projectRoot(): string {
  return path.resolve(process.cwd(), "..", "..");
}

export function validateAgentName(agent: unknown): agent is string {
  return typeof agent === "string" && AGENT_REGEX.test(agent);
}

