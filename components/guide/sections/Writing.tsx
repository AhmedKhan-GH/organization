import { DataTable } from "../DataTable";
import { RulesList } from "../RulesList";
import { Section } from "../Section";

export function WritingSection() {
  return (
    <Section id="writing">
      <p>These rules hold for everything Sternbild writes: the website, the applications, documents, figures and this guide.</p>
      <RulesList
        rules={[
          ["Titles are plain and descriptive. There are no taglines, slogans, colon subtitles, or questions used as titles.", "all writing"],
          ["Sentences are simple, complete and natural. They are neither clipped fragments nor marketing copy.", "all writing"],
          ["Each concept has one term, used the same way on the website, in the applications, in documents and in figures.", "all writing"],
          ["Things are called by their names. Labels in an interface are nouns or short noun phrases.", "Caliper interface principles"],
          ["Only facts with a source are stated. Dates, figures, people and versions are never invented.", "Caliper interface specification"],
          ["Sternbild and the product names are written with a capital initial in running text. Set alone in Sternbild Display, they appear in capitals.", "the website"],
        ]}
      />

      <h3>Terms</h3>
      <DataTable
        className="terms"
        columns={[{ label: "Term" }, { label: "Meaning" }]}
        rows={[
          ["Sternbild", "The organization"],
          ["application", "Alidade, Astrolabe, Compass or Caliper"],
          ["research project", "Alioth, Polaris, Nebula, Orion or Quasar"],
          ["knowledge base", "Atlas"],
          ["logo", <>The shaded diamond drawing, <code>sternbild-logo.svg</code></>],
          ["seal", <>The flat white drawing, <code>sternbild-seal.svg</code></>],
          ["mark", "The drawing that stands for one application or research project"],
          ["frame", "The shape that holds a drawing: diamond, cut-corner square or hexagon"],
          ["ground", "One of the dark background colours"],
          ["plate", "A raised surface, such as a pane header or a menu"],
          ["rule", "A 1 px line"],
          ["accent", "Bronze"],
          ["token", <>One named value in <code>design/tokens.json</code></>],
        ]}
      />
    </Section>
  );
}
