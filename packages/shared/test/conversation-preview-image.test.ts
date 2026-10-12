// Generated-image preview registration: an assistant response that merely names an image
// file must still be discoverable as a preview candidate, so the UI can show the image
// inline instead of only its path. See docs/specs/conversation-image-previews.md.
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildConversationPreviewArtifactCandidates,
  extractConversationPreviewFileReferences,
  getConversationPreviewFileType,
} from "../src/conversation-preview-artifacts.js";
import {
  decodeMarkdownArtifactImageSource,
  extractMarkdownArtifactImageRefs,
  rewriteMarkdownArtifactImageSources,
} from "../src/markdown-artifact-images.js";

const WORKSPACE = "/work/project";

test("image files are a recognized conversation preview type", () => {
  for (const path of ["out.png", "a.JPG", "b.jpeg", "c.gif", "d.webp", "e.avif", "f.svg"]) {
    const definition = getConversationPreviewFileType(`${WORKSPACE}/${path}`);
    assert.ok(definition, `${path} must be a preview type`);
    assert.equal(definition?.kind, "image");
    assert.equal(definition?.artifactType, "image");
  }
});

test("a bare image path in assistant text yields an image candidate", () => {
  const references = extractConversationPreviewFileReferences(
    "I generated the chart at `assets/chart.png`, please review it.",
    WORKSPACE,
  );
  const image = references.find((reference) => reference.kind === "image");
  assert.ok(image, "the image path must be extracted");
  assert.equal(image?.path, `${WORKSPACE}/assets/chart.png`);

  const candidates = buildConversationPreviewArtifactCandidates({
    assistantText: "I generated the chart at `assets/chart.png`, please review it.",
    productTurnId: "turn-1",
    workspacePath: WORKSPACE,
  });
  const candidate = candidates.find((entry) => entry.previewKind === "image");
  assert.ok(candidate, "an image candidate must be produced");
  assert.equal(candidate?.mimeType, "image/png");
  assert.equal(candidate?.artifactType, "image");
  assert.equal(candidate?.requiresFileChanges, false);
});

test("mesa-code-artifact image refs round-trip through rewrite and decode", () => {
  const ref = "mesa-code-artifact://session-1/abc";
  const markdown = `before\n![chart](${ref})\nafter`;
  const rewritten = rewriteMarkdownArtifactImageSources(markdown);
  const [rewrittenRef] = extractMarkdownArtifactImageRefs(markdown);
  assert.equal(rewrittenRef, ref);

  const prefix = "/__mesaCode_artifact_image__/";
  const source = rewritten.slice(rewritten.indexOf(prefix));
  const end = source.indexOf(")");
  assert.equal(decodeMarkdownArtifactImageSource(source.slice(0, end)), ref);
});

test("a mismatched artifact scheme is rejected", () => {
  const source = `/__mesaCode_artifact_image__/${encodeURIComponent("https://example.com/x.png")}`;
  assert.equal(decodeMarkdownArtifactImageSource(source), null);
});
