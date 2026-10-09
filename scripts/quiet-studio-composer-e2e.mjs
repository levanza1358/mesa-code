import assert from "node:assert/strict";
import { mkdir, mkdtemp } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "packages/desktop/package.json"));
const { _electron } = require("playwright-core");
const output = join(root, ".quiet-studio-runtime", "composer-e2e");
await mkdir(output, { recursive: true });
const runtime = await mkdtemp(join(output, "run-"));
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
  assert.equal(await app.evaluate(({ app }) => app.getName()), "Mesa Code");
  const page = await app.firstWindow();
  page.setDefaultTimeout(90_000);
  const editor = page.locator(".quiet-studio-composer-editor").first();
  await editor.waitFor({ state: "visible" });
  const input = editor.locator('[contenteditable="true"]');
  await input.fill("Layout check draft");
  assert.equal(await input.innerText(), "Layout check draft");
  const project = editor.locator("[data-composer-project]");
  assert.equal(await project.count(), 1);
  assert.equal((await project.locator("button").count()) > 0, true);
  await project.locator("button").first().click();
  await page.getByRole("menu").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await page.getByTestId("chat-mode-select-trigger").click();
  await page.getByRole("menu").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await input.focus();

  const composer = page.locator(".chat-composer-region").first();
  const guidance = composer.locator(
    '[data-error-code="model_config_missing"], [data-error-code="MODEL_CONFIG_MISSING"], [data-error-code="ModelConfigMissing"]',
  );
  await guidance.waitFor({ state: "visible" });
  assert.equal(
    await guidance.evaluate((element) => {
      const surface = element
        .closest(".chat-composer-region")
        .querySelector(".chat-composer-input-surface");
      return (
        element.getBoundingClientRect().top >= surface.getBoundingClientRect().bottom &&
        getComputedStyle(element).borderTopWidth === "0px"
      );
    }),
    true,
    "Missing-model guidance must be borderless and below composer",
  );

  for (const width of [672, 340]) {
    await composer.evaluate((element, width) => {
      element.style.width = `${width}px`;
      element.style.maxWidth = "100%";
    }, width);
    await page.waitForFunction((width) => {
      const editor = document.querySelector(".chat-composer-region");
      return editor && Math.abs(editor.getBoundingClientRect().width - width) <= 1;
    }, width);
    const layout = await editor.evaluate((element) => {
      const surface = element.closest(".chat-composer-input-surface");
      const toolbar = element.querySelector('[class~="group/toolbar"]');
      const project = element.querySelector("[data-composer-project]");
      const input = element.querySelector('[contenteditable="true"]');
      const style = getComputedStyle(element);
      return {
        editorBorder: style.borderTopWidth,
        surfaceBorder: getComputedStyle(surface).borderTopWidth,
        overflow: element.scrollWidth > element.clientWidth + 1,
        controlsFit: Array.from(toolbar.querySelectorAll("button")).every((button) => {
          const rect = button.getBoundingClientRect();
          const bounds = element.getBoundingClientRect();
          return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1;
        }),
        projectInToolbar: toolbar.contains(project),
        projectBelowInput:
          project.getBoundingClientRect().top >= input.getBoundingClientRect().bottom,
      };
    });
    assert.equal(layout.editorBorder, "0px", "Editor must not draw a nested frame");
    assert.equal(layout.surfaceBorder, "1px", "Outer composer must own the frame");
    assert.equal(layout.overflow, false, `Composer overflow at ${width}px`);
    assert.equal(layout.controlsFit, true, `Toolbar controls overflow at ${width}px`);
    assert.equal(layout.projectInToolbar, true);
    assert.equal(layout.projectBelowInput, true);
    await composer.screenshot({ path: join(runtime, `composer-${width}.png`) });
  }
  assert.equal(await input.innerText(), "Layout check draft", "Resize must preserve draft");

  const sidebar = page.getByTestId("sidebar");
  const sidebarInfo = await sidebar.evaluate((element) => {
    const footer = element.querySelector("footer");
    const buttons = Array.from(element.querySelectorAll("button"));
    const label = (node) => node.getAttribute("aria-label") ?? node.textContent?.trim() ?? "";
    return {
      rail: document.querySelectorAll(".quiet-studio-rail").length,
      search: buttons.filter((button) => /command|search/i.test(label(button))).length,
      newTask: element.querySelectorAll('[data-testid="task-new-button"]').length,
      footerInsideSidebar: Boolean(footer),
      footerAfterList: footer
        ? footer.getBoundingClientRect().top >=
          element.getBoundingClientRect().bottom - footer.offsetHeight - 2
        : false,
      settings: element.querySelectorAll('[data-testid="task-settings-button"]').length,
    };
  });
  assert.equal(sidebarInfo.rail, 0, "Duplicate rail must be gone");
  assert.equal(sidebarInfo.newTask, 1, "New task must appear once");
  assert.equal(sidebarInfo.settings, 1, "Settings must appear once");
  assert.equal(sidebarInfo.footerInsideSidebar, true, "Account/Settings must live in the sidebar");
  assert.equal(sidebarInfo.footerAfterList, true, "Sidebar footer must sit at the bottom");
  assert.ok(sidebarInfo.search >= 1, "Search must remain reachable");
  await page.getByTestId("desktop-top-nav-back").waitFor({ state: "attached" });
  await sidebar.screenshot({ path: join(runtime, "sidebar.png") });
  await guidance.locator("button[aria-label]").last().click();
  await guidance.waitFor({ state: "hidden" });
  await page.reload();
  await guidance.waitFor({ state: "visible" });
  await guidance.locator("button").first().click();
  await page.getByTestId("model-provider-add-provider-button").waitFor({ state: "visible" });
  await page.getByTestId("settings-section-nav-appearance").click();
  const themeSelect = page.getByTestId("appearance-theme-select");
  await themeSelect.waitFor({ state: "visible" });
  const accentBefore = await page.getByTestId("appearance-accent-select").innerText();
  for (const mode of ["light", "dark"]) {
    await page.getByTestId(`code-theme-${mode}`).click();
    await page.getByRole("option", { name: "Follow app theme & accent", exact: true }).click();
  }
  const palettes = new Set();
  for (const [theme, label] of [
    ["system", "System"],
    ["zai-light", "Light"],
    ["zai-dark", "Dark"],
    ["black", "Black"],
    ["midnight", "Midnight"],
    ["ocean", "Ocean"],
    ["forest", "Forest"],
    ["purple", "Purple"],
    ["rose", "Rose"],
    ["amber", "Amber"],
  ]) {
    await themeSelect.click();
    await page.getByRole("option", { name: label, exact: true }).click();
    await page.waitForFunction((theme) => {
      const root = document.documentElement;
      return theme === "system"
        ? root.classList.contains("theme-zai-light") || root.classList.contains("theme-zai-dark")
        : root.classList.contains(`theme-${theme}`);
    }, theme);
    const palette = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return ["--color-background", "--color-sidebar", "--color-card", "--color-input"]
        .map((key) => style.getPropertyValue(key).trim())
        .join("|");
    });
    if (theme !== "system") {
      assert.ok(!palettes.has(palette), `Theme ${theme} must have its own surface palette`);
      palettes.add(palette);
    }
    await page.reload();
    await page.getByTestId("task-settings-button").click();
    await page.getByTestId("settings-section-nav-appearance").click();
    await themeSelect.waitFor({ state: "visible" });
    assert.equal(await themeSelect.innerText(), label, `Theme ${theme} must survive reload`);
    assert.equal(await page.getByTestId("appearance-accent-select").innerText(), accentBefore);
    assert.equal(await page.evaluate(() => localStorage.getItem("mesa-code-theme")), theme);
    const paletteAfterReload = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return ["--color-background", "--color-sidebar", "--color-card", "--color-input"]
        .map((key) => style.getPropertyValue(key).trim())
        .join("|");
    });
    assert.equal(paletteAfterReload, palette, `Theme ${theme} palette must survive reload`);
    for (const accentLabel of ["Jade", "Sky", "Violet", "Rose", "Amber", "Coral"]) {
      await page.getByTestId("appearance-accent-select").click();
      await page.getByRole("option", { name: accentLabel, exact: true }).click();
      const colors = await page
        .getByTestId(`code-preview-${theme === "zai-light" ? "light" : "dark"}`)
        .evaluate((element) => {
          const probe = document.createElement("span");
          element.append(probe);
          const color = (value) => {
            probe.style.color = value;
            return getComputedStyle(probe).color;
          };
          const palette = [
            "foreground",
            "token-comment",
            "token-keyword",
            "token-string",
            "token-constant",
            "token-function",
            "token-parameter",
          ].map((key) => color(`var(--mesa-code-syntax-${key})`));
          const background = color("var(--mesa-code-syntax-background)");
          const brand = color("var(--color-brand)");
          probe.remove();
          const luminance = (rgb) =>
            rgb
              .match(/[\d.]+/g)
              .slice(0, 3)
              .map(Number)
              .map((value) => {
                const channel = value / 255;
                return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
              })
              .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
          const bg = luminance(background);
          return {
            keyword: palette[2],
            brand,
            contrasts: palette.map((value) => {
              const fg = luminance(value);
              return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
            }),
          };
        });
      assert.equal(colors.keyword, colors.brand, `Code keyword must follow ${accentLabel}`);
      assert.ok(
        colors.contrasts.every((ratio) => ratio >= 4.5),
        `${theme}/${accentLabel} code contrast below 4.5: ${colors.contrasts}`,
      );
    }
    await page.getByTestId("appearance-accent-select").click();
    await page.getByRole("option", { name: accentBefore, exact: true }).click();
    console.info(`Theme selection, reload and six code accents passed: ${theme}`);
  }
  await themeSelect.click();
  await page.getByRole("option", { name: "System", exact: true }).click();
  for (const colorScheme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction(
      (colorScheme) => document.documentElement.classList.contains(`theme-zai-${colorScheme}`),
      colorScheme,
    );
  }
  const appearance = page.locator(".quiet-studio-appearance").first();
  for (const width of [832, 340]) {
    await appearance.evaluate((element, width) => {
      element.style.width = `${width}px`;
      element.style.maxWidth = "100%";
    }, width);
    assert.equal(
      await appearance.evaluate((element) => element.scrollWidth > element.clientWidth + 1),
      false,
    );
    if (width === 340) {
      assert.equal(
        await themeSelect.evaluate((element) => {
          const row = element.closest("[data-settings-row]");
          return (
            element.getBoundingClientRect().top >=
            row.querySelector(".grid > div").getBoundingClientRect().bottom
          );
        }),
        true,
        "Narrow Appearance controls must sit below their labels",
      );
    }
  }
  await page
    .getByTestId("code-preview-dark")
    .screenshot({ path: join(runtime, "code-preview-dark.png") });
  await page
    .getByTestId("code-preview-light")
    .screenshot({ path: join(runtime, "code-preview-light.png") });
  await appearance.screenshot({ path: join(runtime, "appearance-narrow.png") });
  await appearance.evaluate((element) => {
    element.style.removeProperty("width");
  });
  await page
    .locator(".quiet-studio-appearance")
    .first()
    .screenshot({ path: join(runtime, "appearance.png") });
  console.info(
    "Quiet Studio composer layout, project/permission menus, model settings and dismissal passed.",
  );
  console.info(`Screenshots: ${runtime}`);
} finally {
  await app.close();
}
