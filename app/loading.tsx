export default function Loading() {
  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-center justify-center">
        <div className="flex items-center gap-3 rounded-xl border border-yellow-500/40 bg-red-900/80 px-5 py-4 text-sm font-medium text-yellow-100">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-300/30 border-t-yellow-300" />
          <span>Loading page...</span>
        </div>
      </div>
    </main>
  );
}
