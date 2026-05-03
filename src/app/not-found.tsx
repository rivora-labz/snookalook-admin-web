import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-th-bg">
      <div className="text-center">
        <div className="font-mono text-6xl text-th-text-tertiary">404</div>
        <p className="mt-4 text-th-text-secondary">Page not found</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-button bg-th-gold px-4 py-2 text-sm font-medium text-black hover:bg-th-gold-hover"
        >
          Back to Tables
        </Link>
      </div>
    </div>
  );
}
