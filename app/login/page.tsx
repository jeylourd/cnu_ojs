import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";

const errorMap: Record<string, string> = {
  CredentialsSignin: "Invalid email or password.",
  AccessDenied: "Access denied.",
  Default: "Unable to sign in. Please try again.",
};

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorType = resolvedSearchParams?.error;
  const errorMessage = errorType ? errorMap[errorType] ?? errorMap.Default : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-10 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Sign in to CNU OJS</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Use your editor/admin account credentials.
        </p>

        {errorMessage ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {errorMessage}
          </p>
        ) : null}

        <form
          className="mt-6 space-y-4"
          action={async (formData) => {
            "use server";

            const email = String(formData.get("email") ?? "");
            const password = String(formData.get("password") ?? "");

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
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email
            <input
              type="email"
              name="email"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="admin@cnu.edu"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Password
            <input
              type="password"
              name="password"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
