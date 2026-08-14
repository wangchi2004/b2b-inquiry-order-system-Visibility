"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  completeSampleFileUpload,
  deleteSampleFile,
  prepareSampleFileUpload
} from "@/app/admin/categories/actions";
import {
  MAX_SAMPLE_FILE_BYTES,
  SAMPLE_FILES_BUCKET
} from "@/lib/sampleFileNames";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type ManagedSampleFile = {
  name: string;
  extension: string;
  href: string;
  size: number | null;
};

export function SampleFileManager({
  password,
  files,
  returnCategoryId
}: {
  password: string;
  files: ManagedSampleFile[];
  returnCategoryId?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function uploadFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];

    if (!file) {
      setStatus("Please choose a file. / 请选择文件。");
      return;
    }

    if (file.size > MAX_SAMPLE_FILE_BYTES) {
      setStatus("File must be 50MB or smaller. / 文件不能超过 50MB。");
      return;
    }

    setUploading(true);
    setStatus("Uploading... / 正在上传……");

    try {
      const prepared = await prepareSampleFileUpload({
        password,
        fileName: file.name,
        fileSize: file.size
      });

      if (!prepared.ok) {
        setStatus(prepared.error);
        return;
      }

      const { error } = await createSupabaseBrowserClient()
        .storage
        .from(SAMPLE_FILES_BUCKET)
        .uploadToSignedUrl(prepared.path, prepared.token, file, {
          cacheControl: "3600",
          contentType: file.type || "application/octet-stream"
        });

      if (error) {
        setStatus(`Upload failed: ${error.message}`);
        return;
      }

      const completed = await completeSampleFileUpload({
        password,
        path: prepared.path
      });

      if (!completed.ok) {
        setStatus(completed.error);
        return;
      }

      if (inputRef.current) inputRef.current.value = "";
      setStatus("Uploaded successfully. / 上传成功。");
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Upload failed. / 上传失败。"
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">
          Sample Files / 样本文件
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Uploaded files appear automatically on the sample download page. Files
          with the same name are replaced. 上传后自动显示在样本下载页；同名文件会被替换。
        </p>
      </div>

      <form onSubmit={uploadFile} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          ref={inputRef}
          type="file"
          disabled={uploading}
          className="min-h-11 min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:font-semibold"
        />
        <button
          type="submit"
          disabled={uploading}
          className="h-11 rounded bg-slate-950 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Uploading... / 上传中" : "Upload / 上传文件"}
        </button>
      </form>
      <p className="mt-2 text-xs text-slate-500">Maximum 50MB / 单文件最大 50MB</p>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm text-slate-700">
        {status}
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        {files.length ? (
          <ul className="divide-y divide-slate-200">
            {files.map((file) => (
              <li
                key={file.name}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 px-1 text-[10px] font-bold text-slate-600">
                    {file.extension}
                  </span>
                  <div className="min-w-0">
                    <a
                      href={file.href}
                      className="break-all text-sm font-semibold text-blue-700 hover:underline"
                    >
                      {file.name}
                    </a>
                    {file.size !== null ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatFileSize(file.size)}
                      </p>
                    ) : null}
                  </div>
                </div>
                <form action={deleteSampleFile}>
                  <input type="hidden" name="password" value={password} />
                  <input type="hidden" name="file_path" value={file.name} />
                  <input
                    type="hidden"
                    name="return_category_id"
                    value={returnCategoryId ?? ""}
                  />
                  <button
                    type="submit"
                    onClick={(event) => {
                      if (
                        !window.confirm(
                          `Delete “${file.name}”?\n\n确认删除这个样本文件吗？`
                        )
                      ) {
                        event.preventDefault();
                      }
                    }}
                    className="h-9 rounded border border-red-300 px-4 text-xs font-semibold text-red-700"
                  >
                    Delete / 删除
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-8 text-center text-sm text-slate-500">
            No sample files yet. / 暂无样本文件。
          </p>
        )}
      </div>
    </section>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
