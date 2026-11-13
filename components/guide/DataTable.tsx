import type { ReactNode } from "react";

export type Column = {
  label: ReactNode;
  /** The class of the column's head cell. */
  th?: string;
  /** The class of the column's body cells. */
  td?: string;
};

/** A table set as booktabs: a faint rule above, a rule under the heads, nothing between the rows. */
export function DataTable({ columns, rows, className }: { columns: Column[]; rows: ReactNode[][]; className?: string }) {
  return (
    <table className={className ? `table ${className}` : "table"}>
      <thead>
        <tr>
          {columns.map((column, i) => (
            <th key={i} scope="col" className={column.th}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r}>
            {row.map((cell, i) => (
              <td key={i} className={columns[i]?.td}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
