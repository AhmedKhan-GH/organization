import { Section } from "../Section";
import { Spec } from "../Spec";

/** The type scale: each size's token, how it is set, and a sample. */
const ladder = [
  { token: "hero", meta: "Text, 40 to 84 px with the window, tracked 0.3 em", sample: "heading s-hero", text: "Sternbild" },
  { token: "heading-l", meta: "Display 28 px, tracked 0.22 em", sample: "display s-heading-l", text: "Alioth" },
  { token: "heading", meta: "Text 24/1.2, tracked 0.06 em", sample: "heading s-heading", text: "Typography" },
  { token: "name", meta: "Display 19 px, tracked 0.22 em", sample: "display s-name", text: "Caliper" },
  { token: "label", meta: "Text 13 px, tracked 0.26 em", sample: "heading s-label", text: "Applications" },
  { token: "label", use: ", navigation", meta: "Text 13 px, tracked 0.18 em", sample: "heading s-nav", text: "Research" },
  { token: "body", meta: "Plex 17/1.65", sample: "s-body", text: "Every value on this page comes from one file of design tokens." },
  { token: "desc", meta: "Plex 16/1.55, secondary", sample: "s-desc", text: "Ontology-driven business systems, and the security to protect their data at scale." },
  { token: "small", meta: "Plex 15/1.35, faint", sample: "s-small", text: "Semiconductor design" },
  { token: "caption", meta: "Plex 14 px, faint", sample: "s-caption", text: "Keep clear space of at least half the diamond's width on every side." },
  { token: "label-s", meta: "Plex 12 px capitals, tracked 0.08 em", sample: "s-label-s", text: "Contrast on ground" },
];

export function TypographySection() {
  return (
    <Section id="type">
      <p>Two typefaces in one weight. Sternbild Display sets only the names of Sternbild, its applications and its projects: wordmarks, name lockups, a name beside its mark, and the imprint. IBM Plex Sans Condensed sets everything else, including every heading and page title, even one that is a product name, and all labels, navigation and numerals. Hierarchy comes from size, colour, case and tracking, never from bold or italic.</p>

      <h3>Sternbild Display</h3>
      <p className="glyphs display">ABCDEFGHIJKLM NOPQRSTUVWXYZ<br />0123456789 . , : ; · – - ’ &apos; ? !</p>
      <Spec
        rows={[
          ["Role", "The names of Sternbild, its applications and its projects, as wordmarks and beside their marks. Never a heading, a label, navigation, a numeral or running text."],
          ["Coverage", "48 characters: the 26 capitals, the ten figures, the space and eleven marks of punctuation. It has no lowercase, no slash, no number sign and no ampersand, so it is always set in capitals and never given identifiers."],
          ["Figures", "The figures are tabular, so they align in columns."],
          ["Tracking", "Always tracked: 0.3 em for STERNBILD on the website, 0.22 em for application and project names, 0.1 em for an application's wordmark."],
          ["Applications", "The wordmark only, never below 16 px."],
          ["File", <><code>assets/fonts/SternbildDisplay-Regular.woff2</code>, version 1.000</>],
          ["Licence", "Sternbild's own typeface, with original outlines drawn in 2026. No licence file accompanies it yet."],
        ]}
      />

      <h3>IBM Plex Sans Condensed</h3>
      <p className="glyphs text">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />abcdefghijklmnopqrstuvwxyz<br />0123456789 → ↗ · × − –</p>
      <Spec
        rows={[
          ["Role", "Running text, descriptions, tables, labels and every word in an application's interface."],
          ["Figures", "Tabular by default, so columns of numbers align without a feature setting."],
          ["Capitals", "The face has no small capitals. Labels are set in capitals and tracked 0.08 em."],
          ["File", <><code>assets/fonts/IBMPlexSansCondensed-Regular.ttf</code>, version 1.3, Regular only</>],
          ["Licence", <>SIL Open Font License 1.1. Copyright © 2017 IBM Corp. with Reserved Font Name “Plex”. The licence is in <code>assets/fonts/OFL-ibmplexsanscondensed.txt</code>.</>],
        ]}
      />

      <h3>Code</h3>
      <p>Caliper sets literal code, data cells, identifiers and paths in Source Code Pro, under the SIL Open Font License 1.1. The font file is not in this repository yet, so this page falls back to the system&apos;s monospace face.</p>

      <h3>Scale</h3>
      <ul className="ladder">
        {ladder.map(step => (
          <li key={step.sample}>
            <div className="meta">
              <code>{step.token}</code>
              {step.use}
              <br />
              {step.meta}
            </div>
            <div className={`sample ${step.sample}`}>{step.text}</div>
          </li>
        ))}
      </ul>
      <p>No text is smaller than 12&nbsp;px. In an application, Dear ImGui sizes a face by its full height rather than its em, so the application sizes in the tokens (15, 14 and 15 for the interface, small labels and code, 16 for the wordmark) correspond to about 11.5, 10.8 and 11.9&nbsp;CSS&nbsp;px.</p>
    </Section>
  );
}
