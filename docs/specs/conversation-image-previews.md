# Conversation Image Previews

**Status:** active  
**Owner:** shared preview registry and UI conversation maintainers  
**Authority:** contract  
**Scope:** generated still-image cards, workspace-scoped media reads, and artifact image references  
**Updated:** 2026-10-12 08:39 (local time)  
**Verification:** source-only documentation review; desktop/phone thumbnail and viewer checks were not run

Related: [Quiet Studio chat](quiet-studio.md), [Office reads](office-document-read.md).

## Problem

When the AI generates an image (a Bash/`write` side effect that lands as e.g. `out/chart.png`,
or a tool that produces an image file), the response only told the user the file **path**. The
message and file-summary surfaces rendered the path as text or a file link, and the automatic
assistant-preview-card pipeline explicitly **excluded** images:

- `packages/ui/src/lib/assistantFileReferences.ts` and
  `packages/shared/src/conversation-preview-artifacts.ts` registered Markdown, HTML, DOCX, XLSX,
  PPTX, PDF, and audio/video extensions — but not images.
- `conversationArtifactTypeSchema` already allowed `"image"`, but no producer/consumer routed a
  generated image to an inline preview.

A related latent defect: `packages/shared/src/markdown-artifact-images.ts` **produced** image refs
with the hyphenated scheme `mesa-code-artifact://` (the scheme the artifact store actually uses)
but its decoder only accepted the camelCase `mesaCode-artifact://`, so artifact-backed image
references could never resolve to a rendered image.

Users therefore had to open the file viewer manually to see a generated image. On the phone/LAN
web client this matters even more, because inline images must come from the Host (the phone has no
host filesystem access).

## Product rules

1. **A generated image is a preview type.** Still-image extensions (`.png`, `.jpg`, `.jpeg`,
   `.gif`, `.webp`, `.avif`, `.bmp`, `.svg`) are registered in the shared conversation-preview
   pipeline and in the renderer's assistant-file reference table, so a path mentioned in the final
   response becomes an image preview card.
2. **The image is shown inline, not only named.** An image preview card renders a **thumbnail**
   in the response; activating it opens the full-size image viewer. The card still shows the file
   name and an "Image" subtitle, and keeps the existing open actions.
3. **Bytes come from the Host, so it works on desktop and phone alike.** The thumbnail reads the
   image through the same file-read RPC the Markdown image uses
   (`fileService.readMediaPreview` → base64 → data URL), scoped to the card's workspace. It never
   depends on browser access to a host `file://` URL.
4. **Only real files preview.** The card is subject to the existing file-existence validation
   (`checkFilesExist`), so a path mentioned in prose that does not exist does not produce a
   phantom card. Images do not require a file-change patch (unlike Markdown/HTML), so a
   Bash-generated image that appears in the file changes is still previewed.
5. **Artifact-backed image refs render.** `mesa-code-artifact://…` references decode correctly
   (hyphenated scheme; the camelCase form is accepted for compatibility), so images referenced
   through the artifact store display instead of silently failing.
6. **No change to the durable attachment/authorization boundary.** This adds a preview *kind*; it
   does not loosen session/ref authorization for assistant Markdown image refs.

## State owner

- `packages/shared/src/media-preview.ts` owns the `IMAGE_PREVIEW_FORMATS` table (extension →
  media type) shared by the pipeline.
- `packages/shared/src/conversation-preview-artifacts.ts` owns the shared preview-type registry
  and the path-extraction regexes; image is a `ConversationPreviewFileKind`.
- `packages/ui/src/lib/assistantFileReferences.ts` owns the renderer's assistant-file reference
  table (kind, subtitle id, path regexes).
- `packages/ui/src/AssistantPreviewCards.tsx` owns the card rendering; it renders the image
  thumbnail and the full-size viewer.
- `packages/shared/src/markdown-artifact-images.ts` owns artifact-image ref encode/decode.
- `conversationArtifactTypeSchema` (`packages/shared/src/mesa-code-protocol-v4/rows.ts`) already
  owns the `"image"` artifact type; no protocol change is made.

## Source boundary and review procedure

The thumbnail in `AssistantPreviewCards.tsx` resolves `fileService` through
`useWorkspaceServices(workspacePath, workspaceRemoteSessionId, workspaceIdentity)`.
Both file-existence validation and media reads must keep this scope; matching a remote
file by path alone is not sufficient. An image read failure currently leaves the file
card/open actions available with a fallback file icon, not a successful thumbnail.

```text
assistant path -> shared/UI candidate registry -> workspace-scoped existence check
  -> visible image card -> workspace-scoped readMediaPreview -> base64 data URL
  -> thumbnail activation -> ImagePreviewDialog using the same bytes
artifact Markdown ref -> authorized artifact lookup -> image renderer (separate path)
```

For a future runtime check, use an isolated desktop profile and phone/web attachment
to the same Host. Check an existing image, a missing path, a denied/unreadable file,
and identical paths in two remote identities. Confirm the thumbnail and viewer,
not just the card title. Do not treat the artifact decoder unit test as proof of
artifact authorization or remote delivery.

## Acceptance scenarios

1. A response that mentions a generated image path (for example `out/chart.png`) shows an image
   preview card with a thumbnail; the file name and "Image" subtitle are visible.
2. Clicking the thumbnail opens the full-size image viewer.
3. A mentioned path that does not exist does not produce a card.
4. An image referenced as `mesa-code-artifact://…` in a `![…](…)` Markdown image renders.
5. On the phone/LAN web client the thumbnail loads from the Host (RPC bytes), not from a host
   file URL.
6. Markdown/HTML/Office/PDF/audio/video preview behavior is unchanged.

## Verification

- After implementation changes, run `pnpm typecheck`, `pnpm lint`, and `pnpm architecture:check --changed`; record actual outcomes in the [verification log](../verification-log.md). These commands were not run for this documentation-only review.
- Focused unit tests: shared pipeline (`packages/shared/test/conversation-preview-image.test.ts`)
  covers image type registration, candidate extraction from a bare path, artifact round-trip, and
  scheme mismatch rejection; the renderer (`packages/ui/test/assistant-preview-streaming.test.ts`)
  covers that a generated image path yields an image preview card.
- The rendered thumbnail in the running app (desktop and phone) and the full-size viewer are
  runtime results reported separately; they are not asserted from the stylesheet or source alone.
