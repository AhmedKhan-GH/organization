import { sectionOf, type SectionId } from "@/lib/guide";

/** One numbered section of the guide, headed by its number and title under a 1 px rule. */
export function Section({ id, children }: { id: SectionId; children: React.ReactNode }) {
  const { number, title } = sectionOf(id);
  return (
    <section className="sec" id={id} aria-labelledby={`h-${id}`}>
      <div className="sec-head">
        <span className="n display" aria-hidden="true">{number}</span>
        <h2 className="display" id={`h-${id}`}>{title}</h2>
      </div>
      {children}
    </section>
  );
}
