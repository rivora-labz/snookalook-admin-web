import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isDevLocalhost, projectRoot } from "../../../../lib/conductor/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isDevLocalhost())) return NextResponse.json({ error: "not found" }, { status: 404 });
  const url = new URL(req.url);
  const linesParam = Number(url.searchParams.get("lines") ?? 200);
  const lineCount = Math.max(1, Math.min(1000, isNaN(linesParam) ? 200 : linesParam));

  const logPath = path.join(projectRoot(), "agents", "conductor.log");
  try {
    const content = await fs.readFile(logPath, "utf8");
    const all = content.split("\n");
    const tail = all.slice(-lineCount).filter((l) => l.length > 0);
    return NextResponse.json({ lines: tail });
  } catch {
    return NextResponse.json({ lines: [] });
  }
}
