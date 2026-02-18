import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        ok: true,
        service: "cnu-ojs",
        database: "connected",
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "cnu-ojs",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
