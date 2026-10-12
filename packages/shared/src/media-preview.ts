/** Assistant/workspace media preview formats shared by renderer and Host. */
export type MediaPreviewKind = "audio" | "video";

export interface MediaPreviewFormat {
  extension: string;
  kind: MediaPreviewKind;
  mediaType: string;
}

export const MEDIA_PREVIEW_FORMATS: readonly MediaPreviewFormat[] = [
  { extension: ".mp4", kind: "video", mediaType: "video/mp4" },
  { extension: ".mov", kind: "video", mediaType: "video/quicktime" },
  { extension: ".webm", kind: "video", mediaType: "video/webm" },
  { extension: ".m4v", kind: "video", mediaType: "video/x-m4v" },
  { extension: ".mp3", kind: "audio", mediaType: "audio/mpeg" },
  { extension: ".wav", kind: "audio", mediaType: "audio/wav" },
  { extension: ".m4a", kind: "audio", mediaType: "audio/mp4" },
  { extension: ".ogg", kind: "audio", mediaType: "audio/ogg" },
  { extension: ".opus", kind: "audio", mediaType: "audio/opus" },
  { extension: ".flac", kind: "audio", mediaType: "audio/flac" },
  { extension: ".weba", kind: "audio", mediaType: "audio/webm" },
];

export function getMediaPreviewFormat(path: string): MediaPreviewFormat | null {
  const normalizedPath = path.replace(/\\/g, "/").toLowerCase();
  return MEDIA_PREVIEW_FORMATS.find(({ extension }) => normalizedPath.endsWith(extension)) ?? null;
}

/** Still-image formats an assistant response can preview inline. */
export interface ImagePreviewFormat {
  extension: string;
  mediaType: string;
}

export const IMAGE_PREVIEW_FORMATS: readonly ImagePreviewFormat[] = [
  { extension: ".png", mediaType: "image/png" },
  { extension: ".jpg", mediaType: "image/jpeg" },
  { extension: ".jpeg", mediaType: "image/jpeg" },
  { extension: ".gif", mediaType: "image/gif" },
  { extension: ".webp", mediaType: "image/webp" },
  { extension: ".avif", mediaType: "image/avif" },
  { extension: ".bmp", mediaType: "image/bmp" },
  { extension: ".svg", mediaType: "image/svg+xml" },
];

export function getImagePreviewFormat(path: string): ImagePreviewFormat | null {
  const normalizedPath = path.replace(/\\/g, "/").toLowerCase();
  return IMAGE_PREVIEW_FORMATS.find(({ extension }) => normalizedPath.endsWith(extension)) ?? null;
}
