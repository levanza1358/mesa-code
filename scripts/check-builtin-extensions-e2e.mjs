import assert from "node:assert/strict";
import { mkdir, mkdtemp } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "packages/desktop/package.json"));
const { _electron } = require("playwright-core");
const base = join(root, ".quiet-studio-runtime", "builtin-checks");
await mkdir(base, { recursive: true });
const runtime = await mkdtemp(join(base, "extensions-"));
const home = join(runtime, "home");
await mkdir(home, { recursive: true });
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (key.startsWith("MESA_CODE_") || key.startsWith("MESA_")) delete env[key];
}
delete env.ELECTRON_RUN_AS_NODE;
Object.assign(env, {
  HOME: home,
  USERPROFILE: home,
  MESA_CODE_DATA_BASE_DIR: home,
  MESA_CODE_DESKTOP_HOME_DIR: home,
  MESA_CODE_DESKTOP_USER_DATA_DIR: join(runtime, "electron"),
  MESA_CODE_DESKTOP_SESSION_DATA_DIR: join(runtime, "electron", "session"),
  MESA_CODE_DESKTOP_USE_ELECTRON_DEFAULT_USER_DATA: "0",
  MESA_CODE_DISABLE_FIXED_REMOTE_DEBUGGING_PORT: "1",
  MESA_CODE_ENV: "production",
  ELECTRON_RENDERER_URL: "http://127.0.0.1:5174",
});
const app = await _electron.launch({
  executablePath: require("electron"),
  args: [join(root, "packages", "desktop")],
  cwd: join(root, "packages", "desktop"),
  env,
  timeout: 90_000,
});
try {
  const page = await app.firstWindow();
  page.setDefaultTimeout(90_000);
  await page.getByTestId("task-settings-button").click();
  await page.getByTestId("settings-section-nav-extensions").click();
  await page.getByRole("tab", { name: /^Plugins\s*14$/ }).waitFor({ state: "visible" });
  await page.getByTestId("plugin-settings-scope-trigger").click();
  await page.getByTestId("plugin-settings-scope-user-option").click();
  const skillsTab = page.getByRole("tab", { name: /^Skills/ });
  await skillsTab.click();
  await page
    .getByRole("button", { name: /refresh/i })
    .last()
    .click();
  await page.waitForFunction(
    () => {
      const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((element) =>
        element.textContent.trim().startsWith("Skills"),
      );
      return tab && /Skills\s*50\b/.test(tab.textContent);
    },
    undefined,
    { timeout: 30_000 },
  );
  assert.match(await skillsTab.innerText(), /Skills\s*50\b/);
  const panel = page.getByRole("tabpanel").filter({ visible: true });
  const skills = [
    "codebase-map",
    "debug-root-cause",
    "safe-refactor",
    "api-design",
    "regression-tests",
    "code-review",
    "security-review",
    "performance-profile",
    "accessible-ui",
    "responsive-layout",
    "theme-audit",
    "ui-interaction-tests",
    "csv-analysis",
    "spreadsheet-report",
    "sql-review",
    "data-quality",
    "technical-docs",
    "document-drafting",
    "presentation-outline",
    "research-brief",
    "task-breakdown",
    "release-checklist",
    "incident-summary",
    "automation-design",
    "control-browser",
    "web-gui-tester",
    "test-plan",
    "e2e-scenario",
    "flaky-test-triage",
    "test-data-fixtures",
    "readme-authoring",
    "api-reference-docs",
    "changelog-release-notes",
    "docs-site-structure",
    "schema-migration",
    "query-optimization",
    "data-modeling",
    "seed-fixtures",
    "mobile-layout",
    "native-permissions",
    "mobile-offline-sync",
    "mobile-release-checklist",
    "deployment-plan",
    "container-image-review",
    "observability-setup",
    "cost-review",
    "prompt-review",
    "tool-schema-design",
    "eval-harness",
    "agent-loop-design",
  ];
  for (const skill of skills)
    assert.equal(await panel.getByText(skill, { exact: true }).count(), 1, skill);
  await page.screenshot({ path: join(runtime, "extensions-skills.png"), fullPage: true });
  console.info(
    "Extensions User scope verified: 50 skills, including all 48 toolkit skills and Browser Use.",
  );
  console.info(`Screenshot: ${join(runtime, "extensions-skills.png")}`);
} catch (error) {
  for (const page of app.windows()) {
    console.info("Visible tabs:", await page.getByRole("tab").allTextContents());
    await page.screenshot({ path: join(runtime, "extensions-failure.png"), fullPage: true });
    console.info(`Failure screenshot: ${join(runtime, "extensions-failure.png")}`);
  }
  throw error;
} finally {
  await app.close();
}
