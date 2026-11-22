// Builds a release of the Sternbild design tokens from design/tokens.json.
//
//   node design/build.mjs           write the release, lib/tokens.ts, and native token packages
//   node design/build.mjs --check   exit 1 if any generated or version-synced file differs (npm run tokens:check)
//
// The version is read from tokens.json ($extensions["org.sternbild"].version). Each release is written twice into
// public/, which the Next.js static export publishes as it is:
//
//   public/design/v<major>/     sternbild.css and tokens.json, always the latest release of that major version
//   public/design/<version>/    the same two files, frozen: the build refuses to change them once written
//
// The build also writes:
//
//   lib/tokens.ts                                      typed module for the site's own pages
//   packages/sternbild-tokens/src/tokens.rs            Rust token constants for desktop and CLI crates
//   packages/sternbild-tokens-c/include/sternbild_tokens.h  C11/C++20 header for native applications
//
// It also syncs (or checks under --check) the package version in packages/sternbild-tokens/Cargo.toml and
// packages/sternbild-tokens-c/CMakeLists.txt.
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
const publicRoot = join(root, "public");
const outRoot = join(publicRoot, "design");
const moduleFile = join(root, "lib", "tokens.ts");
const rustTokensFile = join(root, "packages", "sternbild-tokens", "src", "tokens.rs");
const rustCargoFile = join(root, "packages", "sternbild-tokens", "Cargo.toml");
const cHeaderFile = join(root, "packages", "sternbild-tokens-c", "include", "sternbild_tokens.h");
const cmakeFile = join(root, "packages", "sternbild-tokens-c", "CMakeLists.txt");
const show = path => relative(root, path);

const sourceText = readFileSync(source, "utf8");
const tokens = JSON.parse(sourceText);
const meta = tokens.$extensions?.["org.sternbild"] ?? {};
const prefix = meta.prefix ?? "sb";
const version = meta.version;
if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
  throw new Error(`tokens.json needs a version such as "1.0.0" in $extensions["org.sternbild"].version`);
}
const [major, minor, patch] = version.split(".");
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
    // A font-face file is named by its place in the published site. Release 1.0.0 wrote it with the folder the
    // site was published from at the time, site/; that folder is now public/. tokens.json is frozen with each
    // release, so both spellings are read.
    const file = join(publicRoot, face.file.replace(/^(site|public)\//, ""));
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

// ---- Resolve token references and native scalar values. ------------------------------------
function resolve(value) {
  if (isAlias(value)) {
    const token = byPath.get(value.slice(1, -1));
    if (!token) throw new Error(`Unknown reference ${value}`);
    return resolve(token.value);
  }
  if (Array.isArray(value)) return value.map(resolve);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v)]));
  return value;
}

function parseHexColor(hexStr, alpha = 1) {
  const clean = hexStr.trim().toLowerCase();
  const m6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(clean);
  if (m6) {
    const r = Number.parseInt(m6[1], 16);
    const g = Number.parseInt(m6[2], 16);
    const b = Number.parseInt(m6[3], 16);
    const a = Math.round(alpha * 255);
    return { hex: clean, r, g, b, a };
  }
  const m8 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(clean);
  if (m8) {
    const r = Number.parseInt(m8[1], 16);
    const g = Number.parseInt(m8[2], 16);
    const b = Number.parseInt(m8[3], 16);
    const a = Number.parseInt(m8[4], 16);
    return { hex: `#${m8[1]}${m8[2]}${m8[3]}`, r, g, b, a };
  }
  throw new Error(`Unsupported color hex format: ${hexStr}`);
}

function resolveColor(token) {
  const val = resolve(token.value);
  let parsed;
  if (typeof val === "string") {
    parsed = parseHexColor(val, 1);
  } else {
    const alpha = val.alpha ?? 1;
    if (val.hex) {
      parsed = parseHexColor(val.hex, alpha);
    } else {
      const [r, g, b] = val.components.map(c => Math.round(c * 255));
      const a = Math.round(alpha * 255);
      const hex = `#${[r, g, b].map(x => x.toString(16).padStart(2, "0")).join("")}`;
      parsed = { hex, r, g, b, a };
    }
  }
  const imu32 = (((parsed.a << 24) | (parsed.b << 16) | (parsed.g << 8) | parsed.r) >>> 0);
  return { ...parsed, imu32 };
}

