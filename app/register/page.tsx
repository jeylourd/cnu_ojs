import { hash } from "bcryptjs";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthTopHeader } from "@/components/auth/AuthTopHeader";
import { sendVerificationEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { createVerificationToken } from "@/lib/tokens";

type RegisterPageProps = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};

const errorMap: Record<string, string> = {
  EMAIL_EXISTS: "Email already registered.",
  PASSWORD_MISMATCH: "Passwords do not match.",
  INVALID_INPUT: "Please complete all required fields.",
  DEFAULT: "Unable to create account right now.",
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const success = resolvedSearchParams?.success;
  const errorCode = resolvedSearchParams?.error;
  const errorMessage = errorCode ? errorMap[errorCode] ?? errorMap.DEFAULT : null;

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <AuthTopHeader title="Create account" actionLabel="Sign in" actionHref="/login" />

        <div className="mx-auto w-full max-w-md rounded-2xl border border-yellow-500/50 bg-red-900 p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <Image src="/CNU-Logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">CNU OJS</p>
            <h1 className="text-2xl font-semibold text-yellow-50">Create account</h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-yellow-100/85">Register as an author to submit manuscripts.</p>

        {success ? (
          <p className="mt-4 rounded-lg border border-yellow-500/30 bg-red-800 px-3 py-2 text-sm text-yellow-100">
            Account created. Check your email and verify before logging in.
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

            const name = String(formData.get("name") ?? "").trim();
            const email = String(formData.get("email") ?? "").trim().toLowerCase();
            const password = String(formData.get("password") ?? "");
            const confirmPassword = String(formData.get("confirmPassword") ?? "");

            if (!name || !email || !password || password.length < 8) {
              redirect("/register?error=INVALID_INPUT");
            }

            if (password !== confirmPassword) {
              redirect("/register?error=PASSWORD_MISMATCH");
            }

            const existingUser = await prisma.user.findUnique({
              where: { email },
            });

            if (existingUser) {
              redirect("/register?error=EMAIL_EXISTS");
            }

            const passwordHash = await hash(password, 12);

            await prisma.user.create({
              data: {
                name,
                email,
                passwordHash,
                role: "AUTHOR",
              },
            });

            const token = await createVerificationToken(email, "verify", 1000 * 60 * 60 * 24);
            await sendVerificationEmail(email, token);

            redirect("/register?success=1");
          }}
        >
          <label className="block text-sm font-medium text-yellow-100">
            Full name
            <input
              type="text"
              name="name"
              required
              className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
              placeholder="Juan Dela Cruz"
            />
          </label>

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

          <label className="block text-sm font-medium text-yellow-100">
            Password
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
            Confirm password
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
            Register
          </button>
        </form>

        <p className="mt-4 text-sm text-yellow-100/85">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-yellow-300 underline">
            Sign in
          </Link>
        </p>
        </div>
      </div>
    </main>
  );
}
