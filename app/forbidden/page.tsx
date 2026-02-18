export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Access forbidden</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          You don&apos;t have permission to access this resource.
        </p>
      </div>
    </main>
  );
}