function resolveDimension(token) {
  const val = resolve(token.value);
  if (typeof val === "number") return val;
  if (val && typeof val === "object" && typeof val.value === "number") return val.value;
  throw new Error(`Expected numeric dimension for ${token.path.join(".")}`);
}

function resolveDurationMs(token) {
  const val = resolve(token.value);
  if (val && typeof val === "object" && typeof val.value === "number") {
    if (val.unit === "ms") return Math.round(val.value);
    if (val.unit === "s") return Math.round(val.value * 1000);
  }
  throw new Error(`Expected duration in ms or s for ${token.path.join(".")}`);
}

const tokensInGroup = (...prefixPath) =>
  list.filter(t => t.path.length === prefixPath.length + 1 && prefixPath.every((seg, i) => t.path[i] === seg));

const requireToken = pathStr => {
  const token = byPath.get(pathStr);
  if (!token) throw new Error(`Missing required token: ${pathStr}`);
  return token;
};

const toUpperIdent = name => name.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase();
const toLowerIdent = name => name.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase();
const hexByte = n => `0x${n.toString(16).padStart(2, "0")}`;
const hexU32 = n => `0x${n.toString(16).padStart(8, "0")}`;
const fmtF32 = n => {
  const s = String(n);
  return s.includes(".") || s.includes("e") || s.includes("E") ? s : `${s}.0`;
};
const fmtCFloat = n => `${fmtF32(n)}f`;

// ---- The typed module for the site's own pages. --------------------------------------------
function typedModule() {
  const out = [];
  out.push(`// Sternbild design tokens ${version}, as a typed module for the site's own pages.`);
  out.push("// Generated by design/build.mjs from design/tokens.json. Do not edit by hand.");
  out.push("");
  out.push(`export const version = ${JSON.stringify(version)};`);
  out.push(`export const prefix = ${JSON.stringify(prefix)};`);
  out.push("");
  out.push("export const tokens = {");
  for (const t of list) {
    const entry = { name: varName(t), type: t.type, value: resolve(t.value) };
    if (isAlias(t.value)) entry.alias = t.value.slice(1, -1);
    entry.css = format(t.value, t.type, t.css);
    out.push(`  ${JSON.stringify(t.path.join("."))}: ${JSON.stringify(entry)},`);
  }
  out.push("} as const;");
  out.push("");
  out.push("export type Tokens = typeof tokens;");
  out.push("export type TokenPath = keyof Tokens;");
  out.push("type PathOf<Type extends string> = { [P in TokenPath]: Tokens[P][\"type\"] extends Type ? P : never }[TokenPath];");
  out.push("export type ColorPath = PathOf<\"color\">;");
  out.push("export type DimensionPath = PathOf<\"dimension\">;");
  out.push("");
  out.push("/** The CSS reference to a token's custom property, such as var(--sb-palette-deep). */");
  out.push("export const cssVar = <P extends TokenPath>(path: P) => `var(${tokens[path].name})` as const;");
  out.push("");
  out.push("/** A colour token's hex value, with any reference resolved. */");
  out.push("export const hex = (path: ColorPath): string => tokens[path].value.hex;");
  out.push("");
  out.push("/** A dimension token's value in its own unit, with any reference resolved. */");
  out.push("export const amount = (path: DimensionPath): number => tokens[path].value.value;");
  out.push("");
  return out.join("\n");
}
const moduleText = typedModule();

// ---- Rust token module (packages/sternbild-tokens/src/tokens.rs). --------------------------
function rustColorConst(ident, token) {
  const c = resolveColor(token);
  const roleName = token.path[token.path.length - 1];
  return [
    `    pub const ${ident}: Color = Color {`,
    `        name: ${JSON.stringify(roleName)},`,
    `        css_var: ${JSON.stringify(varName(token))},`,
    `        hex: ${JSON.stringify(c.hex)},`,
    `        r: ${hexByte(c.r)},`,
    `        g: ${hexByte(c.g)},`,
    `        b: ${hexByte(c.b)},`,
    `        a: ${hexByte(c.a)},`,
    `    };`,
  ].join("\n");
}

