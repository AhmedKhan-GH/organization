import { sections } from "@/lib/guide";

/** The list of sections: in the rail beside the page on wide screens, and in the opening on narrow ones. */
export function ContentsList() {
  return sections.map(({ id, number, title }) => (
    <li key={id}>
      <a href={`#${id}`}>
        <span className="n">{number}</span>
        {title}
      </a>
    </li>
  ));
}
