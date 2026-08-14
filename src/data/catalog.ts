import "server-only";

import path from "node:path";
import { SAMPLE_FILES_BUCKET } from "@/lib/sampleFileNames";
import { createSupabaseAdminClient } from "@/lib/supabase";

export type CatalogFile = {
  name: string;
  extension: string;
  href: string;
  size: number | null;
  updatedAt: string | null;
};

export async function getCatalogFiles(): Promise<CatalogFile[]> {
  const supabase = createSupabaseAdminClient();
  const bucket = supabase.storage.from(SAMPLE_FILES_BUCKET);
  const { data, error } = await bucket.list("", {
    limit: 1000,
    offset: 0,
    sortBy: { column: "name", order: "asc" }
  });

  if (error) {
    throw new Error(`Sample files failed to load: ${error.message}`);
  }

  return data
    .filter((file) => Boolean(file.id) && !file.name.startsWith("."))
    .map((file) => ({
      name: file.name,
      extension: path.extname(file.name).slice(1).toUpperCase() || "FILE",
      href: bucket.getPublicUrl(file.name, { download: file.name }).data.publicUrl,
      size: readFileSize(file.metadata),
      updatedAt: file.updated_at ?? null
    }));
}

function readFileSize(metadata: Record<string, unknown> | null | undefined) {
  const size = metadata?.size;
  return typeof size === "number" && Number.isFinite(size) ? size : null;
}
