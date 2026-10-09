/**
 * Build flavor keeps installation identities separate from the backend environment.
 * Both flavors display Mesa Code; app IDs, package names and helper variants stay compatible.
 */
export const MESA_CODE_PREVIEW_IDENTITY_ENV = "MESA_CODE_PREVIEW_IDENTITY";

const PRODUCTION_IDENTITY = Object.freeze({
  flavor: "production",
  appId: "dev.mesaCode.app",
  productName: "Mesa Code",
  executableName: "MesaCode",
  linuxExecutableName: "mesacode",
  linuxPackageName: "mesacode",
  cuaHelperInstallVariant: null,
});

const PREVIEW_IDENTITY = Object.freeze({
  flavor: "preview",
  appId: "dev.mesaCode.app.preview",
  productName: "Mesa Code",
  executableName: "MesaCode",
  linuxExecutableName: "mesacode-preview",
  linuxPackageName: "mesacode-preview",
  cuaHelperInstallVariant: "preview",
});

export const desktopProductIdentities = Object.freeze({
  production: PRODUCTION_IDENTITY,
  preview: PREVIEW_IDENTITY,
});

function normalizeDesktopMesaCodeEnv(env) {
  return env.MESA_CODE_ENV?.trim().toLowerCase() === "production" ? "production" : "test";
}

/**
 * 开关只有一种开启拼写 `1`（`0` / 空 = 关闭），与 CI workflow 规则和 release 门的
 * `$MESA_CODE_PREVIEW_IDENTITY == "1"` 精确比较保持同一套语义。其它拼写在构建期直接失败，
 * 避免 `true` 之类在 YAML 路由层漏匹配、却在脚本层被当成开启，把 Preview 包打进生产验收目录。
 */
export function isPreviewIdentityRequested(env = process.env) {
  const value = env[MESA_CODE_PREVIEW_IDENTITY_ENV]?.trim() ?? "";
  if (value === "1") {
    return true;
  }
  if (value === "" || value === "0") {
    return false;
  }
  throw new Error(
    `invalid ${MESA_CODE_PREVIEW_IDENTITY_ENV}=${env[MESA_CODE_PREVIEW_IDENTITY_ENV]}; expected 1 or 0`,
  );
}

/** Test and explicit preview builds retain their separate install identity and data paths. */
export function resolveDesktopProductFlavor(env = process.env) {
  if (isPreviewIdentityRequested(env)) {
    return "preview";
  }
  return normalizeDesktopMesaCodeEnv(env) === "production" ? "production" : "preview";
}

export function resolveDesktopProductIdentity(env = process.env) {
  return desktopProductIdentities[resolveDesktopProductFlavor(env)];
}

/** Artifact environment suffixes remain separate from the shared product display name. */
export function resolveDesktopArtifactSuffix(env = process.env) {
  return normalizeDesktopMesaCodeEnv(env) === "test" ? "_TEST" : "";
}

/**
 * 返回 Windows Shell 使用的 AppUserModelId。
 *
 * 打包态必须复用 electron-builder 的 appId，否则快捷方式里的 AUMID、开始菜单索引
 * 和运行中的 Electron 进程会被 Windows 视为三个不同的应用。开发态继续保留旧身份，
 * 避免本地调试快捷方式和正式/Preview 安装包互相污染。
 */
export function resolveWindowsAppUserModelIdForFlavor(flavor, runtime = { isPackaged: true }) {
  if (runtime.isPackaged === false) {
    return "cn.aminer.mesaCode";
  }
  return desktopProductIdentities[flavor === "preview" ? "preview" : "production"].appId;
}

export function resolveWindowsAppUserModelId(env = process.env, runtime = { isPackaged: true }) {
  return resolveWindowsAppUserModelIdForFlavor(resolveDesktopProductFlavor(env), runtime);
}
