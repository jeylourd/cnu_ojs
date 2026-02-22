import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CreateNotificationParams = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
};

export async function createNotification(params: CreateNotificationParams) {
  return await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
    },
  });
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  return await prisma.notification.update({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      read: true,
    },
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  return await prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
    },
  });
}

export async function getUnreadCount(userId: string) {
  return await prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });
}

export async function getUserNotifications(userId: string, limit = 50) {
  return await prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}
