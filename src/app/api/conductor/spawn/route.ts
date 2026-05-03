import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { isDevLocalhost, projectRoot, validateAgentName } from "../../../../lib/conductor/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pExecFile = promisify(execFile);

export async function POST(req: Request) {
  if (!isDevLocalhost()) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: { agent?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!validateAgentName(body.agent)) {
    return NextResponse.json({ error: "bad agent" }, { status: 400 });
  }
  const agent = body.agent;

  const root = projectRoot();
  const script = path.join(root, "agents", "snook");
  try {
    await fs.access(script);
  } catch {
    return NextResponse.json(
      { error: "agents/snook script not found", path: script },
      { status: 501 },
    );
  }

  try {
    const { stdout, stderr } = await pExecFile("bash", ["agents/snook", agent, "spawn"], {
      cwd: root,
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });
    return NextResponse.json({ ok: true, stdout, stderr, code: 0 });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        stdout: err?.stdout ?? "",
        stderr: err?.stderr ?? String(err?.message ?? err),
        code: typeof err?.code === "number" ? err.code : 1,
      },
      { status: 500 },
    );
  }
}
