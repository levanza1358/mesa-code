/**
 * Build tool catalog.
 *
 * Every binary the installer/unpack build needs outside of npm lives here. The
 * bootstrap resolves each entry, downloads it once into `.tools/`, verifies its
 * checksum, and extracts it so later builds reuse the cache instead of hitting
 * the network again.
 *
 * Adding a tool means adding one entry to `TOOL_CATALOG`; the bootstrap, the
 * `--list` output, and the docs all read from this array.
 */

/** electron-builder helper bundles that are required to produce a Windows installer. */
export const ELECTRON_BUILDER_TOOL_IDS = Object.freeze(["winCodeSign", "nsis", "nsis-resources"]);

/**
 * electron-builder resolves helper bundles by `<name>-<version>` release names.
 * The download base mirrors electron-builder's own precedence: an intranet
 * dependency base URL wins, otherwise the npmmirror binary mirror is used, and
 * the upstream GitHub release URL is the final fallback.
 */
export const DEFAULT_ELECTRON_BUILDER_BINARIES_MIRROR =
  "https://registry.npmmirror.com/-/binary/electron-builder-binaries/";

export const OFFICIAL_ELECTRON_BUILDER_BINARIES_MIRROR =
  "https://github.com/electron-userland/electron-builder-binaries/releases/download/";

/**
 * The tool catalog.
 *
 * `kind` selects the resolver:
 * - `electron-builder-bundle` — an archive hosted by electron-builder's binaries
 *   release channel.
 * - `node-dist` — a Node.js distribution archive used to provide the pinned
 *   runtime for the build.
 *
 * `extract` selects how the archive is unpacked:
 * - `seven-zip` — requires a working 7za (see `MESA_CODE_REAL_7ZA`).
 * - `zip`/`tar.gz` — handled by the platform archiver.
 * - `none` — kept as a single file (for example an installer executable).
 */
export const TOOL_CATALOG = Object.freeze([
  {
    id: "winCodeSign",
    kind: "electron-builder-bundle",
    releaseName: "winCodeSign-2.6.0",
    fileName: "winCodeSign-2.6.0.7z",
    // Checksums are electron-builder's own sha512 values, which is what
    // app-builder validates. `nsis`/`nsis-resources` are transcribed from
    // app-builder-lib's table; `winCodeSign` is computed from the archive that
    // produced a verified installer. A corrupt response is rejected here for the
    // same reason electron-builder would reject it.
    sha512: "6LQI2d9BPC3Xs0ZoTQe1o3tPiA28c7+PY69Q9i/pD8lY45psMtHuLwv3vRckiVr3Zx1cbNyLlBR8STwCdcHwtA==",
    sha256: "CDAEC7154DDA7CC31F88D886E2489379A0625A737D610B5AE7F62A12F16743A4",
    extract: "seven-zip",
    requiredFor: ["installer"],
    description:
      "Windows code-signing and resource-editing tools (rcedit, signtool) used by electron-builder.",
    // The bundle embeds macOS dylib symlinks. Windows cannot create those without
    // elevation, so the extractor skips them; only the Windows payload is needed.
    skipEntryPredicate: "macos-symlinks",
  },
  {
    id: "nsis",
    kind: "electron-builder-bundle",
    releaseName: "nsis-3.0.4.1",
    fileName: "nsis-3.0.4.1.7z",
    sha512: "VKMiizYdmNdJOWpRGz4trl4lD++BvYP2irAXpMilheUP0pc93iKlWAoP843Vlraj8YG19CVn0j+dCo/hURz9+Q==",
    extract: "seven-zip",
    requiredFor: ["installer"],
    description: "NSIS compiler used to build the Windows installer executable.",
  },
  {
    id: "nsis-resources",
    kind: "electron-builder-bundle",
    releaseName: "nsis-resources-3.4.1",
    fileName: "nsis-resources-3.4.1.7z",
    sha512: "Dqd6g+2buwwvoG1Vyf6BHR1b+25QMmPcwZx40atOT57gH27rkjOei1L0JTldxZu4NFoEmW4kJgZ3DlSWVON3+Q==",
    extract: "seven-zip",
    requiredFor: ["installer"],
    description: "NSIS plugins and scripts (including the install section patched during packaging).",
  },
]);

/** Resolve a catalog entry by id. */
export function findTool(toolId) {
  return TOOL_CATALOG.find((tool) => tool.id === toolId) ?? null;
}

/** Tool ids required by a build profile. */
export function toolIdsForProfile(profile) {
  return TOOL_CATALOG.filter((tool) => tool.requiredFor.includes(profile)).map((tool) => tool.id);
}
