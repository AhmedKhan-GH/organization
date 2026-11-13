import type { ReactNode } from "react";

/** A ruled list of rules, each with the source it comes from at the right. */
export function RulesList({ rules }: { rules: [ReactNode, string][] }) {
  return (
    <ul className="rules-list">
      {rules.map(([rule, source], i) => (
        <li key={i}>
          <span>{rule}</span>
          <span className="source">{source}</span>
        </li>
      ))}
    </ul>
  );
}
