"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type Step = "phone" | "otp";

const PHONE_PREFIX = "+971";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fullPhone = phone.startsWith("+") ? phone : `${PHONE_PREFIX}${phone.replace(/^0+/, "")}`;

  const sendOtp = async () => {
    if (!/^\+\d{8,15}$/.test(fullPhone)) {
      setError("Enter a valid phone number, e.g. 501234567");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: sbError } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (sbError) throw sbError;
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: sbError } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otp,
        type: "sms",
      });
      if (sbError) throw sbError;
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect or expired code.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-card border border-th-divider bg-th-card p-8">
      <div className="mb-6 text-center">
        <div className="font-display text-2xl text-th-text">Snook A Look</div>
        <div className="mt-1 text-xs text-th-text-tertiary">Center Admin sign-in</div>
      </div>

      {step === "phone" && (
        <div>
          <label className="mb-1 block text-xs text-th-text-secondary">Phone number</label>
          <div className="flex items-center gap-2">
            <span className="rounded-input border border-th-divider bg-th-bg px-3 py-2 text-sm text-th-text-secondary">
              {PHONE_PREFIX}
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))}
              placeholder="501234567"
              className="flex-1 rounded-input border border-th-divider bg-th-bg px-3 py-2 text-sm text-th-text outline-none focus:border-th-gold"
            />
          </div>

          <button
            onClick={sendOtp}
            disabled={submitting || phone.length < 7}
            className="mt-5 w-full rounded-button bg-th-gold px-4 py-2.5 text-sm font-medium text-black hover:bg-th-gold-hover disabled:opacity-50"
          >
            {submitting ? "Sending..." : "Send code"}
          </button>
        </div>
      )}

      {step === "otp" && (
        <div>
          <p className="mb-4 text-xs text-th-text-secondary">
            Enter the 6-digit code sent to{" "}
            <span className="text-th-text">{fullPhone}</span>
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className="w-full rounded-input border border-th-divider bg-th-bg px-3 py-2 text-center font-mono text-lg tracking-widest text-th-text outline-none focus:border-th-gold"
          />
          <button
            onClick={verifyOtp}
            disabled={submitting || otp.length !== 6}
            className="mt-5 w-full rounded-button bg-th-gold px-4 py-2.5 text-sm font-medium text-black hover:bg-th-gold-hover disabled:opacity-50"
          >
            {submitting ? "Verifying..." : "Verify"}
          </button>
          <button
            onClick={() => { setStep("phone"); setOtp(""); setError(null); }}
            disabled={submitting}
            className="mt-3 w-full text-xs text-th-text-tertiary hover:text-th-text disabled:opacity-50"
          >
            Use a different number
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-button border border-[#E74C3C]/40 bg-[#E74C3C]/10 px-3 py-2 text-xs text-[#E74C3C]">
          {error}
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-th-bg px-4">
      <Suspense fallback={<div className="text-sm text-th-text-tertiary">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
