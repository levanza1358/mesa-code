import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { quoteArgsForWindowsShell } from "./spawn-command.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const target = process.argv[2];
if (target !== "desktop" && target !== "web") {
  throw new Error("Usage: node scripts/quiet-studio-dev.mjs <desktop|web> [desktop options]");
}
const runtime = join(root, ".quiet-studio-runtime");
const home = join(runtime, "home");
await mkdir(home, { recursive: true });
const env = {
  ...process.env,
  HOME: home,
  USERPROFILE: home,
  MESA_CODE_DATA_BASE_DIR: home,
  MESA_CODE_DESKTOP_HOME_DIR: home,
  MESA_CODE_DESKTOP_APPLICATION_NAME: "Mesa Code",
  MESA_CODE_DESKTOP_USER_DATA_DIR: join(runtime, "electron"),
  MESA_CODE_DESKTOP_SESSION_DATA_DIR: join(runtime, "electron", "session"),
  MESA_CODE_DESKTOP_USE_ELECTRON_DEFAULT_USER_DATA: "0",
  MESA_CODE_DISABLE_FIXED_REMOTE_DEBUGGING_PORT: "1",
  PORT: "3031",
};
const args =
  target === "desktop"
    ? [
        process.execPath,
        join(root, "scripts", "dev-desktop-env.mjs"),
        process.argv[3] || "production",
        ...process.argv.slice(4),
      ]
    : [
        "pnpm",
        "exec",
        "concurrently",
        "-k",
        "-n",
        "server,web",
        "pnpm --filter @mesa-code/server dev",
        "pnpm --filter @mesa-code/web dev --port 5174 --strictPort --host 127.0.0.1",
      ];
const windows = process.platform === "win32";
// cmd /d /s /c strips the outermost quote pair, so the entire command line
// must be wrapped in an extra set of double quotes to survive the strip when
// paths contain spaces (e.g. "C:\Program Files\nodejs\node.exe").
const cmdLine = `"${quoteArgsForWindowsShell(args).join(" ")}"`;
const child = windows
  ? spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", cmdLine], {
      windowsVerbatimArguments: true,
      cwd: root,
      env,
      stdio: "inherit",
    })
  : spawn(args[0], args.slice(1), { cwd: root, env, stdio: "inherit" });
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
