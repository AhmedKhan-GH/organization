import { amount, cssVar, type DimensionPath } from "@/lib/tokens";
import { DataTable } from "../DataTable";
import { Section } from "../Section";

const px = (path: DimensionPath) => `${amount(path)} px`;

const grid: [DimensionPath, string][] = [
  ["layout.max", "The widest content column on the website"],
  ["layout.gutter", "The side margin"],
  ["layout.gutter-narrow", "The side margin on phones"],
  ["layout.breakpoint", "Below it, every layout is one column"],
  ["layout.masthead", "The masthead's height"],
  ["layout.section", "The space above a section; 72 px on phones"],
];

/** The spacing scale, read from the tokens: each step's name, its size in pixels and a bar of that width. */
const spaces = ["space.1", "space.2", "space.3", "space.4", "space.5", "space.6", "space.7", "space.8", "space.10", "space.12", "space.14", "space.16", "space.18"] as const;

export function LayoutSection() {
  return (
    <Section id="layout">
      <p>Structure comes from alignment, rules and type, not from boxes. At most one plate sits under anything, and nothing is boxed inside a box.</p>

      <h3>Grid</h3>
      <DataTable
        columns={[{ label: "Token", td: "key" }, { label: "Value", th: "num", td: "num" }, { label: "Use" }]}
        rows={grid.map(([path, use]) => [path.replace(".", "-"), px(path), use])}
      />

      <h3>Spacing</h3>
      <p>Spacing sits on a 4&nbsp;px base. The token&apos;s name is its multiple of 4&nbsp;px. The 28&nbsp;px gutter is step 7, and the 18&nbsp;px phone margin is the one value off the base.</p>
      <ul className="scale">
        {spaces.map(path => (
          <li key={path}>
            <code>{path.replace(".", "-")}</code>
            <span className="num">{amount(path)}</span>
            <span className="bar" style={{ width: cssVar(path) }} />
          </li>
        ))}
      </ul>

      <h3>Rules</h3>
      <p>Every rule is 1&nbsp;px. There are no 2&nbsp;px rules, no vertical rules inside tables, no zebra stripes and no cell borders.</p>
      <ul className="rule-demo">
        <li><span>rule</span><span className="line" style={{ background: cssVar("role.rule") }} /></li>
        <li><span>rule-faint</span><span className="line" style={{ background: cssVar("role.rule-faint") }} /></li>
        <li><span>faint, in tables</span><span className="line" style={{ background: cssVar("role.text-faint") }} /></li>
      </ul>
      <p>A list opens with a rule and divides its rows with faint rules. A table is set as a technical book sets it: a faint rule above, a rule under the heads, nothing between the rows and a faint rule below. The tables on this page follow that rule.</p>

      <h3>Corners</h3>
      <p>{`Corners are square everywhere: panes, fields, menus, plot fields, images and buttons, including the primary action. The cut-corner octagon belongs to the app logos and is never used on a control. Circles are kept for data points.`}</p>

      <h3>Density</h3>
      <p>The website sets running text at 17&nbsp;px with a line height of 1.65, in a column no wider than about 68 characters. An application is denser: rows of 22&nbsp;px, pane headers of 24&nbsp;px, pane padding of 8&nbsp;px and 16&nbsp;px between items on the status line. Empty space stays empty, with no badges, counters or filler.</p>

      <h3>Motion</h3>
      <p>Motion is brief and rare. A colour change under the pointer takes 150&nbsp;ms, and a small lift takes 300&nbsp;ms, both on the house easing, <code>cubic-bezier(0.2, 0.65, 0.3, 1)</code>. An application opens quietly: nothing moves until the user picks something to look at. When the system asks for reduced motion, transitions and animation stop.</p>
    </Section>
  );
}
