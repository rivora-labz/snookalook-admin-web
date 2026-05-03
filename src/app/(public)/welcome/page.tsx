import WaitlistForm from "../../../components/WaitlistForm";

export const metadata = {
  title: "Snook A Look — Premium snooker matchmaking in Dubai",
  description:
    "Book any club. Find your match. Loser pays. Premium snooker matchmaking across Dubai's top venues.",
};

const GOLD = "#D4AF37";
const GREEN = "#0B3D2E";

function CueBallIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
      <line x1="6" y1="42" x2="34" y2="14" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
      <circle cx="38" cy="10" r="5" fill="#FFFFFF" stroke={GOLD} strokeWidth="1.5" />
      <circle cx="14" cy="34" r="3" fill={GREEN} stroke={GOLD} strokeWidth="1" />
    </svg>
  );
}

function CrossedCuesIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
      <line x1="6" y1="6" x2="42" y2="42" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="6" x2="6" y2="42" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="24" r="4" fill={GREEN} stroke={GOLD} strokeWidth="1.5" />
    </svg>
  );
}

function ChipsIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
      <ellipse cx="16" cy="34" rx="10" ry="3" fill={GREEN} stroke={GOLD} strokeWidth="1.5" />
      <ellipse cx="16" cy="30" rx="10" ry="3" fill={GREEN} stroke={GOLD} strokeWidth="1.5" />
      <ellipse cx="32" cy="20" rx="8" ry="2.5" fill={GOLD} opacity="0.8" />
      <line x1="32" y1="8" x2="32" y2="20" stroke={GOLD} strokeWidth="1" strokeDasharray="2 2" />
    </svg>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
}

function FeatureCard({ icon, title, body }: FeatureCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#D4AF37]/30 bg-[#1A1A1A] p-6 transition-colors hover:border-[#D4AF37]">
      <div>{icon}</div>
      <h3 className="font-display text-xl text-[#D4AF37]">{title}</h3>
      <p className="text-sm leading-relaxed text-[#B0B0B0]">{body}</p>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <main>
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at center top, rgba(212,175,55,0.15) 0%, transparent 60%), radial-gradient(ellipse at center bottom, rgba(11,61,46,0.4) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 max-w-3xl">
          <h1
            className="font-display text-5xl tracking-tight sm:text-7xl"
            style={{ color: GOLD }}
          >
            Snook A Look
          </h1>
          <p className="mt-6 text-lg text-[#B0B0B0] sm:text-xl">
            Premium snooker matchmaking in Dubai.
          </p>
          <p className="mt-2 text-sm text-[#6B6B6B] sm:text-base">
            Book any club. Find your match. Play for stakes that matter.
          </p>
          <a
            href="#waitlist"
            className="mt-10 inline-block rounded bg-[#D4AF37] px-8 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Join the Waitlist
          </a>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<CueBallIcon />}
              title="Book Any Club"
              body="One app. Every premium hall in Dubai. Live availability across snooker, pool, and billiards tables — no phone calls."
            />
            <FeatureCard
              icon={<CrossedCuesIcon />}
              title="Find Your Match"
              body="Skill-tier matchmaking pairs you with players who'll push your game. Solo, friend invite, or open challenge."
            />
            <FeatureCard
              icon={<ChipsIcon />}
              title="Loser Pays"
              body="Winner walks free. Loser covers the table. The original Snook A Look mode — competition with stakes that mean something."
            />
          </div>
        </div>
      </section>

      <section id="waitlist" className="relative px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl text-[#D4AF37] sm:text-4xl">
            Be among the first cues on the table.
          </h2>
          <p className="mt-3 text-sm text-[#B0B0B0]">
            Early access opens summer 2026. Drop your email — no spam, only launch news.
          </p>
          <div className="relative mt-8">
            <WaitlistForm />
          </div>
        </div>
      </section>

      <footer className="border-t border-[#2A2A2A] px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-xs text-[#6B6B6B] sm:flex-row">
          <div>© {new Date().getFullYear()} Snook A Look. All rights reserved.</div>
          <div className="flex items-center gap-5">
            <a href="https://instagram.com/snookalook" className="hover:text-[#D4AF37]" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="15" height="15" rx="4" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="13.5" cy="4.5" r="0.8" fill="currentColor" />
              </svg>
            </a>
            <a href="https://x.com/snookalook" className="hover:text-[#D4AF37]" aria-label="X">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M2 2l6 8-6 6h2l5-5 4 5h3l-6.5-8L16 2h-2l-4.5 4.5L6 2H2z"
                  fill="currentColor"
                />
              </svg>
            </a>
            <a href="/privacy" className="hover:text-[#D4AF37]">
              Privacy
            </a>
            <a href="/terms" className="hover:text-[#D4AF37]">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
