import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isDevLocalhost, projectRoot } from "../../../../lib/conductor/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReportEntry {
  name: string;
  agent: string | null;
  status: string | null;
  phase: string | null;
  mtime: number;
  sizeBytes: number;
}

function parseFrontmatter(text: string): Record<string, string> {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1]!.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key) out[key] = val;
  }
  return out;
}

export async function GET() {
  if (!(await isDevLocalhost())) return NextResponse.json({ error: "not found" }, { status: 404 });

  const dir = path.join(projectRoot(), "agents", "reports");
  let files: string[];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md"));
  } catch {
    return NextResponse.json({ items: [] });
  }

  const stats = await Promise.all(
    files.map(async (name) => {
      const full = path.join(dir, name);
      const st = await fs.stat(full);
      return { name, mtime: st.mtimeMs, sizeBytes: st.size };
    }),
  );
  stats.sort((a, b) => b.mtime - a.mtime);
  const top = stats.slice(0, 30);

  const items: ReportEntry[] = await Promise.all(
    top.map(async (s) => {
      const content = await fs.readFile(path.join(dir, s.name), "utf8");
      const fm = parseFrontmatter(content.slice(0, 2000));
      return {
        name: s.name,
        agent: fm.agent ?? null,
        status: fm.status ?? null,
        phase: fm.phase ?? null,
        mtime: s.mtime,
        sizeBytes: s.sizeBytes,
      };
    }),
  );

  return NextResponse.json({ items });
}
