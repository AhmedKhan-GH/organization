import { PaneExample } from "../PaneExample";
import { Section } from "../Section";

/** The interface principles: each rule's lead in plain weight and text colour, then its explanation. */
const principles: [string, [string, string?][]][] = [
  ["Text", [
    ["No taglines or explanatory sentences.", " Arrangement, icons and labels carry the meaning, so there are no pane subtitles, help lines or sentences beside controls."],
    ["Labels are nouns or short noun phrases."],
    ["A legend is a symbol and a noun."],
    ["Things are called by their names, never by pointers", " such as “this item”, “current” or “here”. An item has the same name everywhere it appears."],
    ["Tooltips show names and values only."],
    ["Every mark in a view is labelled or keyed."],
  ]],
  ["Explanation", [
    ["Explanation lives in one place on demand,", " in a tour or behind an info icon beside a title, never on the surface."],
    ["A tour is data.", " Each step names the region it is about, with a title and at most two plain sentences, kept in a file beside the code."],
  ]],
  ["Layout", [
    ["The subject of a view gets most of the window,", " with controls and secondary panes beside it."],
    ["Panes are shares of the window, not fixed sizes.", " Each has a minimum that grows with the text scale, and no maximum."],
    ["A view's content fills its view", " on opening, on resize and after the data change, without jumps."],
    ["Different questions get different tabs", " rather than more panes."],
  ]],
  ["Behaviour", [
    ["Open quietly.", " Nothing plays or animates until the user picks something to look at."],
    ["One place to change each thing.", " Every setting has exactly one control; other panes only show it."],
    ["Selection is linked.", " Selecting an item in one view marks it in every other."],
  ]],
  ["Colour and size", [
    ["One colour key across the whole application."],
    ["Annotation marks get their own colour,", " separate from the data classes."],
    ["Text scale is a setting,", " applied to fonts, metrics and pane minimums together."],
  ]],
  ["Checking", [
    ["Panes are laid out as plain rectangles", " that tests can check without a window."],
    ["Every layout change is checked with screenshots at two window sizes", " before it is accepted."],
  ]],
];

export function InterfaceSection() {
  return (
    <Section id="interface">
      <p>Each application is a dense technical workstation in the Sternbild palette. The rules below were written for Caliper, the reference for application interfaces, and this guide adopts them for every application. They describe structure, not visual style, and they hold at any density.</p>
      <dl className="principles">
        {principles.map(([term, items]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>
              <ul>
                {items.map(([lead, rest]) => (
                  <li key={lead}>
                    <b>{lead}</b>
                    {rest}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>

      <h3>A pane, built from the tokens</h3>
      <PaneExample />
      <p className="caption">The pane has focus, so its title, key and closing rule are bronze. The table is set in booktabs at 22&nbsp;px rows, and the selected row sits on plate with its text in bronze. The primary action is the one outlined plate; the key button pairs a key with its action, the secondary action is a bare word, and an action that cannot run says why. The status line sits on deep under a rule.</p>
    </Section>
  );
}
