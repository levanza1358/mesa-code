import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import postcss from "postcss";
import type { AtRule, Rule } from "postcss";

const uiRoot = resolve(import.meta.dirname, "..");
const cssPath = resolve(uiRoot, "src", "quiet-studio.css");
const css = readFileSync(cssPath, "utf8");
const root = postcss.parse(css, { from: cssPath });

const WEB_INDEX = resolve(uiRoot, "..", "web", "index.html");
const DESKTOP_INDEX = resolve(uiRoot, "..", "desktop", "src", "renderer", "index.html");

// Collect every rule nested under the phone-width media query, flattened.
function phoneRules(): Rule[] {
  const blocks = root.nodes.filter(
    (node) => node.type === "atrule" && node.name === "media" && /767px/.test(node.params),
  ) as AtRule[];
  const rules: Rule[] = [];
  for (const block of blocks) {
    block.walkRules((rule) => rules.push(rule));
  }
  return rules;
}

test("the phone composer toolbar keeps its leading cluster on one line", () => {
  const rules = phoneRules();
  const scoped = (part: string) =>
    rules.find(
      (rule) =>
        rule.selector.includes(part) && rule.selector.includes(".quiet-studio-composer-editor"),
    );

  const toolbar = scoped("group/toolbar");
  assert.ok(toolbar, "expected a phone rule for the composer toolbar row");
  assert.equal(
    toolbar.nodes.find((n) => n.type === "decl" && n.prop === "flex-wrap")?.value,
    "nowrap",
    "the phone composer row must not wrap",
  );

  const leading = scoped("[data-composer-leading-actions]");
  assert.ok(leading, "expected a phone rule for the leading-actions cluster");
  const leadingDecls = new Map(
    leading.nodes.filter((n) => n.type === "decl").map((n) => [n.prop, n.value]),
  );
  assert.match(
    leadingDecls.get("flex") ?? "",
    /^1 1\b/,
    "the leading cluster is the only member allowed to shrink",
  );
  assert.equal(leadingDecls.get("min-width"), "0");

  const project = scoped("[data-composer-project]");
  assert.ok(project, "expected a phone rule for the project/branch chip group");
  assert.equal(
    project.nodes.find((n) => n.type === "decl" && n.prop === "flex-wrap")?.value,
    "nowrap",
    "the project/branch chip group must stay on one line",
  );

  const model = rules.find((rule) => rule.selector.includes(".composer-model-trigger"));
  assert.ok(model, "expected a phone rule bounding the model chip");
  assert.ok(
    model.nodes.some((n) => n.type === "decl" && n.prop === "max-width"),
    "the model chip must be bounded so a long provider/model name truncates",
  );
});

test("every phone composer rule is gated on the web-only document marker", () => {
  // A bare max-width query would also reach a narrow desktop window (the desktop
  // minimum width is 480px). Each phone composer rule must require the marker, so
  // the desktop renderer — which never sets it — keeps today's layout.
  const ungated = phoneRules().filter(
    (rule) =>
      rule.selector.includes(".quiet-studio-composer-editor") &&
      !rule.selector.includes("html[data-mesa-code-web]"),
  );
  assert.deepEqual(
    ungated.map((rule) => rule.selector),
    [],
    "a phone composer rule reached the composer without the web-only marker",
  );
});

test("the marker exists in the web document and not the desktop document", () => {
  const web = readFileSync(WEB_INDEX, "utf8");
  const desktop = readFileSync(DESKTOP_INDEX, "utf8");
  assert.match(
    web,
    /<html[^>]*data-mesa-code-web/,
    "the web entry must mark <html> as the web client",
  );
  assert.doesNotMatch(
    desktop,
    /data-mesa-code-web/,
    "the desktop renderer must never set the web-only marker",
  );
});
