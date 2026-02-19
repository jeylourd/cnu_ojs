import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { PaginationNav } from "@/components/ui/PaginationNav";
import { APP_ROLES, AppRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type UserRoleManagementPageProps = {
  searchParams?: Promise<{
    q?: string;
    role?: string;
    verified?: string;
    page?: string;
  }>;
};

export default async function UserRoleManagementPage({ searchParams }: UserRoleManagementPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/forbidden");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = String(resolvedSearchParams?.q ?? "").trim();

  const selectedRole = APP_ROLES.includes(String(resolvedSearchParams?.role ?? "") as AppRole)
    ? (String(resolvedSearchParams?.role) as AppRole)
    : "ALL";

  const selectedVerification =
    resolvedSearchParams?.verified === "VERIFIED" || resolvedSearchParams?.verified === "PENDING"
      ? resolvedSearchParams.verified
      : "ALL";

  const requestedPage = Number.parseInt(String(resolvedSearchParams?.page ?? "1"), 10);
  const page = Number.isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage;
  const pageSize = 10;

  const where: Prisma.UserWhereInput = {};

  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
    ];
  }

  if (selectedRole !== "ALL") {
    where.role = selectedRole;
  }

  if (selectedVerification === "VERIFIED") {
    where.emailVerified = { not: null };
  } else if (selectedVerification === "PENDING") {
    where.emailVerified = null;
  }

  const totalUsers = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const safePage = Math.min(page, totalPages);

  const users = await prisma.user.findMany({
    where,
    include: {
      _count: {
        select: {
          submissions: true,
          reviews: true,
          managedJournals: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  });

  const buildUsersLink = (nextPage: number) => {
    const params = new URLSearchParams();
    if (query) {
      params.set("q", query);
    }
    if (selectedRole !== "ALL") {
      params.set("role", selectedRole);
    }
    if (selectedVerification !== "ALL") {
      params.set("verified", selectedVerification);
    }
    params.set("page", String(nextPage));
    return `/dashboard/users?${params.toString()}`;
  };

  async function updateUserRole(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (currentSession.user.role !== "ADMIN") {
      redirect("/forbidden");
    }

    const userId = String(formData.get("userId") ?? "").trim();
    const nextRole = String(formData.get("role") ?? "").trim() as AppRole;

    if (!userId || !APP_ROLES.includes(nextRole)) {
      return;
    }

    if (userId === currentSession.user.id) {
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: nextRole },
    });

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard");
  }

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100 lg:px-8">
      <div className="flex w-full flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Image src="/CNU-Logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Admin module</p>
              <h1 className="mt-2 text-2xl font-semibold text-yellow-50">Manage users and role assignments</h1>
              <p className="mt-2 text-sm text-yellow-100/85">Update platform user roles and monitor account verification status.</p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
          >
            Back to dashboard
          </Link>
        </header>

        <section className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <DashboardSidebar role={session.user.role} />

          <div>
            <section className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-yellow-50">Users ({totalUsers})</h2>

          <form className="mt-4 grid gap-3 rounded-xl border border-yellow-500/25 bg-red-800/60 p-4 sm:grid-cols-4" method="get">
            <input type="hidden" name="page" value="1" />
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-yellow-200/85 sm:col-span-2">
              Search name/email
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search users"
                className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm normal-case tracking-normal text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
              />
            </label>

            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-yellow-200/85">
              Role
              <select
                name="role"
                defaultValue={selectedRole}
                className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm normal-case tracking-normal text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
              >
                <option value="ALL">All roles</option>
                {APP_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-yellow-200/85">
              Verification
              <select
                name="verified"
                defaultValue={selectedVerification}
                className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm normal-case tracking-normal text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
              >
                <option value="ALL">All</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING">Pending</option>
              </select>
            </label>

            <div className="sm:col-span-4 flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-red-950 transition hover:bg-yellow-300"
              >
                Apply filters
              </button>
              <Link
                href="/dashboard/users"
                className="rounded-lg border border-yellow-400/70 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
              >
                Reset
              </Link>
            </div>
          </form>

          {totalUsers === 0 ? (
            <p className="mt-4 text-sm text-yellow-100/85">No users found for the selected filters.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-yellow-500/40 text-left">
                      <th className="py-2 pr-4 font-medium">Name</th>
                      <th className="py-2 pr-4 font-medium">Email</th>
                      <th className="py-2 pr-4 font-medium">Current role</th>
                      <th className="py-2 pr-4 font-medium">Verified</th>
                      <th className="py-2 pr-4 font-medium">Activity</th>
                      <th className="py-2 pr-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const isCurrentAdmin = user.id === session.user.id;

                      return (
                        <tr key={user.id} className="border-b border-yellow-500/20 align-top">
                          <td className="py-2 pr-4 font-medium">{user.name}</td>
                          <td className="py-2 pr-4 text-yellow-100/85">{user.email}</td>
                          <td className="py-2 pr-4">{user.role}</td>
                          <td className="py-2 pr-4">{user.emailVerified ? "Verified" : "Pending"}</td>
                          <td className="py-2 pr-4 text-xs text-yellow-200/80">
                            {user._count.submissions} submissions · {user._count.reviews} reviews · {user._count.managedJournals} journals
                          </td>
                          <td className="py-2 pr-4">
                            <form action={updateUserRole} className="flex items-center gap-2">
                              <input type="hidden" name="userId" value={user.id} />
                              <select
                                name="role"
                                defaultValue={user.role}
                                disabled={isCurrentAdmin}
                                className="rounded-lg border border-yellow-500/40 bg-red-950 px-2 py-1.5 text-xs text-yellow-100 outline-none ring-yellow-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {APP_ROLES.map((role) => (
                                  <option key={role} value={role}>
                                    {role}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="submit"
                                disabled={isCurrentAdmin}
                                className="rounded-lg border border-yellow-400/70 px-2.5 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Save
                              </button>
                            </form>
                            {isCurrentAdmin ? (
                              <p className="mt-1 text-xs text-yellow-200/80">Your own role is locked.</p>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-yellow-200/85">
                <p>
                  Page {safePage} of {totalPages}
                </p>
                <PaginationNav currentPage={safePage} totalPages={totalPages} buildHref={buildUsersLink} />
              </div>
            </div>
          )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