function rustModule() {
  const out = [];
  out.push(`// Sternbild design tokens ${version}.`);
  out.push("// Generated by design/build.mjs from design/tokens.json. Do not edit by hand.");
  out.push("");
  out.push(`pub const VERSION: &str = ${JSON.stringify(version)};`);
  out.push(`pub const PREFIX: &str = ${JSON.stringify(prefix)};`);
  out.push("");
  out.push("#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]");
  out.push("pub struct Color {");
  out.push("    pub name: &'static str,");
  out.push("    pub css_var: &'static str,");
  out.push("    pub hex: &'static str,");
  out.push("    pub r: u8,");
  out.push("    pub g: u8,");
  out.push("    pub b: u8,");
  out.push("    pub a: u8,");
  out.push("}");
  out.push("");
  out.push("impl Color {");
  out.push("    pub const fn rgb(self) -> [u8; 3] {");
  out.push("        [self.r, self.g, self.b]");
  out.push("    }");
  out.push("");
  out.push("    pub const fn rgba(self) -> [u8; 4] {");
  out.push("        [self.r, self.g, self.b, self.a]");
  out.push("    }");
  out.push("}");
  out.push("");

  // role
  const roleTokens = tokensInGroup("role");
  out.push("pub mod role {");
  out.push("    use super::Color;");
  out.push("");
  const roleIdents = [];
  for (const t of roleTokens) {
    const ident = toUpperIdent(t.path[1]);
    roleIdents.push(ident);
    out.push(rustColorConst(ident, t));
  }
  out.push("");
  out.push(`    pub const ALL: &[Color] = &[${roleIdents.join(", ")}];`);
  out.push("}");
  out.push("");

  // data
  const dataTokens = tokensInGroup("data");
  out.push("pub mod data {");
  out.push("    use super::Color;");
  out.push("");
  const dataIdents = [];
  for (const t of dataTokens) {
    const ident = toUpperIdent(t.path[1]);
    dataIdents.push(ident);
    out.push(rustColorConst(ident, t));
  }
  out.push("");
  out.push(`    pub const SERIES: [Color; ${dataIdents.length}] = [${dataIdents.join(", ")}];`);
  out.push(`    pub const ALL: &[Color] = &[${dataIdents.join(", ")}];`);
  out.push("}");
  out.push("");

  // mark
  const markTokens = tokensInGroup("mark");
  out.push("pub mod mark {");
  out.push("    use super::Color;");
  out.push("");
  const markIdents = [];
  for (const t of markTokens) {
    const ident = toUpperIdent(t.path[1]);
    markIdents.push(ident);
    out.push(rustColorConst(ident, t));
  }
  out.push("");
  out.push(`    pub const ALL: &[Color] = &[${markIdents.join(", ")}];`);
  out.push("}");
  out.push("");

  // font
  out.push("pub mod font {");
  out.push("    pub mod family {");
  for (const t of tokensInGroup("font", "family")) {
    const ident = toUpperIdent(t.path[2]);
    const stack = resolve(t.value);
    const items = (Array.isArray(stack) ? stack : [stack]).map(s => JSON.stringify(s)).join(", ");
    out.push(`        pub const ${ident}: &[&str] = &[${items}];`);
  }
  out.push("    }");
  out.push("");
  out.push("    pub mod weight {");
  for (const t of tokensInGroup("font", "weight")) {
    const ident = toUpperIdent(t.path[2]);
    out.push(`        pub const ${ident}: u16 = ${resolve(t.value)};`);
  }
  out.push("    }");
  out.push("");
  out.push("    pub mod size {");
  for (const t of tokensInGroup("font", "size")) {
    const ident = toUpperIdent(t.path[2]);
    out.push(`        pub const ${ident}: f32 = ${fmtF32(resolveDimension(t))};`);
  }
  out.push("    }");
  out.push("}");
  out.push("");

  // tracking
  out.push("pub mod tracking {");
  for (const t of tokensInGroup("tracking")) {
    const ident = toUpperIdent(t.path[1]);
    out.push(`    pub const ${ident}: f32 = ${fmtF32(resolve(t.value))};`);
  }
  out.push("}");
  out.push("");

  // leading
  out.push("pub mod leading {");
  for (const t of tokensInGroup("leading")) {
    const ident = toUpperIdent(t.path[1]);
    out.push(`    pub const ${ident}: f32 = ${fmtF32(resolve(t.value))};`);
  }
  out.push("}");
  out.push("");

  // space
  out.push("pub mod space {");
  for (const t of tokensInGroup("space")) {
    const ident = `S${toUpperIdent(t.path[1])}`;
    out.push(`    pub const ${ident}: f32 = ${fmtF32(resolveDimension(t))};`);
  }
  out.push("}");
  out.push("");

  // layout
  out.push("pub mod layout {");
  for (const t of tokensInGroup("layout")) {
    const ident = toUpperIdent(t.path[1]);
    out.push(`    pub const ${ident}: f32 = ${fmtF32(resolveDimension(t))};`);
  }
  out.push("}");
  out.push("");

  // logo
  out.push("pub mod logo {");
  for (const t of tokensInGroup("logo")) {
    const ident = toUpperIdent(t.path[1]);
    const val = t.type === "dimension" ? resolveDimension(t) : resolve(t.value);
    out.push(`    pub const ${ident}: f32 = ${fmtF32(val)};`);
  }
  out.push("}");
  out.push("");

  // rule
  out.push("pub mod rule {");
  for (const t of tokensInGroup("rule")) {
    const ident = toUpperIdent(t.path[1]);
    out.push(`    pub const ${ident}: f32 = ${fmtF32(resolveDimension(t))};`);
  }
  out.push("}");
  out.push("");

  // radius and cut
  out.push(`pub const RADIUS: f32 = ${fmtF32(resolveDimension(requireToken("radius")))};`);
  out.push(`pub const CUT: f32 = ${fmtF32(resolveDimension(requireToken("cut")))};`);
  out.push("");

  // motion
  out.push("pub mod motion {");
  out.push("    pub mod duration {");
  for (const t of tokensInGroup("motion", "duration")) {
    const ident = `${toUpperIdent(t.path[2])}_MS`;
    out.push(`        pub const ${ident}: u32 = ${resolveDurationMs(t)};`);
  }
  out.push("    }");
  out.push("");
  out.push("    pub mod easing {");
  for (const t of tokensInGroup("motion", "easing")) {
    const ident = toUpperIdent(t.path[2]);
    const pts = resolve(t.value).map(fmtF32).join(", ");
    out.push(`        pub const ${ident}: [f32; 4] = [${pts}];`);
  }
  out.push("    }");
  out.push("}");
  out.push("");

  // app
  out.push("pub mod app {");
  for (const t of tokensInGroup("app")) {
    const ident = toUpperIdent(t.path[1]);
    out.push(`    pub const ${ident}: f32 = ${fmtF32(resolveDimension(t))};`);
  }
  out.push("");
  out.push("    pub mod font_size {");
  for (const t of tokensInGroup("app", "font-size")) {
    const ident = toUpperIdent(t.path[2]);
    out.push(`        pub const ${ident}: f32 = ${fmtF32(resolveDimension(t))};`);
  }
  out.push("    }");
  out.push("}");
  out.push("");

  return out.join("\n");
}
const rustTokensText = rustModule();

