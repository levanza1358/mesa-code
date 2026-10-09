// Regression coverage for the compact timeline marker in ConversationRowView.
//
// The marker builds its message ID dynamically from the closed protocol enum in
// packages/shared/src/mesa-code-protocol-v4/rows.ts:
//   type="compact", origin ∈ {manual, auto}, status ∈ {running, success, failed, noop, cancelled}
// and appends a fixed suffix per state. The catalogs are typed as Record<string, string>,
// so a missing suffix is NOT caught by the compiler - react-intl then renders the raw ID.
// That is exactly how "chat.contextCompaction.completedAuto" (the auto-compaction success
// state) reached the UI. This test pins every ID the renderer can emit to both catalogs.
import assert from "node:assert/strict";
import test from "node:test";
import enUS from "../src/i18n/locales/en-US.js";
import zhCN from "../src/i18n/locales/zh-CN.js";

const catalogs = {
  "en-US": enUS,
  "zh-CN": zhCN,
};

const SCOPE = "chat.contextCompaction";

// Suffix selected by the renderer for each (status, origin) pair; mirrors the switch in
// TimelineMarkerRowView's `case "compact"`.
const suffixes = [
  "started", // status === "running"
  "skipped", // status === "noop"
  "interrupted", // status === "cancelled"
  "failed", // status === "failed"
  "completed", // success, origin === "manual"
  "completedAuto", // success, origin === "auto"
  "retry", // retry affordance on failed/interrupted markers
];

test("every compact marker message ID the renderer can emit is localized", () => {
  for (const [locale, catalog] of Object.entries(catalogs)) {
    for (const suffix of suffixes) {
      const id = `${SCOPE}.${suffix}`;
      const translation = catalog[id];
      assert.equal(typeof translation, "string", `${locale} must define ${id}`);
      assert.notEqual(translation, id, `${locale} must not render the raw ID ${id}`);
    }
  }
});
