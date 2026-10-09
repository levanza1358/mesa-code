import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "packages/desktop/package.json"));
const { createServer } = await import(pathToFileURL(require.resolve("vite")).href);
const react = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")).href)).default;
const tailwind = (await import(pathToFileURL(require.resolve("@tailwindcss/vite")).href)).default;
const { _electron } = require("playwright-core");
const output = join(root, ".quiet-studio-runtime", "streaming-e2e");
await mkdir(output, { recursive: true });
const runtime = await mkdtemp(join(output, "run-"));
await mkdir(join(runtime, "home"), { recursive: true });
const server = await createServer({
  configFile: false,
  envFile: false,
  root,
  plugins: [
    react(),
    tailwind(),
    {
      name: "synthetic-fixture",
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          if (request.url !== "/fixture.html") return next();
          try {
            const html = await server.transformIndexHtml(
              "/fixture.html",
              '<html><body style="margin:0"><div id="root"></div><script type="module" src="/scripts/quiet-studio-streaming-fixture.tsx"></script></body></html>',
            );
            response.setHeader("Content-Type", "text/html");
            response.end(html);
          } catch (error) {
            next(error);
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": join(root, "packages/ui/src"),
      react: dirname(require.resolve("react/package.json")),
      "react-dom": dirname(require.resolve("react-dom/package.json")),
      "lucide-react": dirname(require.resolve("lucide-react/package.json")),
      "d3-path": join(root, "node_modules/d3-path/src/index.js"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 0,
    watch: { ignored: ["**/.quiet-studio-runtime/**", "**/.mesaCode/**"] },
  },
});
await server.listen();
const address = server.httpServer.address();
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (key.startsWith("MESA_CODE_") || key.startsWith("MESA_") || key.startsWith("VITE_"))
    delete env[key];
}
delete env.ELECTRON_RUN_AS_NODE;
Object.assign(env, {
  HOME: join(runtime, "home"),
  USERPROFILE: join(runtime, "home"),
  QUIET_STUDIO_FIXTURE_RUNTIME: runtime,
  QUIET_STUDIO_FIXTURE_URL: `http://127.0.0.1:${address.port}/fixture.html`,
});
let app;
try {
  app = await _electron.launch({
    executablePath: require("electron"),
    args: [join(root, "scripts/quiet-studio-streaming-electron.cjs")],
    cwd: root,
    env,
    timeout: 90_000,
  });
  const page = await app.firstWindow();
  page.setDefaultTimeout(90_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.getByLabel("Synthetic draft").waitFor();
  await page.waitForFunction(() => document.body.innerText.includes("Generated response 101"));
  const viewport = page.locator('[data-testid="v4-timeline"]').first();
  assert.equal(await viewport.count(), 1, "Actual timeline must mount");
  await page.evaluate(() => {
    window.fixtureMetrics = { frames: [], longTasks: [] };
    let previous = performance.now();
    const frame = (now) => {
      window.fixtureMetrics.frames.push(now - previous);
      previous = now;
      window.fixtureFrame = requestAnimationFrame(frame);
    };
    window.fixtureFrame = requestAnimationFrame(frame);
    new PerformanceObserver((list) =>
      window.fixtureMetrics.longTasks.push(...list.getEntries().map((entry) => entry.duration)),
    ).observe({ type: "longtask", buffered: false });
  });
  await page.getByTestId("start").click();
  const draft = page.getByLabel("Synthetic draft");
  await draft.pressSequentially("Synthetic typing during generated streaming", { delay: 20 });
  assert.equal(await draft.inputValue(), "Synthetic typing during generated streaming");
  await viewport.hover();
  await page.mouse.wheel(0, -3000);
  await page.waitForFunction(() => {
    const element = document.querySelector('[data-testid="v4-timeline"]');
    return element && element.scrollHeight - element.clientHeight - element.scrollTop > 100;
  });
  const before = await viewport.evaluate((element) => element.scrollTop);
  const current = Number(await page.getByTestId("frame").innerText());
  await page.waitForFunction(
    (current) =>
      Number(document.querySelector('[data-testid="frame"]').textContent) >= current + 10,
    current,
  );
  const after = await viewport.evaluate((element) => element.scrollTop);
  assert.ok(
    Math.abs(after - before) < 60,
    `Streaming must preserve scroll-away intent: ${before} / ${after}`,
  );
  await page.getByTestId("prepend").click();
  assert.equal(await draft.inputValue(), "Synthetic typing during generated streaming");
  await page.waitForFunction(
    () => Number(document.querySelector('[data-testid="frame"]').textContent) >= 100,
  );
  await page.getByTestId("complete").click();
  await viewport.hover();
  await page.mouse.wheel(0, 100000);
  await page.waitForFunction(() => {
    const element = document.querySelector('[data-testid="v4-timeline"]');
    return element && element.scrollHeight - element.clientHeight - element.scrollTop < 60;
  });
  const metrics = await page.evaluate(() => {
    cancelAnimationFrame(window.fixtureFrame);
    return window.fixtureMetrics;
  });
  const frames = metrics.frames.slice(5).sort((a, b) => a - b);
  const result = {
    scenario:
      "actual timeline, 100 historical turns, 100 updates at 30ms, typing, scroll away/back, prepend, completion",
    frameMedianMs: frames[Math.floor(frames.length / 2)],
    frameP95Ms: frames[Math.floor(frames.length * 0.95)],
    longTasks: metrics.longTasks,
    errors,
  };
  assert.deepEqual(errors, [], "Renderer must not emit errors");
  await writeFile(join(runtime, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  if (app) await app.close();
  await server.close();
}
