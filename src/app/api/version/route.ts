import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    deployedAt: process.env.VERCEL_DEPLOYMENT_CREATED_AT ?? null,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
  });
}
