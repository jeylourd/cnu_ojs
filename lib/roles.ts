export const APP_ROLES = ["ADMIN", "EDITOR", "REVIEWER", "AUTHOR"] as const;

export type AppRole = (typeof APP_ROLES)[number];
