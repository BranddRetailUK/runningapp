import { createHash } from "node:crypto";

export const supportedImageTypes = ["image/png", "image/jpeg", "image/webp"];
export const defaultMaxUploadBytes = 12 * 1_024 * 1_024;

export function maxUploadBytes() {
  const configured = Number(process.env.MAX_UPLOAD_BYTES);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : defaultMaxUploadBytes;
}

export function validateScreenshotFile(file: { size: number; type: string }) {
  if (!supportedImageTypes.includes(file.type)) {
    return "Upload a PNG, JPEG, or WebP screenshot.";
  }

  if (file.size <= 0) {
    return "The selected screenshot is empty.";
  }

  if (file.size > maxUploadBytes()) {
    return `The screenshot must be smaller than ${Math.round(maxUploadBytes() / 1_024 / 1_024)} MB.`;
  }

  return null;
}

export function fingerprintImage(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}
