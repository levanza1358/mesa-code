# OpenAI reasoning effort compatibility

**Status:** active  
**Owner:** provider catalog and model-option adapter maintainers  
**Authority:** contract  
**Scope:** catalog reasoning levels and OpenAI Responses serialization compatibility  
**Updated:** 2026-10-12 08:39 (local time)  
**Verification:** source-only documentation review; upstream acceptance was not probed

## Product behavior

Model catalog entries for OpenAI Responses-compatible GPT models expose only reasoning
levels accepted by the upstream Responses API. The `max` level is not offered for the
GPT-5.6 family because the upstream API accepts `minimal`, `low`, `medium`, `high`, and
`xhigh`; requests must never serialize `reasoning.effort: "max"`.

## Ownership and boundary

`config/provider/mesa-code-builtin.json` owns the built-in model catalog and its supported
reasoning-level metadata. The model option-map adapter serializes the selected catalog
value without inventing a second set of levels. Therefore catalog validation prevents an
invalid value before the request reaches the provider gateway.

## Invariants

- `gpt-5.6` and its `sol`, `terra`, and `luna` variants offer `none`, `low`, `medium`,
  `high`, and `xhigh` only.
- The OpenAI Responses option map may serialize `none` as the provider-compatible
  disabled value, but it must not receive `max` for this model family.
- Model selection remains provider/model scoped; unrelated model families retain their
  existing catalog rules.

## Acceptance scenarios

1. Selecting `gpt-5.6-luna` shows no `max` reasoning option.
2. Selecting `xhigh` sends `reasoning.effort: "xhigh"` to an OpenAI Responses-compatible
   endpoint.
3. A stale `max` selection fails local model-option validation instead of sending a
   request that the endpoint rejects with HTTP 400.
