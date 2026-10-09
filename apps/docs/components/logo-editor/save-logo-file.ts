/**
 * @name saveLogoFile
 * @description Downloads a generated logo asset or its component code and releases the object URL.
 * @example saveLogoFile(blob, "custom-drop.tsx");
 */
export function saveLogoFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
