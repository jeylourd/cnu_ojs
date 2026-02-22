import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return NextResponse.json({ ok: false, error: "BLOB_READ_WRITE_TOKEN not set" }, { status: 400 });
  }

  try {
    const fileName = `token-test/${Date.now()}-${randomUUID()}.txt`;

    // Upload a very small test blob to verify the token. This leaves a tiny test file in your blob storage.
    const blob = await put(fileName, new Blob(["ok"]), {
      access: "private",
      addRandomSuffix: false,
      token,
    });

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (err) {
    try {
      // eslint-disable-next-line no-console
      console.error("/api/blob-test error:", err);
    } catch (_) {}

    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
