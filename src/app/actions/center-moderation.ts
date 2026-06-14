"use server";

import { revalidatePath } from "next/cache";
import { masterFetch } from "../../lib/master-api";

export type CenterModerationResult =
  | { ok: true }
  | { ok: false; message: string };

export async function suspendCenter(centerId: string): Promise<CenterModerationResult> {
  if (!centerId || typeof centerId !== "string") {
    return { ok: false, message: "Invalid center ID." };
  }
  try {
    await masterFetch(`/centers/${centerId}/suspend`, { method: "POST" });
    revalidatePath(`/master/centers/${centerId}`);
    revalidatePath("/master/centers");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to suspend center.";
    return { ok: false, message };
  }
}

export async function unsuspendCenter(centerId: string): Promise<CenterModerationResult> {
  if (!centerId || typeof centerId !== "string") {
    return { ok: false, message: "Invalid center ID." };
  }
  try {
    await masterFetch(`/centers/${centerId}/unsuspend`, { method: "POST" });
    revalidatePath(`/master/centers/${centerId}`);
    revalidatePath("/master/centers");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to unsuspend center.";
    return { ok: false, message };
  }
}
