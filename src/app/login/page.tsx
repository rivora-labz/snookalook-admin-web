"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isValidPhoneNumber, type CountryCode } from "libphonenumber-js";
import { createClient } from "../../lib/supabase/client";
import { getRuntimeAuthMode } from "../../lib/runtime-auth";
import { loginWithOtp, sendOtp as sendOtpAction } from "../actions/admin-token";
import { COUNTRIES, DEFAULT_COUNTRY, findCountry } from "./countries";

type Step = "phone" | "otp";

const AUTH_MODE = getRuntimeAuthMode();
const RESEND_COOLDOWN_SEC = 60;
const SAVED_PHONE_KEY = "snl_admin_saved_phone";
const SAVED_COUNTRY_KEY = "snl_admin_saved_country";

function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [step, setStep] = useState<Step>("phone");
  const [countryCode, setCountryCode] = useState<CountryCode>(DEFAULT_COUNTRY.code);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedPhone = window.localStorage.getItem(SAVED_PHONE_KEY);
      const savedCountry = window.localStorage.getItem(SAVED_COUNTRY_KEY) as CountryCode | null;
      if (savedPhone) setPhone(savedPhone);
      if (savedCountry && findCountry(savedCountry)) setCountryCode(savedCountry);
    } catch {
      // localStorage unavailable (privacy mode) — silent fallback to empty field
    }
  }, []);

  const country = useMemo(() => findCountry(countryCode), [countryCode]);

  useEffect(() => {
    if (resendIn <= 0) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    if (tickRef.current) return;
    tickRef.current = setInterval(() => {
      setResendIn((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [resendIn]);

  const nationalDigits = phone.replace(/\D/g, "").replace(/^0+/, "");
  const fullPhone = `${country.dial}${nationalDigits}`;
  const phoneValid = nationalDigits.length > 0 && isValidPhoneNumber(fullPhone, country.code);

  const sendOtp = async () => {
    if (!phoneValid) {
      setError(`Enter a valid ${country.name} number, e.g. ${country.placeholder}`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (AUTH_MODE === "supabase") {
        const supabase = createClient();
        const { error: sbError } = await supabase.auth.signInWithOtp({ phone: fullPhone });
        if (sbError) throw sbError;
      } else {
        const result = await sendOtpAction(fullPhone);
        if (!result.ok) {
          throw new Error(result.message);
        }
      }
      setStep("otp");
      setResendIn(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{4,6}$/.test(otp)) {
      setError("Enter the 4- to 6-digit code.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (AUTH_MODE === "supabase") {
        const supabase = createClient();
        const { error: sbError } = await supabase.auth.verifyOtp({
          phone: fullPhone,
          token: otp,
          type: "sms",
        });
        if (sbError) throw sbError;
      } else {
        const result = await loginWithOtp(fullPhone, otp);
        if (!result.ok) {
          throw new Error(result.message);
        }
      }
      const alreadySaved =
        typeof window !== "undefined" &&
        window.localStorage.getItem(SAVED_PHONE_KEY) === nationalDigits;
      if (alreadySaved) {
        window.location.href = next;
        return;
      }
      setShowSaveDialog(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect or expired code.");
    } finally {
      setSubmitting(false);
    }
  };

  const onSaveYes = () => {
    try {
      window.localStorage.setItem(SAVED_PHONE_KEY, nationalDigits);
      window.localStorage.setItem(SAVED_COUNTRY_KEY, countryCode);
    } catch {
      // localStorage unavailable — proceed to redirect anyway
    }
    window.location.href = next;
  };

  const onSaveNo = () => {
    try {
      window.localStorage.removeItem(SAVED_PHONE_KEY);
      window.localStorage.removeItem(SAVED_COUNTRY_KEY);
    } catch {
      // localStorage unavailable
    }
    window.location.href = next;
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
            <select
              aria-label="Country code"
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value as CountryCode);
                setError(null);
              }}
              className="rounded-input border border-th-divider bg-th-bg px-2 py-2 text-sm text-th-text-secondary outline-none focus:border-th-gold"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.dial} {c.code}
                </option>
              ))}
            </select>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              maxLength={country.maxLen}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, country.maxLen))
              }
              placeholder={country.placeholder}
              className="flex-1 rounded-input border border-th-divider bg-th-bg px-3 py-2 text-sm text-th-text outline-none focus:border-th-gold"
            />
          </div>

          <button
            onClick={sendOtp}
            disabled={submitting || !phoneValid}
            className="mt-5 w-full rounded-button bg-th-gold px-4 py-2.5 text-sm font-medium text-black hover:bg-th-gold-hover disabled:opacity-50"
          >
            {submitting ? "Sending..." : "Send code"}
          </button>
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-5">
          <p className="text-xs text-th-text-secondary">
            Enter the code sent to{" "}
            <span className="text-th-text">{fullPhone}</span>
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="1234"
            className="w-full rounded-input border border-th-divider bg-th-bg px-3 py-3 text-center font-mono text-lg tracking-widest text-th-text outline-none focus:border-th-gold"
          />
          <button
            onClick={verifyOtp}
            disabled={submitting || otp.length < 4}
            className="w-full rounded-button bg-th-gold px-4 py-2.5 text-sm font-medium text-black hover:bg-th-gold-hover disabled:opacity-50"
          >
            {submitting ? "Verifying..." : "Verify"}
          </button>
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => { setStep("phone"); setOtp(""); setError(null); setResendIn(0); }}
              disabled={submitting}
              className="text-xs text-th-text-tertiary hover:text-th-text disabled:opacity-50"
            >
              Use a different number
            </button>
            <button
              onClick={sendOtp}
              disabled={submitting || resendIn > 0}
              className="text-xs text-th-gold hover:text-th-gold-hover disabled:cursor-not-allowed disabled:text-th-text-tertiary"
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-button border border-[#E74C3C]/40 bg-[#E74C3C]/10 px-3 py-2 text-xs text-[#E74C3C]">
          {error}
        </div>
      )}

      {AUTH_MODE === "backend" && (
        <div className="mt-4 text-center text-xs text-th-text-tertiary">
          Backend OTP mode is active for this deploy. Use the seeded test code.
        </div>
      )}

      {showSaveDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-phone-title"
        >
          <div className="w-full max-w-sm rounded-card border border-th-divider bg-th-card p-6">
            <div id="save-phone-title" className="mb-2 font-display text-lg text-th-text">
              Save this number?
            </div>
            <div className="mb-5 text-sm text-th-text-secondary">
              Next time, we&apos;ll pre-fill <span className="text-th-text">{fullPhone}</span> so you skip
              re-typing.
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onSaveNo}
                className="rounded-button border border-th-divider px-3 py-2 text-sm text-th-text-secondary hover:text-th-text"
              >
                Not now
              </button>
              <button
                onClick={onSaveYes}
                className="rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
              >
                Save
              </button>
            </div>
          </div>
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
