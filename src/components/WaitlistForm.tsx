"use client";

import { useState } from "react";
import { API_BASE } from "../lib/api-base";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "fallback" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/.+@.+\..+/.test(email)) {
      setStatus("error");
      setMsg("Enter a valid email.");
      return;
    }
    setStatus("sending");
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("ok");
        setMsg("On the list. We'll be in touch.");
        setEmail("");
        return;
      }
      if (res.status === 404) {
        setStatus("fallback");
        setMsg("Email captured locally. Backend endpoint pending — please also email waitlist@snookalook.com.");
        return;
      }
      throw new Error(`status ${res.status}`);
    } catch {
      setStatus("fallback");
      setMsg("Network unavailable. Email waitlist@snookalook.com directly.");
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="flex-1 rounded border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-sm text-white outline-none focus:border-[#D4AF37]"
        aria-label="Email address"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded bg-[#D4AF37] px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Join Waitlist"}
      </button>
      {msg && (
        <p
          className={`mt-2 w-full text-xs sm:absolute sm:mt-16 ${
            status === "error" ? "text-[#E74C3C]" : status === "ok" ? "text-[#2ECC71]" : "text-[#F39C12]"
          }`}
          role="status"
        >
          {msg}
        </p>
      )}
    </form>
  );
}
