import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import postcss from "postcss";

const cssPath = resolve(import.meta.dirname, "..", "src", "quiet-studio.css");
const css = readFileSync(cssPath, "utf8");

// PostCSS throws on malformed syntax, so parsing is itself an assertion.
const root = postcss.parse(css, { from: cssPath });

test("composer running glow declares its keyframes and angle property", () => {
  assert.ok(css.includes("@property --quiet-studio-composer-glow-angle"));
  assert.ok(css.includes("@keyframes quiet-studio-composer-glow-spin"));
  assert.ok(css.includes("@keyframes quiet-studio-composer-glow-pulse"));
});

test("composer running glow is gated on the running attribute", () => {
  const rule = root.nodes.find(
    (node) =>
      node.type === "rule" &&
      node.selector?.includes('[data-composer-running="true"]') &&
      node.selector?.includes(".chat-composer-input-surface"),
  );

  assert.ok(rule, "expected a rule scoped to the running composer surface");

  const properties = rule.nodes.map((decl) => decl.prop);
  assert.ok(properties.includes("animation"), "glow rule must animate");
  assert.ok(
    properties.includes("mask-composite") || properties.includes("-webkit-mask-composite"),
    "glow rule must mask the gradient into a ring",
  );
});

test("composer glow paints above the content so children cannot cover it", () => {
  // Regression: the ring used to sit at z-index 0 with the composer's children
  // lifted to z-index 1. Any child with an opaque background (the editor wrapper,
  // the toolbar row) then covered the ring, so the glow disappeared as soon as
  // content or the pointer filled the box. The ring must paint on top and stay
  // pointer-transparent.
  const rule = root.nodes.find(
    (node) =>
      node.type === "rule" &&
      node.selector?.includes('[data-composer-running="true"]') &&
      node.selector?.includes(".chat-composer-input-surface::before"),
  );

  assert.ok(rule, "expected a rule for the glow pseudo-element");

  const byProp = new Map(rule.nodes.map((decl) => [decl.prop, decl.value]));
  assert.equal(byProp.get("z-index"), "1", "the ring must paint above the content");
  assert.equal(
    byProp.get("pointer-events"),
    "none",
    "the ring must not intercept pointer events",
  );

  // No rule may raise the composer's children above the ring.
  const childRaisingRule = root.nodes.find(
    (node) =>
      node.type === "rule" &&
      node.selector?.includes('[data-composer-running="true"]') &&
      /\.chat-composer-input-surface\s*>\s*\*/.test(node.selector ?? ""),
  );
  assert.equal(
    childRaisingRule,
    undefined,
    "children must stay in the normal flow so an opaque child cannot hide the ring",
  );
});

test("composer glow never applies to the default surface", () => {
  // The resting border token must stay on the plain selector, so the glow is a
  // state change rather than the default appearance.
  const restingRule = root.nodes.find(
    (node) =>
      node.type === "rule" &&
      node.selector === ".quiet-studio-conversation .chat-composer-input-surface",
  );

  assert.ok(restingRule, "expected the resting composer surface rule");
  const borderDecl = restingRule.nodes.find((decl) => decl.prop === "border");
  assert.match(borderDecl?.value ?? "", /var\(--color-input-border\)/);
});

test("reduced motion replaces the glow animation", () => {
  const reducedMotion = root.nodes.find(
    (node) =>
      node.type === "atrule" &&
      node.name === "media" &&
      node.params.includes("prefers-reduced-motion"),
  );

  assert.ok(reducedMotion, "expected a prefers-reduced-motion block");
  assert.ok(
    reducedMotion.toString().includes('[data-composer-running="true"]'),
    "reduced-motion must neutralise the running glow",
  );
});
