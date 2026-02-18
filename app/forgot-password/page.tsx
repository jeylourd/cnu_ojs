import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { sendResetPasswordEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { createVerificationToken } from "@/lib/tokens";

type ForgotPasswordPageProps = {
  searchParams?: Promise<{ success?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isSuccess = resolvedSearchParams?.success === "1";

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Image src="/cnu-logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">CNU OJS</p>
              <h1 className="mt-1 text-xl font-semibold text-yellow-50">Forgot password</h1>
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
            <h1 className="text-2xl font-semibold text-yellow-50">Forgot password</h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-yellow-100/85">Enter your email to receive a reset link.</p>

        {isSuccess ? (
          <p className="mt-4 rounded-lg border border-yellow-500/30 bg-red-800 px-3 py-2 text-sm text-yellow-100">
            If your account exists, a reset email has been sent.
          </p>
        ) : null}

        <form
          className="mt-6 space-y-4"
          action={async (formData) => {
            "use server";

            const email = String(formData.get("email") ?? "").trim().toLowerCase();

            if (!email) {
              redirect("/forgot-password?success=1");
            }

            const user = await prisma.user.findUnique({
              where: { email },
              select: {
                email: true,
              },
            });

            if (user) {
              const token = await createVerificationToken(email, "reset", 1000 * 60 * 30);
              await sendResetPasswordEmail(email, token);
            }

            redirect("/forgot-password?success=1");
          }}
        >
          <label className="block text-sm font-medium text-yellow-100">
            Email
            <input
              type="email"
              name="email"
              required
              className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
              placeholder="author@cnu.edu.ph"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
          >
            Send reset link
          </button>
        </form>

        <p className="mt-4 text-sm text-yellow-100/85">
          Back to{" "}
          <Link href="/login" className="font-medium text-yellow-300 underline">
            login
          </Link>
        </p>
        </div>
      </div>
    </main>
  );
}
