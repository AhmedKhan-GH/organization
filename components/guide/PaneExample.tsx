import { hex, version, type ColorPath } from "@/lib/tokens";

/** The palette as an application pane lists it, with each colour's contrast on the application ground. */
const rows: { name: string; token: ColorPath; contrast: string; selected?: boolean }[] = [
  { name: "deep", token: "palette.deep", contrast: "1.05" },
  { name: "ground", token: "palette.ground", contrast: "1.00" },
  { name: "plate", token: "palette.plate", contrast: "1.08" },
  { name: "rule", token: "palette.rule", contrast: "1.99" },
  { name: "parchment", token: "palette.parchment", contrast: "13.65" },
  { name: "secondary", token: "palette.secondary", contrast: "9.27" },
  { name: "faint", token: "palette.faint", contrast: "5.15" },
  { name: "bronze", token: "palette.bronze", contrast: "5.76", selected: true },
];

/** A pane at the application's own metrics, built from the tokens: header, booktabs table, actions and status line. */
export function PaneExample() {
  return (
    <figure className="example" aria-label="Example pane">
      <div className="pane-head">
        <span className="t">Palette</span>
        <span className="sub">8 of 16</span>
        <span className="key">⌘1</span>
      </div>
      <div className="pane-body">
        <table className="app-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Hex</th>
              <th scope="col" className="num">On ground</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.name} className={row.selected ? "sel" : undefined}>
                <td>{row.name}</td>
                <td className="code">{hex(row.token)}</td>
                <td className="num">{row.contrast}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="actions">
          <button className="plate-btn" type="button">
            <svg viewBox="0 0 96 24" width="96" height="24" aria-hidden="true">
              <polygon points="6.5,0.5 89.5,0.5 95.5,6.5 95.5,17.5 89.5,23.5 6.5,23.5 0.5,17.5 0.5,6.5" />
            </svg>
            <span><span className="k">⏎</span>Copy</span>
          </button>
          <button className="key-btn" type="button"><span className="k">⌘K</span>Command</button>
          <button className="word-btn" type="button">Reset</button>
          <span className="unavailable">Export<span>not yet available</span></span>
        </div>
      </div>
      <div className="status">
        <span>{`Tokens ${version}`}</span>
        <span>16 colours</span>
        <span>Contrast on ground</span>
      </div>
    </figure>
  );
}
