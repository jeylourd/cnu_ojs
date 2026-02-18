import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { auth, signOut } from "@/auth";
import { AppRole } from "@/lib/roles";

const roleModules: Record<AppRole, string[]> = {
  ADMIN: ["Manage users and role assignments", "Configure journal settings", "Monitor platform activity"],
  EDITOR: ["Assign reviewers", "Track review progress", "Issue editorial decisions"],
  REVIEWER: ["View assigned manuscripts", "Submit recommendations", "Manage review deadlines"],
  AUTHOR: ["Create new submissions", "Track manuscript status", "Upload revisions"],
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  const modules = roleModules[role] ?? [];

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Image src="/cnu-logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Role dashboard</p>
              <h1 className="mt-2 text-2xl font-semibold text-yellow-50">Welcome, {session.user.name}</h1>
              <p className="mt-2 text-sm text-yellow-100/85">
              Signed in as <span className="font-medium">{session.user.email}</span> · Role <span className="font-semibold">{role}</span>
              </p>
            </div>
          </div>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
            >
              Sign out
            </button>
          </form>
        </header>

        <section className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-yellow-50">Your module access</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-yellow-100/90">
            {modules.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-yellow-300" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <Link
              href="/dashboard/submissions"
              className="inline-flex rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
            >
              Open submission management
            </Link>
          </div>

          <div className="mt-3">
            <Link
              href="/dashboard/reviews"
              className="inline-flex rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
            >
              Open peer review module
            </Link>
          </div>

          {role === "ADMIN" || role === "EDITOR" ? (
            <div className="mt-3">
              <Link
                href="/dashboard/decisions"
                className="inline-flex rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
              >
                Open editorial decisions
              </Link>
            </div>
          ) : null}

          {role === "ADMIN" || role === "EDITOR" ? (
            <div className="mt-3">
              <Link
                href="/dashboard/publications"
                className="inline-flex rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
              >
                Open issue publication module
              </Link>
            </div>
          ) : null}

          {role === "ADMIN" ? (
            <div className="mt-3">
              <Link
                href="/dashboard/users"
                className="inline-flex rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
              >
                Open user and role management
              </Link>
            </div>
          ) : null}

          {role === "ADMIN" ? (
            <div className="mt-3">
              <Link
                href="/dashboard/journal-settings"
                className="inline-flex rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
              >
                Open journal settings
              </Link>
            </div>
          ) : null}

          {role === "ADMIN" ? (
            <div className="mt-3">
              <Link
                href="/dashboard/activity"
                className="inline-flex rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
              >
                Open platform activity monitor
              </Link>
            </div>
          ) : null}

          {role === "ADMIN" ? (
            <div className="mt-3">
              <Link
                href="/dashboard/journals"
                className="inline-flex rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
              >
                Open journal management
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
