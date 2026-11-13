import { sectionNumbers } from "@/lib/guide";
import { DataTable } from "../DataTable";
import { Section } from "../Section";

export function SternbildSection() {
  return (
    <Section id="sternbild">
      <p>Sternbild is an organization that builds applications and runs research projects. Its name means constellation. The applications are Atlas, Alidade, Astrolabe, Compass and Caliper. The research projects are Alioth, Polaris, Nebula, Orion and Quasar, each named after a star or an object in the sky.</p>
      <p>The identity is small and consistent. It has one logo, one seal and one drawing system for every mark, a warm night palette with bronze as its only accent, two typefaces in a single weight, square corners and 1&nbsp;px rules.</p>
      <DataTable
        columns={[{ label: "Part", td: "key" }, { label: "What it is" }, { label: "Section", th: "hide-narrow", td: "hide-narrow muted" }]}
        rows={[
          ["Name", "Sternbild in running text; STERNBILD in Sternbild Display, widely tracked, as a name on its own", sectionNumbers("sternbild", "type")],
          ["Logo", "The flat-topped diamond with the crown and seven stars, on its own shaded ground", sectionNumbers("logo")],
          ["Seal", "The same drawing in flat white, with no ground", sectionNumbers("logo")],
          ["Marks", "One for each application and research project, in the seal's drawing system", sectionNumbers("marks")],
          ["Colour", "Night grounds, parchment text in three strengths, bronze used rarely", sectionNumbers("colour")],
          ["Type", "Sternbild Display for names; IBM Plex Sans Condensed for everything else", sectionNumbers("type")],
          ["Structure", "Alignment, 1 px rules and type instead of boxes; square corners", sectionNumbers("layout", "interface")],
        ]}
      />
    </Section>
  );
}