// ---- C11 / C++20 header (packages/sternbild-tokens-c/include/sternbild_tokens.h). ----------
function cColorMacros(groupUpper, token) {
  const c = resolveColor(token);
  const key = token.path[token.path.length - 1];
  const ident = `${groupUpper}_${toUpperIdent(key)}`;
  const init = `{ ${JSON.stringify(key)}, ${JSON.stringify(varName(token))}, ${JSON.stringify(c.hex)}, ${hexByte(c.r)}u, ${hexByte(c.g)}u, ${hexByte(c.b)}u, ${hexByte(c.a)}u, ${hexU32(c.imu32)}u }`;
  return {
    ident,
    key,
    init,
    lines: [
      `#define SB_${ident}_HEX ${JSON.stringify(c.hex)}`,
      `#define SB_${ident}_R ${hexByte(c.r)}u`,
      `#define SB_${ident}_G ${hexByte(c.g)}u`,
      `#define SB_${ident}_B ${hexByte(c.b)}u`,
      `#define SB_${ident}_A ${hexByte(c.a)}u`,
      `#define SB_${ident}_IMU32 ${hexU32(c.imu32)}u`,
      `#define SB_${ident}_INIT ${init}`,
    ],
  };
}

function cHeader() {
  const out = [];
  out.push(`/* Sternbild design tokens ${version}. */`);
  out.push("/* Generated by design/build.mjs from design/tokens.json. Do not edit by hand. */");
  out.push("#ifndef STERNBILD_TOKENS_H");
  out.push("#define STERNBILD_TOKENS_H");
  out.push("");
  out.push("#include <stdint.h>");
  out.push("");
  out.push(`#define STERNBILD_TOKENS_VERSION ${JSON.stringify(version)}`);
  out.push(`#define STERNBILD_TOKENS_VERSION_MAJOR ${Number(major)}`);
  out.push(`#define STERNBILD_TOKENS_VERSION_MINOR ${Number(minor)}`);
  out.push(`#define STERNBILD_TOKENS_VERSION_PATCH ${Number(patch)}`);
  out.push(`#define STERNBILD_TOKENS_PREFIX ${JSON.stringify(prefix)}`);
  out.push("");
  out.push("#define SB_IMU32(r, g, b, a) \\");
  out.push("  (((uint32_t)(uint8_t)(a) << 24) | ((uint32_t)(uint8_t)(b) << 16) | \\");
  out.push("   ((uint32_t)(uint8_t)(g) << 8) | (uint32_t)(uint8_t)(r))");
  out.push("");
  out.push("#if defined(__GNUC__) || defined(__clang__)");
  out.push("#define SB_MAYBE_UNUSED __attribute__((unused))");
  out.push("#else");
  out.push("#define SB_MAYBE_UNUSED");
  out.push("#endif");
  out.push("");
  out.push("typedef struct sb_color_t {");
  out.push("  const char* name;");
  out.push("  const char* css_var;");
  out.push("  const char* hex;");
  out.push("  uint8_t r;");
  out.push("  uint8_t g;");
  out.push("  uint8_t b;");
  out.push("  uint8_t a;");
  out.push("  uint32_t imu32;");
  out.push("} sb_color_t;");
  out.push("");

  // Color groups: role, data, mark
  const colorGroups = [
    { group: "role", upper: "ROLE", hasSeries: false },
    { group: "data", upper: "DATA", hasSeries: true },
    { group: "mark", upper: "MARK", hasSeries: false },
  ];

  const groupMeta = new Map();
  for (const { group, upper, hasSeries } of colorGroups) {
    const groupTokens = tokensInGroup(group);
    const items = groupTokens.map(t => cColorMacros(upper, t));
    groupMeta.set(group, items);
    out.push(`/* ${group} */`);
    out.push(`#define SB_${upper}_COUNT ${items.length}u`);
    for (const item of items) {
      out.push(...item.lines);
    }
    out.push("");
    for (const item of items) {
      out.push(`static const sb_color_t SB_MAYBE_UNUSED SB_${item.ident} = SB_${item.ident}_INIT;`);
    }
    out.push("");
    if (hasSeries) {
      out.push(`static const sb_color_t SB_MAYBE_UNUSED SB_${upper}_SERIES[${items.length}] = {`);
      for (const item of items) out.push(`  SB_${item.ident}_INIT,`);
      out.push("};");
      out.push("");
    }
    out.push(`static const sb_color_t SB_MAYBE_UNUSED SB_${upper}_ALL[${items.length}] = {`);
    for (const item of items) out.push(`  SB_${item.ident}_INIT,`);
    out.push("};");
    out.push("");
  }

  // Font
  out.push("/* font */");
  for (const t of tokensInGroup("font", "family")) {
    const ident = toUpperIdent(t.path[2]);
    const stack = resolve(t.value);
    const primary = Array.isArray(stack) ? stack[0] : stack;
    out.push(`#define SB_FONT_FAMILY_${ident} ${JSON.stringify(primary)}`);
    out.push(`#define SB_FONT_FAMILY_${ident}_CSS ${JSON.stringify(format(t.value, t.type, t.css))}`);
  }
  for (const t of tokensInGroup("font", "weight")) {
    const ident = toUpperIdent(t.path[2]);
    out.push(`#define SB_FONT_WEIGHT_${ident} ${resolve(t.value)}u`);
  }
  for (const t of tokensInGroup("font", "size")) {
    const ident = toUpperIdent(t.path[2]);
    out.push(`#define SB_FONT_SIZE_${ident} ${fmtCFloat(resolveDimension(t))}`);
  }
  out.push("");

  // Tracking
  out.push("/* tracking */");
  for (const t of tokensInGroup("tracking")) {
    out.push(`#define SB_TRACKING_${toUpperIdent(t.path[1])} ${fmtCFloat(resolve(t.value))}`);
  }
  out.push("");

  // Leading
  out.push("/* leading */");
  for (const t of tokensInGroup("leading")) {
    out.push(`#define SB_LEADING_${toUpperIdent(t.path[1])} ${fmtCFloat(resolve(t.value))}`);
  }
  out.push("");

  // Space
  out.push("/* space */");
  for (const t of tokensInGroup("space")) {
    out.push(`#define SB_SPACE_${toUpperIdent(t.path[1])} ${fmtCFloat(resolveDimension(t))}`);
  }
  out.push("");

  // Layout
  out.push("/* layout */");
  for (const t of tokensInGroup("layout")) {
    out.push(`#define SB_LAYOUT_${toUpperIdent(t.path[1])} ${fmtCFloat(resolveDimension(t))}`);
  }
  out.push("");

  // Logo, rule, radius, cut
  out.push("/* logo, rule, radius, cut */");
  for (const t of tokensInGroup("logo")) {
    const val = t.type === "dimension" ? resolveDimension(t) : resolve(t.value);
    out.push(`#define SB_LOGO_${toUpperIdent(t.path[1])} ${fmtCFloat(val)}`);
  }
  for (const t of tokensInGroup("rule")) {
    out.push(`#define SB_RULE_${toUpperIdent(t.path[1])} ${fmtCFloat(resolveDimension(t))}`);
  }
  out.push(`#define SB_RADIUS ${fmtCFloat(resolveDimension(requireToken("radius")))}`);
  out.push(`#define SB_CUT ${fmtCFloat(resolveDimension(requireToken("cut")))}`);
  out.push("");

  // Motion
  out.push("/* motion */");
  for (const t of tokensInGroup("motion", "duration")) {
    out.push(`#define SB_MOTION_DURATION_${toUpperIdent(t.path[2])}_MS ${resolveDurationMs(t)}u`);
  }
  for (const t of tokensInGroup("motion", "easing")) {
    const ident = toUpperIdent(t.path[2]);
    const [x1, y1, x2, y2] = resolve(t.value);
    out.push(`#define SB_MOTION_EASING_${ident}_X1 ${fmtCFloat(x1)}`);
    out.push(`#define SB_MOTION_EASING_${ident}_Y1 ${fmtCFloat(y1)}`);
    out.push(`#define SB_MOTION_EASING_${ident}_X2 ${fmtCFloat(x2)}`);
    out.push(`#define SB_MOTION_EASING_${ident}_Y2 ${fmtCFloat(y2)}`);
  }
  out.push("");

  // App metrics
  out.push("/* app */");
  for (const t of tokensInGroup("app")) {
    out.push(`#define SB_APP_${toUpperIdent(t.path[1])} ${fmtCFloat(resolveDimension(t))}`);
  }
  for (const t of tokensInGroup("app", "font-size")) {
    out.push(`#define SB_APP_FONT_SIZE_${toUpperIdent(t.path[2])} ${fmtCFloat(resolveDimension(t))}`);
  }
  out.push("");

  // C++ namespace
  out.push("#ifdef __cplusplus");
  out.push("#include <array>");
  out.push("#include <cstdint>");
  out.push("");
  out.push("namespace sternbild::tokens {");
  out.push("");
  out.push("inline constexpr const char* VERSION = STERNBILD_TOKENS_VERSION;");
  out.push("inline constexpr const char* PREFIX = STERNBILD_TOKENS_PREFIX;");
  out.push("using Color = sb_color_t;");
  out.push("");

  for (const { group, hasSeries } of colorGroups) {
    const items = groupMeta.get(group);
    out.push(`namespace ${group} {`);
    for (const item of items) {
      out.push(`inline constexpr Color ${toLowerIdent(item.key)} = SB_${item.ident}_INIT;`);
    }
    const lowerList = items.map(item => toLowerIdent(item.key)).join(", ");
    if (hasSeries) {
      out.push(`inline constexpr std::array<Color, ${items.length}> series = {${lowerList}};`);
    }
    out.push(`inline constexpr std::array<Color, ${items.length}> all = {${lowerList}};`);
    out.push(`}  // namespace ${group}`);
    out.push("");
  }

  // C++ font
  out.push("namespace font {");
  out.push("namespace family {");
  for (const t of tokensInGroup("font", "family")) {
    const lower = toLowerIdent(t.path[2]);
    const stack = resolve(t.value);
    const items = (Array.isArray(stack) ? stack : [stack]).map(s => JSON.stringify(s));
    out.push(`inline constexpr std::array<const char*, ${items.length}> ${lower} = {${items.join(", ")}};`);
  }
  out.push("}  // namespace family");
  out.push("");
  out.push("namespace weight {");
  for (const t of tokensInGroup("font", "weight")) {
    out.push(`inline constexpr uint16_t ${toLowerIdent(t.path[2])} = SB_FONT_WEIGHT_${toUpperIdent(t.path[2])};`);
  }
  out.push("}  // namespace weight");
  out.push("");
  out.push("namespace size {");
  for (const t of tokensInGroup("font", "size")) {
    out.push(`inline constexpr float ${toLowerIdent(t.path[2])} = SB_FONT_SIZE_${toUpperIdent(t.path[2])};`);
  }
  out.push("}  // namespace size");
  out.push("}  // namespace font");
  out.push("");

  // C++ tracking
  out.push("namespace tracking {");
  for (const t of tokensInGroup("tracking")) {
    out.push(`inline constexpr float ${toLowerIdent(t.path[1])} = SB_TRACKING_${toUpperIdent(t.path[1])};`);
  }
  out.push("}  // namespace tracking");
  out.push("");

  // C++ leading
  out.push("namespace leading {");
  for (const t of tokensInGroup("leading")) {
    out.push(`inline constexpr float ${toLowerIdent(t.path[1])} = SB_LEADING_${toUpperIdent(t.path[1])};`);
  }
  out.push("}  // namespace leading");
  out.push("");

  // C++ space
  out.push("namespace space {");
  for (const t of tokensInGroup("space")) {
    out.push(`inline constexpr float s${toLowerIdent(t.path[1])} = SB_SPACE_${toUpperIdent(t.path[1])};`);
  }
  out.push("}  // namespace space");
  out.push("");

  // C++ layout
  out.push("namespace layout {");
  for (const t of tokensInGroup("layout")) {
    out.push(`inline constexpr float ${toLowerIdent(t.path[1])} = SB_LAYOUT_${toUpperIdent(t.path[1])};`);
  }
  out.push("}  // namespace layout");
  out.push("");

  // C++ logo
  out.push("namespace logo {");
  for (const t of tokensInGroup("logo")) {
    out.push(`inline constexpr float ${toLowerIdent(t.path[1])} = SB_LOGO_${toUpperIdent(t.path[1])};`);
  }
  out.push("}  // namespace logo");
  out.push("");

  // C++ rule, RADIUS, CUT
  out.push("namespace rule {");
  for (const t of tokensInGroup("rule")) {
    out.push(`inline constexpr float ${toLowerIdent(t.path[1])} = SB_RULE_${toUpperIdent(t.path[1])};`);
  }
  out.push("}  // namespace rule");
  out.push("");
  out.push("inline constexpr float RADIUS = SB_RADIUS;");
  out.push("inline constexpr float CUT = SB_CUT;");
  out.push("");

  // C++ motion
  out.push("namespace motion {");
  out.push("namespace duration {");
  for (const t of tokensInGroup("motion", "duration")) {
    const key = toLowerIdent(t.path[2]);
    out.push(`inline constexpr uint32_t ${key}_ms = SB_MOTION_DURATION_${toUpperIdent(t.path[2])}_MS;`);
  }
  out.push("}  // namespace duration");
  out.push("namespace easing {");
  for (const t of tokensInGroup("motion", "easing")) {
    const lower = toLowerIdent(t.path[2]);
    const upper = toUpperIdent(t.path[2]);
    out.push(`inline constexpr std::array<float, 4> ${lower} = {`);
    out.push(`    SB_MOTION_EASING_${upper}_X1, SB_MOTION_EASING_${upper}_Y1,`);
    out.push(`    SB_MOTION_EASING_${upper}_X2, SB_MOTION_EASING_${upper}_Y2,`);
    out.push("};");
  }
  out.push("}  // namespace easing");
  out.push("}  // namespace motion");
  out.push("");

  // C++ app
  out.push("namespace app {");
  for (const t of tokensInGroup("app")) {
    out.push(`inline constexpr float ${toLowerIdent(t.path[1])} = SB_APP_${toUpperIdent(t.path[1])};`);
  }
  out.push("namespace font_size {");
  for (const t of tokensInGroup("app", "font-size")) {
    out.push(`inline constexpr float ${toLowerIdent(t.path[2])} = SB_APP_FONT_SIZE_${toUpperIdent(t.path[2])};`);
  }
  out.push("}  // namespace font_size");
  out.push("}  // namespace app");
  out.push("");
  out.push("}  // namespace sternbild::tokens");
  out.push("#endif  // __cplusplus");
  out.push("");
  out.push("#endif  // STERNBILD_TOKENS_H");
  out.push("");
  return out.join("\n");
}
const cHeaderText = cHeader();

