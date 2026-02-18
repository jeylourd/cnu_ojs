import { redirect } from "next/navigation";

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
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Role dashboard</p>
            <h1 className="mt-2 text-2xl font-semibold">Welcome, {session.user.name}</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Signed in as <span className="font-medium">{session.user.email}</span> · Role <span className="font-semibold">{role}</span>
            </p>
          </div>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Your module access</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {modules.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-zinc-500" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
