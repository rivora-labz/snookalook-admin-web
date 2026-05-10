"use client";

import { createClient } from "../../lib/supabase/client";
import { clearAdminAccessTokenCookie, getRuntimeAuthMode } from "../../lib/runtime-auth";

const AUTH_MODE = getRuntimeAuthMode();

export default function ForbiddenPage() {
  const handleSignOut = async () => {
    if (AUTH_MODE === "supabase") {
      const supabase = createClient();
      await supabase.auth.signOut();
    } else {
      clearAdminAccessTokenCookie();
    }
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-th-bg px-4">
      <div className="w-full max-w-sm rounded-card border border-th-divider bg-th-card p-8 text-center">
        <div className="font-display text-2xl text-th-text">Access denied</div>
        <p className="mt-3 text-sm text-th-text-secondary">
          Your account is signed in but is not assigned to a center as staff.
        </p>
        <p className="mt-2 text-xs text-th-text-tertiary">
          Ask your center owner to add you, or sign out and try a different account.
        </p>
        <div className="mt-6 flex gap-3">
          <a
            href="/login"
            className="flex-1 rounded-button border border-th-divider px-4 py-2 text-sm text-th-text-secondary hover:bg-th-hover"
          >
            Back to login
          </a>
          <button
            onClick={handleSignOut}
            className="flex-1 rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
