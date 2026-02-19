import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const modules = [
    {
      title: "Journals",
      description: "Manage journal profiles, sections, and editorial assignments.",
    },
    {
      title: "Submissions",
      description: "Track manuscripts from draft to publication status.",
    },
    {
      title: "Peer Review",
      description: "Assign reviewers and collect recommendations and scores.",
    },
  ];

  const setupChecklist = [
    "Connect Supabase DATABASE_URL and DIRECT_URL",
    "Run Prisma generate and migrate",
    "Create initial admin/editor accounts",
    "Build role-based dashboard routes",
  ];

  return (
    <main className="min-h-screen bg-red-950 px-6 py-8 text-yellow-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 px-5 py-4">
          <div className="flex items-center gap-3">
            <Image src="/cnu-logo.png" alt="Cebu Normal University logo" width={52} height={52} className="rounded-full border border-yellow-400/60" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-300">CNU OJS</p>
              <p className="text-sm text-yellow-100/80">Open Journal Systems Platform</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/journals"
              className="rounded-full border border-yellow-400/50 px-3 py-1.5 font-medium text-yellow-200 transition hover:bg-red-800"
            >
              Journals
            </Link>
            <Link
              href="/issues"
              className="rounded-full border border-yellow-400/50 px-3 py-1.5 font-medium text-yellow-200 transition hover:bg-red-800"
            >
              Issues
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-yellow-400/50 px-3 py-1.5 font-medium text-yellow-200 transition hover:bg-red-800"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-yellow-400 px-3 py-1.5 font-semibold text-red-950 transition hover:bg-yellow-300"
            >
              Register
            </Link>
          </nav>
        </header>

        <section className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-yellow-300">
            CNU OJS
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-yellow-50 sm:text-4xl">Open Journal System starter app</h1>
          <p className="max-w-2xl text-base leading-7 text-yellow-100/85">
            Built with Next.js App Router, Prisma ORM, and Supabase Postgres for managing journals,
            submissions, and peer review workflows.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {modules.map((module) => (
            <article
              key={module.title}
              className="rounded-2xl border border-yellow-500/40 bg-red-900/70 p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-yellow-100">{module.title}</h2>
              <p className="mt-2 text-sm leading-6 text-yellow-100/80">{module.description}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-yellow-500/40 bg-red-900/70 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-yellow-100">Setup checklist</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-yellow-100/85">
            {setupChecklist.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-yellow-400" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/login"
            className="rounded-full bg-yellow-400 px-4 py-2 font-semibold text-red-950 transition hover:bg-yellow-300"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-yellow-400/50 px-4 py-2 font-medium text-yellow-100 transition hover:bg-red-900"
          >
            Dashboard
          </Link>
          <Link
            href="/api/health"
            className="rounded-full border border-yellow-400/50 px-4 py-2 font-medium text-yellow-100 transition hover:bg-red-900"
          >
            API health endpoint
          </Link>
          <Link
            href="/journals"
            className="rounded-full border border-yellow-400/50 px-4 py-2 font-medium text-yellow-100 transition hover:bg-red-900"
          >
            Published journals
          </Link>
          <Link
            href="/issues"
            className="rounded-full border border-yellow-400/50 px-4 py-2 font-medium text-yellow-100 transition hover:bg-red-900"
          >
            Published issues
          </Link>
          <span className="text-yellow-100/75">Next step: connect auth and role-based dashboards.</span>
        </section>
      </div>
    </main>
  );
}
