import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { auth } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { prisma } from "@/lib/prisma";

export default async function NotificationsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAsRead(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    const notificationId = String(formData.get("notificationId") ?? "").trim();

    if (!notificationId) {
      return;
    }

    await prisma.notification.update({
      where: {
        id: notificationId,
        userId: currentSession.user.id,
      },
      data: {
        read: true,
      },
    });

    revalidatePath("/dashboard/notifications");
  }

  async function markAllAsRead() {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    await prisma.notification.updateMany({
      where: {
        userId: currentSession.user.id,
        read: false,
      },
      data: {
        read: true,
      },
    });

    revalidatePath("/dashboard/notifications");
  }

  async function deleteNotification(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    const notificationId = String(formData.get("notificationId") ?? "").trim();

    if (!notificationId) {
      return;
    }

    await prisma.notification.delete({
      where: {
        id: notificationId,
        userId: currentSession.user.id,
      },
    });

    revalidatePath("/dashboard/notifications");
  }

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100 lg:px-8">
      <div className="flex w-full flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Image
              src="/CNU-Logo.png"
              alt="Cebu Normal University logo"
              width={56}
              height={56}
              className="rounded-full border border-yellow-400/60"
            />
            <div>
              <h1 className="mb-1 text-2xl font-bold">Notifications</h1>
              <p className="text-yellow-400">
                {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <form action={markAllAsRead}>
              <button
                type="submit"
                className="rounded-lg bg-yellow-500 px-4 py-2 font-medium text-red-950 transition hover:bg-yellow-400"
              >
                Mark All as Read
              </button>
            </form>
          )}
        </header>

        <div className="flex flex-col gap-6 lg:flex-row">
          <DashboardSidebar role={session.user.role} currentPath="/dashboard/notifications" />

          <section className="flex-1 rounded-2xl border border-yellow-500/50 bg-red-900 p-6">
            {notifications.length === 0 ? (
              <div className="rounded-lg bg-red-800/50 p-8 text-center">
                <p className="text-lg text-yellow-400">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-lg border p-4 ${
                      notification.read
                        ? "border-yellow-900/30 bg-red-800/30"
                        : "border-yellow-500/50 bg-red-800/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="font-semibold text-yellow-300">
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="rounded bg-yellow-500 px-2 py-0.5 text-xs font-bold text-red-950">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="mb-2 text-sm text-yellow-100/80">
                          {notification.message}
                        </p>
                        <p className="text-xs text-yellow-500">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {notification.link && (
                          <Link
                            href={notification.link}
                            className="rounded bg-yellow-500 px-3 py-1.5 text-sm font-medium text-red-950 transition hover:bg-yellow-400"
                          >
                            View
                          </Link>
                        )}
                        {!notification.read && (
                          <form action={markAsRead}>
                            <input
                              type="hidden"
                              name="notificationId"
                              value={notification.id}
                            />
                            <button
                              type="submit"
                              className="rounded bg-yellow-700 px-3 py-1.5 text-sm font-medium text-yellow-100 transition hover:bg-yellow-600"
                            >
                              Mark Read
                            </button>
                          </form>
                        )}
                        <form action={deleteNotification}>
                          <input
                            type="hidden"
                            name="notificationId"
                            value={notification.id}
                          />
                          <button
                            type="submit"
                            className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-yellow-100 transition hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