// ---- Version sync helpers for Cargo.toml and CMakeLists.txt. -------------------------------
function syncCargoVersion(text) {
  const updated = text.replace(
    /(\[package\][\s\S]*?\nversion\s*=\s*")[^"]+(")/,
    `$1${version}$2`,
  );
  if (updated === text && !new RegExp(`\\[package\\][\\s\\S]*?\\nversion\\s*=\\s*"${version.replace(/\./g, "\\.")}"`).test(text)) {
    throw new Error(`Could not locate [package] version in ${show(rustCargoFile)}`);
  }
  return updated;
}

function syncCmakeVersion(text) {
  const pattern = /project\(sternbild-tokens\s+VERSION\s+[0-9]+\.[0-9]+\.[0-9]+\s+LANGUAGES\s+NONE\)/;
  if (!pattern.test(text)) {
    throw new Error(`Could not locate project(sternbild-tokens VERSION ... LANGUAGES NONE) in ${show(cmakeFile)}`);
  }
  return text.replace(pattern, `project(sternbild-tokens VERSION ${version} LANGUAGES NONE)`);
}

// ---- Compare, then write. ---------------------------------------------------------------
const read = file => (existsSync(file) ? readFileSync(file, "utf8") : null);
const newer = (a, b) => {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

const problems = [];
for (const [name, text] of Object.entries(release)) {
  const current = read(join(frozenDir, name));
  if (current !== null && current !== text) {
    problems.push(`${show(join(frozenDir, name))} is a published release and differs from the tokens. Raise the version in design/tokens.json.`);
  }
}
const latestTokens = read(join(latestDir, "tokens.json"));
const latestVersion = latestTokens && JSON.parse(latestTokens).$extensions?.["org.sternbild"]?.version;
if (latestVersion && newer(latestVersion, version)) {
  problems.push(`${show(latestDir)} holds ${latestVersion}, which is newer than ${version}.`);
}

const currentCargo = read(rustCargoFile);
const expectedCargo = currentCargo === null ? null : syncCargoVersion(currentCargo);
const currentCmake = read(cmakeFile);
const expectedCmake = currentCmake === null ? null : syncCmakeVersion(currentCmake);

if (process.argv.includes("--check")) {
  for (const [name, text] of Object.entries(release)) {
    if (read(join(latestDir, name)) !== text) problems.push(`${show(join(latestDir, name))} is missing or out of date. Run: node design/build.mjs`);
    if (read(join(frozenDir, name)) === null) problems.push(`${show(join(frozenDir, name))} is missing. Run: node design/build.mjs`);
  }
  if (read(moduleFile) !== moduleText) problems.push(`${show(moduleFile)} is missing or out of date. Run: node design/build.mjs`);
  if (read(rustTokensFile) !== rustTokensText) problems.push(`${show(rustTokensFile)} is missing or out of date. Run: node design/build.mjs`);
  if (currentCargo === null || currentCargo !== expectedCargo) {
    problems.push(`${show(rustCargoFile)} is missing or does not match version ${version}. Run: node design/build.mjs`);
  }
  if (read(cHeaderFile) !== cHeaderText) problems.push(`${show(cHeaderFile)} is missing or out of date. Run: node design/build.mjs`);
  if (currentCmake === null || currentCmake !== expectedCmake) {
    problems.push(`${show(cmakeFile)} is missing or does not match version ${version}. Run: node design/build.mjs`);
  }
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  console.log(
    `Release ${version} is up to date in ${show(latestDir)}, ${show(frozenDir)}, ${show(moduleFile)}, ${show(rustTokensFile)}, and ${show(cHeaderFile)} (${list.length} tokens).`,
  );
} else {
  if (currentCargo === null) problems.push(`${show(rustCargoFile)} is missing.`);
  if (currentCmake === null) problems.push(`${show(cmakeFile)} is missing.`);
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  for (const dir of [latestDir, frozenDir]) {
    mkdirSync(dir, { recursive: true });
    for (const [name, text] of Object.entries(release)) if (read(join(dir, name)) !== text) writeFileSync(join(dir, name), text);
  }
  for (const [file, text] of [
    [moduleFile, moduleText],
    [rustTokensFile, rustTokensText],
    [rustCargoFile, expectedCargo],
    [cHeaderFile, cHeaderText],
    [cmakeFile, expectedCmake],
  ]) {
    mkdirSync(dirname(file), { recursive: true });
    if (read(file) !== text) writeFileSync(file, text);
  }
  console.log(
    `Wrote release ${version} to ${show(latestDir)}, ${show(frozenDir)}, ${show(moduleFile)}, ${show(rustTokensFile)}, and ${show(cHeaderFile)} (${list.length} tokens).`,
  );
}
