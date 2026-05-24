import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isDevLocalhost, projectRoot, validateAgentName } from "../../../../lib/conductor/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INBOX_LIMIT = 1500;

export async function GET() {
  if (!(await isDevLocalhost())) return NextResponse.json({ error: "not found" }, { status: 404 });

  const dir = path.join(projectRoot(), "agents", "inbox");
  let entries: string[];
  try {
    entries = (await fs.readdir(dir)).filter((f) => f.endsWith(".txt"));
  } catch {
    return NextResponse.json({ items: [] });
  }

  const items = await Promise.all(
    entries.map(async (name) => {
      const full = path.join(dir, name);
      const st = await fs.stat(full);
      let isPointer = false;
      let pointerTarget: string | null = null;
      if (st.size < 600) {
        const head = await fs.readFile(full, "utf8");
        const m = head.match(/BRIEF_FILE:\s*(\S+)/);
        if (m) {
          isPointer = true;
          pointerTarget = m[1] ?? null;
        }
      }
      return {
        agent: name.replace(/\.txt$/, ""),
        sizeBytes: st.size,
        mtime: st.mtimeMs,
        isPointer,
        pointerTarget,
      };
    }),
  );
  items.sort((a, b) => b.mtime - a.mtime);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  if (!(await isDevLocalhost())) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: { agent?: unknown; content?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!validateAgentName(body.agent)) {
    return NextResponse.json({ error: "bad agent" }, { status: 400 });
  }
  if (typeof body.content !== "string" || body.content.length === 0) {
    return NextResponse.json({ error: "empty content" }, { status: 400 });
  }
  const agent = body.agent;
  const content = body.content;

  const inboxDir = path.join(projectRoot(), "agents", "inbox");
  const briefsDir = path.join(projectRoot(), "agents", "briefs");
  await fs.mkdir(inboxDir, { recursive: true });

  const inboxPath = path.join(inboxDir, `${agent}.txt`);

  if (Buffer.byteLength(content, "utf8") > INBOX_LIMIT) {
    await fs.mkdir(briefsDir, { recursive: true });
    const ts = Math.floor(Date.now() / 1000);
    const briefName = `${agent}-${ts}.md`;
    const briefPath = path.join(briefsDir, briefName);
    await fs.writeFile(briefPath, content, "utf8");
    const pointer = `BRIEF_FILE: agents/briefs/${briefName}\n\nRead this file with your Read tool — full brief is there.\n`;
    await fs.writeFile(inboxPath, pointer, "utf8");
    return NextResponse.json({ ok: true, mode: "pointer", briefPath: `agents/briefs/${briefName}` });
  }

  await fs.writeFile(inboxPath, content, "utf8");
  return NextResponse.json({ ok: true, mode: "inline", path: `agents/inbox/${agent}.txt` });
}

export async function DELETE(req: Request) {
  if (!(await isDevLocalhost())) return NextResponse.json({ error: "not found" }, { status: 404 });
  const url = new URL(req.url);
  const agent = url.searchParams.get("agent");
  if (!validateAgentName(agent)) {
    return NextResponse.json({ error: "bad agent" }, { status: 400 });
  }
  const inboxDir = path.join(projectRoot(), "agents", "inbox");
  const src = path.join(inboxDir, `${agent}.txt`);
  const dst = path.join(inboxDir, `${agent}.txt.skip`);
  try {
    await fs.rename(src, dst);
    return NextResponse.json({ ok: true, renamedTo: `${agent}.txt.skip` });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
