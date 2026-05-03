"use client";

import Link from "next/link";
import type { Route } from "next";
import { STATUS_TOKEN } from "../lib/status-tokens";

export interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  href: Route;
  done: boolean;
  skipped?: boolean;
  todo?: string | null;
}

export default function OnboardingChecklist({
  steps,
  onSkip,
}: {
  steps: ChecklistStep[];
  onSkip?: (id: string) => void;
}) {
  const completedCount = steps.filter((s) => s.done || s.skipped).length;
  const pct = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="rounded-card border border-th-divider bg-th-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-xl text-th-text">Setup Checklist</h2>
        <span className="font-mono text-sm text-th-text-secondary">
          {completedCount}/{steps.length} complete
        </span>
      </div>

      <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-th-divider">
        <div
          className="h-full rounded-full bg-th-gold transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="space-y-2">
        {steps.map((step, idx) => {
          const skippedOnly = !!step.skipped && !step.done;
          return (
            <li key={step.id}>
              <div
                className={`relative flex items-start gap-4 rounded-button border px-4 py-3 transition-colors ${
                  step.done
                    ? "hover:brightness-110"
                    : skippedOnly
                      ? "border-th-divider bg-th-bg/60 hover:bg-th-hover"
                      : "border-th-divider bg-th-bg hover:border-th-gold/40 hover:bg-th-hover"
                }`}
                style={
                  step.done
                    ? {
                        borderColor: `${STATUS_TOKEN.SUCCESS}66`,
                        backgroundColor: `${STATUS_TOKEN.SUCCESS}1A`,
                      }
                    : undefined
                }
              >
                <Link
                  href={step.href}
                  aria-label={step.title}
                  className="absolute inset-0 z-0 rounded-button"
                />
                <span
                  className={`relative z-10 pointer-events-none mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    step.done
                      ? "text-white"
                      : skippedOnly
                        ? "text-white"
                        : "border border-th-divider bg-th-card text-th-text-tertiary"
                  }`}
                  style={
                    step.done
                      ? { backgroundColor: STATUS_TOKEN.SUCCESS }
                      : skippedOnly
                        ? { backgroundColor: STATUS_TOKEN.NEUTRAL }
                        : undefined
                  }
                  aria-hidden="true"
                >
                  {step.done ? "✓" : skippedOnly ? "–" : idx + 1}
                </span>
                <div className="relative z-10 pointer-events-none flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        step.done
                          ? "text-th-text-secondary line-through"
                          : skippedOnly
                            ? "text-th-text-secondary"
                            : "text-th-text"
                      }`}
                    >
                      {step.title}
                    </span>
                    {step.done && (
                      <span
                        className="rounded-pill px-1.5 py-0.5 text-[9px] font-medium text-white"
                        style={{ backgroundColor: STATUS_TOKEN.SUCCESS }}
                      >
                        DONE
                      </span>
                    )}
                    {skippedOnly && (
                      <span
                        className="rounded-pill px-1.5 py-0.5 text-[9px] font-medium text-white"
                        style={{ backgroundColor: STATUS_TOKEN.NEUTRAL }}
                      >
                        SKIPPED
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-th-text-tertiary">{step.description}</p>
                  {step.todo && !step.done && !skippedOnly && (
                    <p className="mt-1 text-[10px]" style={{ color: STATUS_TOKEN.WARNING }}>
                      TODO: {step.todo}
                    </p>
                  )}
                  {!step.done && !skippedOnly && onSkip && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSkip(step.id);
                      }}
                      className="pointer-events-auto relative z-10 mt-1 text-[10px] text-th-text-tertiary underline-offset-2 hover:text-th-text hover:underline"
                    >
                      Skip this step
                    </button>
                  )}
                </div>
                <span className="relative z-10 pointer-events-none self-center text-th-text-tertiary">→</span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
