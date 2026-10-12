# Mesa Code Plugin Store

**Status:** reference  
**Owner:** plugin-store maintainers  
**Scope:** plugin marketplace vocabulary; not runtime verification  
**Updated:** 2026-10-12 08:31 (local time)

Read [`docs/skills/catalog-and-controls.md`](docs/skills/catalog-and-controls.md) for skill controls and
[`docs/specs/settings-restructure.md`](docs/specs/settings-restructure.md) for the Settings navigation
contract and current implementation gaps. The terminology below does not establish that every
lifecycle scenario has passed.

A domain vocabulary for the plugin settings page and its marketplace browse/install experience. This file defines store terminology centrally for pages, services, and documentation.

## Language

### Marketplace and sources

**Official Marketplace**:
The single distribution channel operated by Mesa Code, with marketplace id `mesa-code-plugins-official`; content = builtin plugins + CDN plugins. It is a "distribution channel", not "author attribution" — it can also include plugins from community authors.
_Avoid_: using "official" to mean any trusted marketplace

**Builtin Plugin**:
A plugin shipped with the application bundle and seeded into the Official Marketplace at startup. A subset of official plugins.
_Avoid_: preinstalled plugin, bundled plugin (fine in speech; docs standardize on "builtin")

**CDN Plugin**:
A plugin in the Official Marketplace distributed as a sha256-verified zip package over the official CDN and downloaded on demand at install time.
_Avoid_: network plugin, online plugin

**Personal Source**:
Any plugin source added by the user: git/GitHub/URL/local directory marketplaces, and inline plugins.
_Avoid_: none

**Catalog Auto-Refresh**:
A throttled background refresh of the Official Marketplace catalog when entering the store page; imperceptible to the user. Covers only the official marketplace.
_Avoid_: conflating with Manual Refresh; calling it "check for updates" (the update badge is only a side effect of refreshing)

**Manual Refresh**:
A full-marketplace refresh triggered by the refresh button in the store page top bar, unaffected by the auto-refresh throttle.
_Avoid_: refresh, check for updates (fine in speech; docs standardize on "manual refresh")

### Store page structure

**Public Segment**:
A segment of the store list page that shows — and only shows — the Official Marketplace catalog (Featured + category blocks).
_Avoid_: official tab, store tab

**Personal Segment**:
The other segment of the store list page, showing the catalogs of all personal sources, grouped by marketplace.
_Avoid_: third-party tab, my tab

**Featured**:
A curated area at the top of the Public Segment; the list is remotely controlled by the `featured` field of the official CDN catalog. Exists only in the Public Segment.
_Avoid_: conflating with Recommended

**Installed Strip**:
A row of installed plugin icons at the top of the list page; clicking an icon opens the detail page.
_Avoid_: installed list (that belongs to the Manage Installed view)

**Manage Installed View**:
The management screen opened from the gear to the right of the Installed Strip; hosts per-plugin enable/disable toggles, updates, uninstall, and enabled-state filtering.
_Avoid_: Installed tab (legacy IA term, deprecated)

### Metadata

**Store Listing**:
Presentational metadata carried by a catalog entry: display name, icon, category, developer, website/privacy policy/terms links, hero image, example prompts. Describes "how it is presented in the store"; does not affect plugin functionality.
_Avoid_: plugin metadata (ambiguous — could mean the manifest)

**Plugin Manifest**:
The functional definition inside the plugin package's `plugin.json` (commands/agents/skills/hooks/mcpServers/userConfig…). Describes "what the plugin is and what it does".
_Avoid_: marketplace.json (that is the catalog, not the manifest)

**Example Prompt**:
A clickable prompt provided by the Store Listing; clicking creates a new session and prefills it (without auto-sending). The only "new session" entry point on the detail page.
_Avoid_: shortcut command, prompt template, try it now

### Lifecycle states

**Plugin Lifecycle**:
The complete product path from discovering a plugin, through viewing, installing, configuring, enabling/disabling, using, checking for updates, upgrading, and persistence recovery, up to uninstalling or restoring a builtin plugin. Every stage must validate both the visible UI state and the corresponding persistence or runtime outcome.
_Avoid_: calling "install succeeded" the full lifecycle

**Restorable Builtin**:
A Builtin Plugin that the user uninstalled and that entered a persisted suppression state. An application restart must not re-seed it automatically; it continues to appear in the Public Segment and is cleanly restored through the "Install" entry point.
_Avoid_: uninstalled CDN plugin, temporarily disabled builtin plugin

**Orphaned Installed Plugin**:
A plugin whose Personal Source was deleted but whose install directory and user data are still retained. It can still be used, configured, enabled/disabled, and uninstalled; it cannot be updated until the source is re-added, and re-adding the same source restores catalog association.
_Avoid_: broken install, missing manifest, uninstalled plugin
