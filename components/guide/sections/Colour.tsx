import { ColourTable } from "../ColourTable";
import { DataTable } from "../DataTable";
import { Section } from "../Section";

/** A contrast ratio with its WCAG grade below it. */
function Ratio({ value, grade, low }: { value: string; grade: string; low?: boolean }) {
  return (
    <>
      {value}
      <span className={low ? "grade low" : "grade"}>{grade}</span>
    </>
  );
}

const contrast: [string, [string, string, boolean?][]][] = [
  ["parchment", [["14.38", "AAA"], ["13.65", "AAA"], ["12.56", "AAA"], ["11.09", "AAA"]]],
  ["secondary", [["9.76", "AAA"], ["9.27", "AAA"], ["8.53", "AAA"], ["7.53", "AAA"]]],
  ["faint", [["5.42", "AA"], ["5.15", "AA"], ["4.73", "AA"], ["4.18", "AA large", true]]],
  ["bronze", [["6.06", "AA"], ["5.76", "AA"], ["5.30", "AA"], ["4.68", "AA"]]],
  ["bronze-hover", [["7.40", "AAA"], ["7.02", "AAA"], ["6.46", "AA"], ["5.70", "AA"]]],
  ["white", [["18.87", "AAA"], ["17.91", "AAA"], ["16.48", "AAA"], ["14.55", "AAA"]]],
];

