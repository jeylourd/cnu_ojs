import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

type MediaPageProps = {
  searchParams?: { uploaded?: string; uploadError?: string };
};

async function saveMediaFile(file: File) {
  const fileName = `${Date.now()}-${randomUUID()}${path.extname(file.name || "")}`;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (blobToken) {
    try {
      const blob = await put(`media/${fileName}`, file, {
        access: "public",
        addRandomSuffix: false,
        token: blobToken,
      });

      return { ok: true, url: blob.url };
    } catch (err) {
      try {
        // eslint-disable-next-line no-console
        console.error("saveMediaFile: @vercel/blob.put failed", err);
      } catch (_) {}

      return { ok: false, code: "UPLOAD_FAILED" };
    }
  }

  // local fallback: write to public/uploads/media
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "media");
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, fileName);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, fileBuffer);

    return { ok: true, url: `/uploads/media/${fileName}` };
  } catch (err) {
    try {
      // eslint-disable-next-line no-console
      console.error("saveMediaFile: failed to write file", err);
    } catch (_) {}

    return { ok: false, code: "UPLOAD_FAILED" };
  }
}

export default async function MediaPage({ searchParams }: MediaPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  async function uploadMedia(formData: FormData) {
    "use server";

    const current = await auth();
    if (!current?.user) redirect("/login");

    const file = formData.get("mediaFile");
    if (!(file instanceof File) || file.size === 0) {
      redirect("/dashboard/media?uploadError=NO_FILE");
    }

    const result = await saveMediaFile(file as File);
    if (!result.ok) {
      redirect(`/dashboard/media?uploadError=${result.code}`);
    }

    redirect(`/dashboard/media?uploaded=${encodeURIComponent(result.url)}`);
  }

  // list local files under public/uploads/media (works when using local fallback)
  let files: string[] = [];
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "media");
    const entries = await readdir(uploadsDir);
    files = entries.map((f) => `/uploads/media/${f}`);
  } catch {
    // ignore — directory might not exist or not accessible in production when using blob
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold">Media Library</h1>

        {searchParams?.uploadError ? (
          <div className="mt-4 rounded-md bg-red-100 p-3 text-red-800">Upload failed: {searchParams.uploadError}</div>
        ) : null}

        {searchParams?.uploaded ? (
          <div className="mt-4 rounded-md bg-green-100 p-3 text-green-800">
            Uploaded: <a className="underline" href={searchParams.uploaded}>{searchParams.uploaded}</a>
          </div>
        ) : null}

        <section className="mt-6 rounded-lg border p-4">
          <form action={uploadMedia} encType="multipart/form-data" className="flex gap-3">
            <input type="file" name="mediaFile" className="flex-1" />
            <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Upload</button>
          </form>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">Local files</h2>
          {files.length === 0 ? (
            <p className="text-sm text-gray-600">No local files found.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {files.map((f) => (
                <li key={f} className="flex items-center justify-between rounded border p-2">
                  <a href={f} className="truncate max-w-[80%] text-blue-600 underline">{f}</a>
                  <a href={f} download className="text-sm text-gray-600">Download</a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
