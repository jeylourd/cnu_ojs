import Link from "next/link";

type JournalPublicNavProps = {
  slug: string;
  active: "HOME" | "CURRENT" | "ARCHIVES" | "ABOUT" | "ANNOUNCEMENTS";
};

export function JournalPublicNav({ slug, active }: JournalPublicNavProps) {
  const itemClass = (isActive: boolean) =>
    isActive
      ? "rounded-full bg-yellow-400 px-3 py-1.5 text-sm font-semibold text-red-950"
      : "rounded-full border border-yellow-400/50 px-3 py-1.5 text-sm font-medium text-yellow-200 transition hover:bg-red-800";

  return (
    <nav className="flex flex-wrap gap-2">
      <Link href={`/journals/${slug}`} className={itemClass(active === "HOME")}>
        Home
      </Link>
      <Link href="/register" className="rounded-full border border-yellow-400/50 px-3 py-1.5 text-sm font-medium text-yellow-200 transition hover:bg-red-800">
        Register
      </Link>
      <Link href={`/journals/${slug}/current`} className={itemClass(active === "CURRENT")}>
        Current
      </Link>
      <Link href={`/journals/${slug}/archives`} className={itemClass(active === "ARCHIVES")}>
        Archives
      </Link>
      <Link href={`/journals/${slug}/about`} className={itemClass(active === "ABOUT")}>
        About
      </Link>
      <Link href={`/journals/${slug}/announcements`} className={itemClass(active === "ANNOUNCEMENTS")}>
        Announcements
      </Link>
    </nav>
  );
}
