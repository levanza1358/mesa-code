# AI engineering toolkit

Instruction-only Mesa Code skills: `prompt-review` audits prompts and instructions; `tool-schema-design` shapes model-facing tool contracts; `eval-harness` builds reproducible evaluations; `agent-loop-design` designs bounded agent control flow.

Uses tools, models, and dependencies already available in the active environment. No MCP service, runtime, model access, evaluator, or dataset is bundled or guaranteed. Never embed credentials or real user data in prompts, fixtures, or logs; treat model output as untrusted; report unverified behavior honestly and obtain authorization before external or destructive actions.
