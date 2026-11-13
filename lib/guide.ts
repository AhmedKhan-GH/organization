import { basePath } from "@/lib/site";

/**
 * The style guide's sections, in order. The contents, the headings and the cross-references all read this list.
 * Sections are numbered with Arabic numerals: the Sternbild interface style uses no Roman numerals.
 */
export const sections = [
  { id: "sternbild", number: "1", title: "Sternbild" },
  { id: "logo", number: "2", title: "Logo and seal" },
  { id: "marks", number: "3", title: "Marks" },
  { id: "colour", number: "4", title: "Colour" },
  { id: "type", number: "5", title: "Typography" },
  { id: "layout", number: "6", title: "Layout and rules" },
  { id: "interface", number: "7", title: "Application interface" },
  { id: "writing", number: "8", title: "Writing" },
  { id: "using", number: "9", title: "Using the guide" },
] as const;

export type SectionId = (typeof sections)[number]["id"];

export const sectionOf = (id: SectionId) => sections.find(section => section.id === id)!;

/** The numbers of one or more sections, as a cross-reference such as "6, 7". */
export const sectionNumbers = (...ids: SectionId[]) => ids.map(id => sectionOf(id).number).join(", ");

/** The published URL of a file in a release folder, such as "v1/sternbild.css". */
export const designFile = (path: string) => `${basePath}/design/${path}`;
