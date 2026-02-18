import { AuthError } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

const errorMap: Record<string, string> = {
  CredentialsSignin: "Invalid email or password.",
  EMAIL_NOT_VERIFIED: "Please verify your email first before signing in.",
  AccessDenied: "Access denied.",
  Default: "Unable to sign in. Please try again.",
};

type LoginPageProps = {
  searchParams?: Promise<{ error?: string; email?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorType = resolvedSearchParams?.error;
  const attemptedEmail = resolvedSearchParams?.email ?? "";
  const errorMessage = errorType ? errorMap[errorType] ?? errorMap.Default : null;

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Image src="/cnu-logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">CNU OJS</p>
              <h1 className="mt-1 text-xl font-semibold text-yellow-50">Sign in</h1>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/" className="rounded-lg border border-yellow-400/70 px-3 py-1.5 font-medium text-yellow-100 transition hover:bg-red-800">
              Home
            </Link>
            <Link href="/issues" className="rounded-lg border border-yellow-400/70 px-3 py-1.5 font-medium text-yellow-100 transition hover:bg-red-800">
              Published Issues
            </Link>
            <Link href="/register" className="rounded-lg bg-yellow-400 px-3 py-1.5 font-semibold text-red-950 transition hover:bg-yellow-300">
              Create account
            </Link>
          </nav>
        </header>

        <div className="mx-auto w-full max-w-md rounded-2xl border border-yellow-500/50 bg-red-900 p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <Image src="/cnu-logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">CNU OJS</p>
            <h1 className="text-2xl font-semibold text-yellow-50">Sign in</h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-yellow-100/85">
          Use your editor/admin account credentials.
        </p>

        {errorMessage ? (
          <p className="mt-4 rounded-lg border border-yellow-500/30 bg-red-800 px-3 py-2 text-sm text-yellow-100">
            {errorMessage}
          </p>
        ) : null}

        <form
          className="mt-6 space-y-4"
          action={async (formData) => {
            "use server";

            const email = String(formData.get("email") ?? "").trim().toLowerCase();
            const password = String(formData.get("password") ?? "");

            if (email) {
              const user = await prisma.user.findUnique({
                where: { email },
                select: {
                  emailVerified: true,
                },
              });

              if (user && !user.emailVerified) {
                redirect(`/login?error=EMAIL_NOT_VERIFIED&email=${encodeURIComponent(email)}`);
              }
            }

            try {
              await signIn("credentials", {
                email,
                password,
                redirectTo: "/dashboard",
              });
            } catch (error) {
              if (error instanceof AuthError) {
                redirect(`/login?error=${encodeURIComponent(error.type)}`);
              }

              throw error;
            }
          }}
        >
          <label className="block text-sm font-medium text-yellow-100">
            Email
            <input
              type="email"
              name="email"
              required
              className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 placeholder:text-yellow-100/50 focus:ring-2"
              placeholder="admin@cnu.edu"
            />
          </label>

          <label className="block text-sm font-medium text-yellow-100">
            Password
            <input
              type="password"
              name="password"
              required
              className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 placeholder:text-yellow-100/50 focus:ring-2"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
          >
            Sign in
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href="/register" className="font-medium text-yellow-300 underline">
            Create account
          </Link>
          <Link href="/forgot-password" className="font-medium text-yellow-300 underline">
            Forgot password?
          </Link>
          {errorType === "EMAIL_NOT_VERIFIED" ? (
            <Link
              href={`/resend-verification${attemptedEmail ? `?email=${encodeURIComponent(attemptedEmail)}` : ""}`}
              className="font-medium text-yellow-300 underline"
            >
              Resend verification email
            </Link>
          ) : null}
        </div>
        </div>
      </div>
    </main>
  );
}
