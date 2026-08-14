export const SAMPLE_FILES_BUCKET = "sample-files";
export const MAX_SAMPLE_FILE_BYTES = 50 * 1024 * 1024;

export function sanitizeSampleFileName(value: string) {
  const originalName = value.normalize("NFKC").split(/[\\/]/).pop() ?? "";
  const withoutControlCharacters = Array.from(originalName)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("");

  return withoutControlCharacters
    .replace(/[#?%]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 180)
    .trim();
}

export function isSafeSampleFileName(value: string) {
  return Boolean(value) && sanitizeSampleFileName(value) === value;
}