export function ColourSection() {
  return (
    <Section id="colour">
      <p>The ground is a warm night in three depths. Text is parchment in three strengths. Bronze is the only hue, and it is used rarely. In an application, colour belongs to the data; the chrome stays monochrome.</p>

      <h3>Palette</h3>
      <ColourTable
        head={["Token", "Hex"]}
        columns={[{ label: "Use" }]}
        rows={[
          { group: "Grounds" },
          { token: "palette.deep", label: "deep", cells: ["The website page; the application status bar, plot fields and wells"] },
          { token: "palette.ground", label: "ground", cells: ["The application window and panes"] },
          { token: "palette.plate", label: "plate", cells: ["Pane headers, menus and the selected row"] },
          { token: "palette.plate-hover", label: "plate-hover", cells: ["A hovered row, menu item or plate in an application"] },
          { token: "palette.deep-hover", label: "deep-hover", cells: ["A hovered row on the website"] },
          { group: "Rules" },
          { token: "palette.rule", label: "rule", cells: ["Rules that open a list or table, and control outlines"] },
          { token: "palette.rule-faint", label: "rule-faint", cells: ["Rules between rows; the masthead and footer rules"] },
          { group: "Text" },
          { token: "palette.parchment", label: "parchment", cells: ["Primary text, names and values"] },
          { token: "palette.secondary", label: "secondary", cells: ["Descriptions, labels and status text"] },
          { token: "palette.faint", label: "faint", cells: ["Role lines, placeholders and disabled items"] },
          { group: "Accent" },
          { token: "palette.bronze", label: "bronze", cells: ["Focus, selection, keys and section numerals"] },
          { token: "palette.bronze-hover", label: "bronze-hover", cells: ["Bronze under the pointer, on the website"] },
          { group: "The website's opening" },
          { token: "palette.aura", label: "aura", cells: ["The ground lifting toward the horizon, fading into deep"] },
          { token: "palette.construction", label: "construction", cells: ["The horizon and the rings of the opening drawing"] },
          { token: "palette.light", label: "light", cells: ["The opening's one colour of light; never text"] },
          { token: "palette.white", label: "white", cells: ["The name on the opening, and the seal"] },
        ]}
      />

      <h3>Roles</h3>
      <p>Code uses roles, not palette names, so that each colour has one job and a change to how a role looks reaches every project without an edit. Each role is a custom property of its own name, such as <code>--sb-text-muted</code>, and points at the palette.</p>
      <DataTable
        columns={[{ label: "Role", td: "key" }, { label: "Palette", td: "muted" }, { label: "Use" }]}
        rows={[
          ["background", "deep", "The website page"],
          ["background-app", "ground", "The application window and panes"],
          ["well", "deep", "Status bar, plot fields and wells"],
          ["surface", "plate", "Pane headers and menus"],
          ["surface-hover", "plate-hover", "A hovered row or plate in an application"],
          ["selected", "plate", "The selected row, with its text in bronze"],
          ["row-hover", "deep-hover", "A hovered row on the website"],
          ["rule", "rule", "Opening rules and control outlines"],
          ["rule-faint", "rule-faint", "Rules between rows"],
          ["text", "parchment", "Primary text"],
          ["text-muted", "secondary", "Secondary text"],
          ["text-faint", "faint", "Faint text"],
          ["accent", "bronze", "The single accent"],
          ["accent-hover", "bronze-hover", "The accent under the pointer, on the website"],
          ["focus", "bronze", "The 1 px keyboard focus outline"],
        ]}
      />

      <h3>Bronze</h3>
      <p>Bronze marks where the reader is and what is chosen, and nothing else. It appears in these places only.</p>
      <ul className="bronze-uses">
        <li>Section numerals, as on this page.</li>
        <li>Keyboard focus, as a 1&nbsp;px outline.</li>
        <li>Selection: the text of the selected row, and the title and closing rule of the pane that has focus.</li>
        <li>Keys on buttons under the pointer, and the key of the primary action.</li>
        <li>On the website, a name or an arrow under the pointer, in bronze-hover.</li>
        <li>In each mark, exactly one accent.</li>
      </ul>
      <p>Bronze is never a fill, a button, a heading or running text.</p>

      <h3>Contrast</h3>
      <p>Ratios follow WCAG 2.2. AAA needs 7:1 for normal text; AA needs 4.5:1 for normal text and 3:1 for large text, which is 24&nbsp;px, or 18.66&nbsp;px when bold. Every text colour passes AA on every ground except faint on plate-hover, which passes only for large text. Ratios are cut, not rounded, to two decimals.</p>
      <DataTable
        className="contrast"
        columns={[
          { label: "Text", td: "key" },
          { label: "deep", th: "num", td: "num" },
          { label: "ground", th: "num", td: "num" },
          { label: "plate", th: "num", td: "num" },
          { label: "plate-hover", th: "num", td: "num" },
        ]}
        rows={contrast.map(([text, ratios]) => [text, ...ratios.map(([value, grade, low]) => <Ratio key={value} value={value} grade={grade} low={low} />)])}
      />
      <p>On deep-hover, the website&apos;s hovered row, every pair passes AA; faint is the lowest at 5.24. A pair marked AA also passes AAA for large text. Rules are separators, not text: rule on deep is 2.10:1 and rule-faint is 1.33:1. An outline that is the only sign of a control needs 3:1, so such outlines are drawn in parchment, as the primary action is.</p>

      <h3>Data</h3>
      <p>Plots colour their classes with five pigments in a fixed order, never cycled. The pigments are for data only. Text never takes a data colour; a dot beside the word carries it.</p>
      <ColourTable
        head={["Order and token", "Hex"]}
        columns={[{ label: "On deep", th: "num", td: "num" }, { label: "On ground", th: "num", td: "num" }]}
        rows={[
          { token: "data.smalt", label: "1 smalt", cells: ["4.04", "3.84"] },
          { token: "data.verdigris", label: "2 verdigris", cells: ["6.60", "6.26"] },
          { token: "data.olive-ochre", label: "3 olive-ochre", cells: ["4.07", "3.87"] },
          { token: "data.madder", label: "4 madder", cells: ["3.83", "3.64"] },
          { token: "data.slate", label: "5 slate", cells: ["2.42", "2.30"] },
        ]}
      />
      <p>The first four pass the 3:1 that WCAG asks of graphics. Slate is the remainder class and recedes on purpose, so it always needs a key and a direct label.</p>

      <h3>Inside the marks</h3>
      <ColourTable
        head={["Token", "Hex"]}
        columns={[{ label: "Use", th: "hide-narrow", td: "hide-narrow" }]}
        rows={[
          { token: "mark.tile-light", label: "tile-light", cells: ["The top of the tile"] },
          { token: "mark.tile", label: "tile", cells: ["The middle of the tile"] },
          { token: "mark.tile-dark", label: "tile-dark", cells: ["The foot of the tile"] },
          { token: "mark.parchment-light", label: "parchment-light", cells: ["The lit edge of a shape"] },
          { token: "mark.parchment", label: "parchment", cells: ["The body of a shape, and the frame line"] },
          { token: "mark.parchment-shade", label: "parchment-shade", cells: ["The shaded edge of a shape"] },
          { token: "mark.bronze-light", label: "bronze-light", cells: ["The lit edge of the accent"] },
          { token: "mark.bronze", label: "bronze", cells: ["The body of the accent"] },
          { token: "mark.bronze-shade", label: "bronze-shade", cells: ["The shaded edge of the accent"] },
        ]}
      />
      <p>These colours are for drawing marks. The interface never uses them.</p>
    </Section>
  );
}
