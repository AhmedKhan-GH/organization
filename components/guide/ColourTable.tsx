import type { ReactNode } from "react";
import { hex, type ColorPath } from "@/lib/tokens";
import type { Column } from "./DataTable";
import { Swatch } from "./Swatch";

export type ColourRow =
  | { group: string }
  | {
      token: ColorPath;
      /** The name shown beside the swatch. */
      label: ReactNode;
      /** The cells after the hex value, one for each extra column. */
      cells: ReactNode[];
    };

/**
 * A table of colour tokens: each row shows the token's swatch and name, then its hex value from the tokens, then
 * the extra columns. A group row names the rows below it.
 */
export function ColourTable({ head, columns, rows }: { head: [ReactNode, ReactNode]; columns: Column[]; rows: ColourRow[] }) {
  const span = 2 + columns.length;
  return (
    <table className="table">
      <thead>
        <tr>
          <th scope="col">{head[0]}</th>
          <th scope="col">{head[1]}</th>
          {columns.map((column, i) => (
            <th key={i} scope="col" className={column.th}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) =>
          "group" in row ? (
            <tr key={r} className="group">
              <td colSpan={span}>{row.group}</td>
            </tr>
          ) : (
            <tr key={r}>
              <td className="key">
                <Swatch token={row.token} />
                {row.label}
              </td>
              <td className="mono">{hex(row.token)}</td>
              {row.cells.map((cell, i) => (
                <td key={i} className={columns[i]?.td}>{cell}</td>
              ))}
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}
