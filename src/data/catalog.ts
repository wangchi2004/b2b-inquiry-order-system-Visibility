import "server-only";

import { readdir } from "node:fs/promises";
import path from "node:path";

export type CatalogFile = {
  name: string;
  extension: string;
  href: string;
};

const catalogDirectory = path.join(process.cwd(), "public", "catalog-files");

export async function getCatalogFiles(): Promise<CatalogFile[]> {
  try {
    const entries = await readdir(catalogDirectory, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
      .map((entry) => ({
        name: entry.name,
        extension: path.extname(entry.name).slice(1).toUpperCase() || "FILE",
        href: `/catalog-files/${encodeURIComponent(entry.name)}`
      }))
      .sort((left, right) =>
        left.name.localeCompare(right.name, undefined, {
          numeric: true,
          sensitivity: "base"
        })
      );
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}
