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
    "Connect Vercel Postgres environment variables",
    "Run Prisma generate and migrate",
    "Create initial admin/editor accounts",
    "Build role-based dashboard routes",
  ];

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            CNU OJS
          </p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Open Journal System starter app</h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
            Built with Next.js App Router, Prisma ORM, and Vercel Postgres for managing journals,
            submissions, and peer review workflows.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {modules.map((module) => (
            <article
              key={module.title}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h2 className="text-lg font-semibold">{module.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{module.description}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-semibold">Setup checklist</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {setupChecklist.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-zinc-500" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-wrap items-center gap-3 text-sm">
          <a
            href="/login"
            className="rounded-full bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Sign in
          </a>
          <a
            href="/dashboard"
            className="rounded-full border border-zinc-300 px-4 py-2 font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Dashboard
          </a>
          <a
            href="/api/health"
            className="rounded-full border border-zinc-300 px-4 py-2 font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            API health endpoint
          </a>
          <span className="text-zinc-500 dark:text-zinc-400">Next step: connect auth and role-based dashboards.</span>
        </section>
      </div>
    </main>
  );
}
