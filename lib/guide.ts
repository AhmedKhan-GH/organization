import { basePath } from "@/lib/site";

/** The style guide's sections, in order. The contents, the headings and the cross-references all read this list. */
export const sections = [
  { id: "sternbild", number: "I", title: "Sternbild" },
  { id: "logo", number: "II", title: "Logo and seal" },
  { id: "marks", number: "III", title: "Marks" },
  { id: "colour", number: "IV", title: "Colour" },
  { id: "type", number: "V", title: "Typography" },
  { id: "layout", number: "VI", title: "Layout and rules" },
  { id: "interface", number: "VII", title: "Application interface" },
  { id: "writing", number: "VIII", title: "Writing" },
  { id: "using", number: "IX", title: "Using the guide" },
] as const;

export type SectionId = (typeof sections)[number]["id"];

export const sectionOf = (id: SectionId) => sections.find(section => section.id === id)!;

/** The numbers of one or more sections, as a cross-reference such as "VI, VII". */
export const sectionNumbers = (...ids: SectionId[]) => ids.map(id => sectionOf(id).number).join(", ");

/** The published URL of a file in a release folder, such as "v1/sternbild.css". */
export const designFile = (path: string) => `${basePath}/design/${path}`;
