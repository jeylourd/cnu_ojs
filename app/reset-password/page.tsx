import { hash } from "bcryptjs";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthTopHeader } from "@/components/auth/AuthTopHeader";
import { prisma } from "@/lib/prisma";
import { consumeVerificationToken } from "@/lib/tokens";

type ResetPasswordPageProps = {
  searchParams?: Promise<{ token?: string; error?: string; success?: string }>;
};

const errorMap: Record<string, string> = {
  INVALID_TOKEN: "Reset token is invalid or expired.",
  PASSWORD_MISMATCH: "Passwords do not match.",
  INVALID_PASSWORD: "Password must be at least 8 characters.",
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const token = String(resolvedSearchParams?.token ?? "").trim();
  const success = resolvedSearchParams?.success === "1";
  const errorCode = resolvedSearchParams?.error;
  const errorMessage = errorCode ? errorMap[errorCode] ?? errorMap.INVALID_TOKEN : null;

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <AuthTopHeader title="Reset password" actionLabel="Sign in" actionHref="/login" />

        <div className="mx-auto w-full max-w-md rounded-2xl border border-yellow-500/50 bg-red-900 p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <Image src="/cnu-logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">CNU OJS</p>
            <h1 className="text-2xl font-semibold text-yellow-50">Reset password</h1>
          </div>
        </div>

        {success ? (
          <p className="mt-4 rounded-lg border border-yellow-500/30 bg-red-800 px-3 py-2 text-sm text-yellow-100">
            Password reset complete. You can now sign in.
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-4 rounded-lg border border-yellow-500/30 bg-red-800 px-3 py-2 text-sm text-yellow-100">
            {errorMessage}
          </p>
        ) : null}

        <form
          className="mt-6 space-y-4"
          action={async (formData) => {
            "use server";

            const resetToken = String(formData.get("token") ?? "").trim();
            const password = String(formData.get("password") ?? "");
            const confirmPassword = String(formData.get("confirmPassword") ?? "");

            if (password.length < 8) {
              redirect(`/reset-password?token=${encodeURIComponent(resetToken)}&error=INVALID_PASSWORD`);
            }

            if (password !== confirmPassword) {
              redirect(`/reset-password?token=${encodeURIComponent(resetToken)}&error=PASSWORD_MISMATCH`);
            }

            const consumedToken = await consumeVerificationToken(resetToken, "reset");

            if (!consumedToken?.email) {
              redirect("/reset-password?error=INVALID_TOKEN");
            }

            const passwordHash = await hash(password, 12);

            await prisma.user.update({
              where: { email: consumedToken.email },
              data: {
                passwordHash,
              },
            });

            redirect("/reset-password?success=1");
          }}
        >
          <input type="hidden" name="token" value={token} />

          <label className="block text-sm font-medium text-yellow-100">
            New password
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
              placeholder="At least 8 characters"
            />
          </label>

          <label className="block text-sm font-medium text-yellow-100">
            Confirm new password
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={8}
              className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
          >
            Update password
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
