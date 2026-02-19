import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthTopHeader } from "@/components/auth/AuthTopHeader";
import { sendVerificationEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { createVerificationToken } from "@/lib/tokens";

type ResendVerificationPageProps = {
  searchParams?: Promise<{ success?: string; email?: string }>;
};

export default async function ResendVerificationPage({ searchParams }: ResendVerificationPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isSuccess = resolvedSearchParams?.success === "1";
  const emailFromQuery = String(resolvedSearchParams?.email ?? "").trim().toLowerCase();

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <AuthTopHeader title="Resend verification" actionLabel="Sign in" actionHref="/login" />

        <div className="mx-auto w-full max-w-md rounded-2xl border border-yellow-500/50 bg-red-900 p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <Image src="/CNU-Logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">CNU OJS</p>
            <h1 className="text-2xl font-semibold text-yellow-50">Resend verification</h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-yellow-100/85">
          Enter your account email and we&apos;ll send another verification link.
        </p>

        {isSuccess ? (
          <p className="mt-4 rounded-lg border border-yellow-500/30 bg-red-800 px-3 py-2 text-sm text-yellow-100">
            If your account is unverified, a new verification link has been sent.
          </p>
        ) : null}

        <form
          className="mt-6 space-y-4"
          action={async (formData) => {
            "use server";

            const email = String(formData.get("email") ?? "").trim().toLowerCase();

            if (!email) {
              redirect("/resend-verification?success=1");
            }

            const user = await prisma.user.findUnique({
              where: { email },
              select: {
                email: true,
                emailVerified: true,
              },
            });

            if (user && !user.emailVerified) {
              const token = await createVerificationToken(email, "verify", 1000 * 60 * 60 * 24);
              await sendVerificationEmail(email, token);
            }

            redirect(`/resend-verification?success=1&email=${encodeURIComponent(email)}`);
          }}
        >
          <label className="block text-sm font-medium text-yellow-100">
            Email
            <input
              type="email"
              name="email"
              required
              defaultValue={emailFromQuery}
              className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
              placeholder="author@cnu.edu.ph"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
          >
            Resend verification email
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href="/login" className="font-medium text-yellow-300 underline">
            Back to login
          </Link>
          <Link href="/register" className="font-medium text-yellow-300 underline">
            Create account
          </Link>
        </div>
        </div>
      </div>
    </main>
  );
}
