import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isDevLocalhost, projectRoot } from "../../../../../lib/conductor/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAME_REGEX = /^[a-zA-Z0-9._-]+\.md$/;

export async function GET(_req: Request, { params }: { params: { name: string } }) {
  if (!isDevLocalhost()) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!NAME_REGEX.test(params.name)) {
    return NextResponse.json({ error: "bad name" }, { status: 400 });
  }
  const full = path.join(projectRoot(), "agents", "reports", params.name);
  try {
    const content = await fs.readFile(full, "utf8");
    return NextResponse.json({ name: params.name, content });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
