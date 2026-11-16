import { sectionNumbers } from "@/lib/guide";
import { DataTable } from "../DataTable";
import { MarkList, SmallMarks } from "../MarkList";
import { Section } from "../Section";

export function MarksSection() {
  return (
    <Section id="marks">
      <p>Each application and research project has a mark. Every mark is drawn in the seal&apos;s own system and sits in a frame that shows its kind. Applications wear a square with 45° corner cuts, research projects wear a hexagon with its points up and down, and the flat-topped diamond belongs to the house alone.</p>

      <h3>Applications</h3>
      <MarkList keys={["atlas", "alidade", "astrolabe", "compass", "caliper"]} />

      <h3>Research</h3>
      <MarkList keys={["alioth", "polaris", "nebula", "orion", "quasar"]} />
      <p className="source">A research project without a mark stands in the empty hexagon, <code>placeholder-hexagon.svg</code>.</p>

      <h3>The drawing system</h3>
      <DataTable
        columns={[{ label: "Element", td: "key" }, { label: "Rule" }]}
        rows={[
          ["Construction", "Five rays 18° apart from one point, at −36°, −18°, 0°, 18° and 36° from the upright. Diamond sides at 45°."],
          ["Stars", "Four straight triangular arms with concave sides. Only the inner corners are softened."],
          ["Blades", "Tapered, filled and sharp, with their ends cut at the seal's angles."],
          ["Weights", "Two only: the frame's line and the filled blades."],
          ["Frame", "A line 22.5 units wide on the 1024 canvas, its outer edge on the edge of the tile. Research marks draw it in parchment. Each application draws it in its own Minerals colour, shaded from light at the top to dark at the foot."],
          ["Colour", `Shaded parchment shapes on a shaded charcoal tile, with exactly one bronze accent. The colours are in section ${sectionNumbers("colour")}.`],
          ["Crossings", "Where one part passes over another, an even gap of about 11 units on the 1024 canvas."],
          ["Proportion", "The drawing fills 65 to 75% of the frame's height and is centred by eye, not by its bounding box."],
          ["Small sizes", "A mark must read at 32 px, with no hairlines or specks."],
          ["Never", "Freehand swooshes, calligraphic flourishes, text, clip art, or the seal's crown."],
        ]}
      />
      <p className="source">From the logo notes and the marks briefs in the brand folders.</p>

      <h3>At 32 px</h3>
      <SmallMarks keys={["atlas", "alidade", "astrolabe", "compass", "caliper", "alioth", "polaris", "nebula", "orion", "quasar"]} />
    </Section>
  );
}
