// Builds a release of the Sternbild design tokens from design/tokens.json.
//
//   node design/build.mjs           write the release
//   node design/build.mjs --check   exit 1 if the published files differ from what the tokens produce
//
// The version is read from tokens.json ($extensions["org.sternbild"].version). Each release is written twice:
//
//   site/design/v<major>/     sternbild.css and tokens.json, always the latest release of that major version
//   site/design/<version>/    the same two files, frozen: the build refuses to change them once written
//
// Plain Node (18 or later), no dependencies. Each token becomes a CSS custom property named
// --<prefix>-<path joined by hyphens>, so palette.deep becomes --sb-palette-deep. A group whose
// org.sternbild.css extension sets "inPropertyName": false leaves its name out, so role.text becomes
// --sb-text. A reference such as "{palette.deep}" becomes var(--sb-palette-deep), so a role follows its
// palette colour. Font-family tokens with an org.sternbild.font-face extension also produce an @font-face rule.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const source = join(here, "tokens.json");
const outRoot = join(root, "site", "design");
const show = path => relative(root, path);

const sourceText = readFileSync(source, "utf8");
const tokens = JSON.parse(sourceText);
const meta = tokens.$extensions?.["org.sternbild"] ?? {};
const prefix = meta.prefix ?? "sb";
const version = meta.version;
if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) throw new Error(`tokens.json needs a version such as "1.0.0" in $extensions["org.sternbild"].version`);
const major = version.split(".")[0];
const latestDir = join(outRoot, `v${major}`);
const frozenDir = join(outRoot, version);

// ---- Collect tokens, inheriting $type and CSS settings from their groups. ------------------
const list = [];
const byPath = new Map();
(function walk(node, path, type, nameParts, css) {
  const ownType = node.$type ?? type;
  const ownCss = { ...css, ...(node.$extensions?.["org.sternbild.css"] ?? {}) };
  if ("$value" in node) {
    const token = { path, nameParts, type: ownType, value: node.$value, ext: node.$extensions ?? {}, css: ownCss };
    list.push(token);
    byPath.set(path.join("."), token);
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$") || typeof child !== "object" || child === null) continue;
    const childCss = child.$extensions?.["org.sternbild.css"] ?? {};
    const inName = !("$value" in child) && childCss.inPropertyName === false ? [] : [key];
    // The group-level switch applies to the group's own name only, not to its children.
    const inherited = { ...ownCss }; delete inherited.inPropertyName;
    walk(child, [...path, key], ownType, [...nameParts, ...inName], inherited);
  }
})(tokens, [], undefined, [], {});

const varName = token => `--${prefix}-${token.nameParts.join("-")}`;
const seen = new Map();
for (const t of list) {
  const name = varName(t);
  if (seen.has(name)) throw new Error(`${t.path.join(".")} and ${seen.get(name)} both become ${name}`);
  seen.set(name, t.path.join("."));
}

const isAlias = v => typeof v === "string" && /^\{[^}]+\}$/.test(v);
const aliasVar = v => {
  const token = byPath.get(v.slice(1, -1));
  if (!token) throw new Error(`Unknown reference ${v}`);
  return `var(${varName(token)})`;
};

// ---- Format one value as CSS. ----------------------------------------------------------
const genericFamilies = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui",
  "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "-apple-system", "BlinkMacSystemFont"]);

