import Image from "next/image";
import Link from "next/link";

type AuthTopHeaderProps = {
  title: string;
  actionLabel: string;
  actionHref: string;
};

export function AuthTopHeader({ title, actionLabel, actionHref }: AuthTopHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <Image src="/CNU-Logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">CNU OJS</p>
          <h1 className="mt-1 text-xl font-semibold text-yellow-50">{title}</h1>
        </div>
      </div>

      <nav className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/" className="rounded-lg border border-yellow-400/70 px-3 py-1.5 font-medium text-yellow-100 transition hover:bg-red-800">
          Home
        </Link>
        <Link href="/issues" className="rounded-lg border border-yellow-400/70 px-3 py-1.5 font-medium text-yellow-100 transition hover:bg-red-800">
          Published Issues
        </Link>
        <Link href={actionHref} className="rounded-lg bg-yellow-400 px-3 py-1.5 font-semibold text-red-950 transition hover:bg-yellow-300">
          {actionLabel}
        </Link>
      </nav>
    </header>
  );
}
