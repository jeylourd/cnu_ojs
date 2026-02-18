import Image from "next/image";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { consumeVerificationToken } from "@/lib/tokens";

type VerifyEmailPageProps = {
  searchParams?: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const token = String(resolvedSearchParams?.token ?? "").trim();

  let isSuccess = false;

  if (token) {
    const consumedToken = await consumeVerificationToken(token, "verify");

    if (consumedToken?.email) {
      await prisma.user.update({
        where: { email: consumedToken.email },
        data: { emailVerified: new Date() },
      });

      isSuccess = true;
    }
  }

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Image src="/cnu-logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">CNU OJS</p>
              <h1 className="mt-1 text-xl font-semibold text-yellow-50">Email verification</h1>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/" className="rounded-lg border border-yellow-400/70 px-3 py-1.5 font-medium text-yellow-100 transition hover:bg-red-800">
              Home
            </Link>
            <Link href="/issues" className="rounded-lg border border-yellow-400/70 px-3 py-1.5 font-medium text-yellow-100 transition hover:bg-red-800">
              Published Issues
            </Link>
            <Link href="/login" className="rounded-lg bg-yellow-400 px-3 py-1.5 font-semibold text-red-950 transition hover:bg-yellow-300">
              Sign in
            </Link>
          </nav>
        </header>

        <div className="mx-auto w-full max-w-md rounded-2xl border border-yellow-500/50 bg-red-900 p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <Image src="/cnu-logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">CNU OJS</p>
            <h1 className="text-2xl font-semibold text-yellow-50">Email verification</h1>
          </div>
        </div>

        {isSuccess ? (
          <p className="mt-4 rounded-lg border border-yellow-500/30 bg-red-800 px-3 py-2 text-sm text-yellow-100">
            Email verified successfully. You can now sign in.
          </p>
        ) : (
          <p className="mt-4 rounded-lg border border-yellow-500/30 bg-red-800 px-3 py-2 text-sm text-yellow-100">
            Verification link is invalid or expired.
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
          >
            Go to login
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
          >
            Register again
          </Link>
        </div>
        </div>
      </div>
    </main>
  );
}