function format(value, type, css = {}) {
  if (css.value !== undefined) return css.value;
  if (isAlias(value)) return aliasVar(value);
  switch (type) {
    case "color": {
      if (typeof value === "string") return value;
      const alpha = value.alpha ?? 1;
      if (value.hex && alpha === 1) return value.hex;
      const [r, g, b] = value.components.map(c => Math.round(c * 255));
      return alpha === 1 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${alpha})`;
    }
    case "dimension":
    case "duration":
      return typeof value === "string" ? value : `${value.value}${value.unit}`;
    case "number":
      return css.unit ? `${value}${css.unit}` : String(value);
    case "fontWeight":
      return String(value);
    case "fontFamily":
      return (Array.isArray(value) ? value : [value])
        .map(f => (genericFamilies.has(f) ? f : `"${f}"`)).join(", ");
    case "cubicBezier":
      return `cubic-bezier(${value.join(", ")})`;
    case "gradient": {
      const stops = value.map(s => `${format(s.color, "color")} ${+(s.position * 100).toFixed(2)}%`).join(", ");
      const fn = css.function ?? "linear-gradient";
      return css.geometry ? `${fn}(${css.geometry}, ${stops})` : `${fn}(${stops})`;
    }
    default:
      throw new Error(`No CSS format for type ${type}`);
  }
}

// ---- The style sheet. Both folders sit at the same depth, so one text serves both. --------
function css(fromDir) {
  const out = [];
  out.push(`/* Sternbild design tokens ${version} */`);
  out.push("/* Generated by design/build.mjs from design/tokens.json. Do not edit by hand. */");
  out.push("");
  for (const t of list) {
    const face = t.ext["org.sternbild.font-face"];
    if (t.type !== "fontFamily" || !face) continue;
    const file = join(root, face.file);
    if (!existsSync(file)) throw new Error(`Font file missing: ${face.file}`);
    const family = Array.isArray(t.value) ? t.value[0] : t.value;
    out.push("@font-face {");
    out.push(`  font-family: "${family}";`);
    out.push(`  src: url("${relative(fromDir, file).split("\\").join("/")}") format("${face.format}");`);
    out.push(`  font-weight: ${face.weight ?? 400};`);
    out.push(`  font-style: ${face.style ?? "normal"};`);
    out.push("  font-display: swap;");
    out.push("}");
    out.push("");
  }
  out.push(":root {");
  let group = null;
  for (const t of list) {
    if (t.path[0] !== group) {
      if (group !== null) out.push("");
      group = t.path[0];
      out.push(`  /* ${group} */`);
    }
    out.push(`  ${varName(t)}: ${format(t.value, t.type, t.css)};`);
  }
  out.push("}");
  out.push("");
  return out.join("\n");
}

const sheet = css(latestDir);
if (css(frozenDir) !== sheet) throw new Error("The versioned folders must sit at the same depth");
const release = { "sternbild.css": sheet, "tokens.json": sourceText };

// ---- Compare, then write. ---------------------------------------------------------------
const read = file => (existsSync(file) ? readFileSync(file, "utf8") : null);
const newer = (a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };

const problems = [];
for (const [name, text] of Object.entries(release)) {
  const current = read(join(frozenDir, name));
  if (current !== null && current !== text) problems.push(`${show(join(frozenDir, name))} is a published release and differs from the tokens. Raise the version in design/tokens.json.`);
}
const latestTokens = read(join(latestDir, "tokens.json"));
const latestVersion = latestTokens && JSON.parse(latestTokens).$extensions?.["org.sternbild"]?.version;
if (latestVersion && newer(latestVersion, version)) problems.push(`${show(latestDir)} holds ${latestVersion}, which is newer than ${version}.`);

if (process.argv.includes("--check")) {
  for (const [name, text] of Object.entries(release)) {
    if (read(join(latestDir, name)) !== text) problems.push(`${show(join(latestDir, name))} is missing or out of date. Run: node design/build.mjs`);
    if (read(join(frozenDir, name)) === null) problems.push(`${show(join(frozenDir, name))} is missing. Run: node design/build.mjs`);
  }
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  console.log(`Release ${version} is up to date in ${show(latestDir)} and ${show(frozenDir)} (${list.length} tokens).`);
} else {
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  for (const dir of [latestDir, frozenDir]) {
    mkdirSync(dir, { recursive: true });
    for (const [name, text] of Object.entries(release)) if (read(join(dir, name)) !== text) writeFileSync(join(dir, name), text);
  }
  console.log(`Wrote release ${version} to ${show(latestDir)} and ${show(frozenDir)} (${list.length} tokens).`);
}
