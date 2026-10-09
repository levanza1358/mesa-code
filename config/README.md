# Built-in Default Configuration

**Status:** active reference  
**Owner:** configuration and platform maintainers  
**Authority:** shipped default configuration and fallback behavior  
**Scope:** `config/default.json` consumers in Desktop and Web  
**Updated:** 2026-10-09 16:31 (local time)

Read the [documentation index](../docs/README.md) first. Current source consumers and configuration schemas remain authoritative.

`config/default.json` is the default configuration shipped with the client and must remain available. Desktop reads it from the packaged files, while Web imports it at build time. The built-in values are used when the remote request fails or does not contain valid fields.

## Help and Community Configuration

The community and feedback entry points request `GET /api/v1/client/configs` from the current endpoint and read `data.configs.feedbackUrl`.

- `community_urls["zh-CN" | "en-US"]`: legacy locale keys are retained for compatibility; the product UI is English-only.
- `feedback_url`: a valid remote URL takes precedence over the built-in URL.
- `feedback_use_external_form`: a remote boolean takes precedence; `false` is also a valid override.

Requests include `app_version`. Desktop also includes `platform-arch`; Web omits the platform parameter. Successful responses are cached in memory for one hour. Requests use `cache: no-store`, and failures are not cached.

```text
GET endpoint /api/v1/client/configs -> valid help fields -> platform entry
                         | missing / failure
                         v
                built-in default.json -> platform entry
```

`default.json` is distributed with the client. Legacy CDN-related fields remain only for compatibility; the current version relies on this built-in file and preserves the other fields required by existing consumers.

The current source consumers and `config/default.json` remain the detailed rule source; no separate community-link specification is present in this workspace.
