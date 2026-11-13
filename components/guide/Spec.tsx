import type { ReactNode } from "react";

/** A list of terms and values under a rule each, such as a file's name, canvas and colours. */
export function Spec({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="spec">
      {rows.map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
