import { version } from "@/lib/tokens";
import { DataTable } from "../DataTable";
import { Section } from "../Section";

const building = `npm run tokens         # write the release to v1/ and to its numbered folder
npm run tokens:check   # fail if the published files differ from the tokens`;

const webPage = `<link rel="stylesheet" href="design/v1/sternbild.css">

body { background: var(--sb-background); color: var(--sb-text);
       font: var(--sb-font-size-body)/var(--sb-leading-body) var(--sb-font-family-text); }`;

export function UsingSection() {
  return (
    <Section id="using">
      <p>The tokens are the single source. The build turns them into a style sheet, and each release is published twice: once in a folder that always holds the latest release of its major version, and once in a numbered folder that never changes. This page is for people; the style sheet and the tokens file are the contract for software.</p>
      <DataTable
        columns={[{ label: "File" }, { label: "What it is" }]}
        rows={[
          [<code key="f">design/tokens.json</code>, "The source: the tokens in the W3C Design Tokens format, each with its source, and the version"],
          [<code key="f">design/build.mjs</code>, "The build, in plain Node with no dependencies"],
          [<code key="f">public/design/v1/</code>, <><code>sternbild.css</code> and <code>tokens.json</code> for the latest 1.x release</>],
          [<code key="f">{`public/design/${version}/`}</code>, `The same two files for release ${version}, frozen`],
          [<code key="f">lib/tokens.ts</code>, "The same tokens as a typed module for this site's pages"],
          [<code key="f">app/design/page.tsx</code>, "This page"],
          [<code key="f">design/README.md</code>, "Where each value came from, the versioning plan and the open questions"],
        ]}
      />

      <h3>Building</h3>
      <pre>{building}</pre>
      <p>The build reads the version from the tokens file. It refuses to change a numbered folder that already exists, so any change to a value needs a new version. It also runs on its own whenever the site is started for development or built.</p>

      <h3>On a web page</h3>
      <p>Link the style sheet, then use the roles. Each token becomes a custom property named after its path, such as <code>--sb-palette-deep</code> or <code>--sb-font-size-body</code>; roles carry no group name, so <code>role.text</code> is <code>--sb-text</code>. On the hosted site the path below sits under the organization&apos;s GitHub Pages address.</p>
      <pre>{webPage}</pre>
      <p>A site that should follow every 1.x release links <code>v1/</code>. A project that must not change on its own, such as a native application that generates its theme when it is built, pins a numbered folder such as <code>{`${version}/`}</code> and moves to a new release with a one-line version bump.</p>

      <h3>Versions</h3>
      <DataTable
        columns={[{ label: "Change" }, { label: "Version" }, { label: "Effect" }]}
        rows={[
          ["A value is corrected", "Patch, 1.0.0 to 1.0.1", <><code>v1/</code> follows at once</>],
          ["A role or value is added; nothing is removed", "Minor, 1.0 to 1.1", <><code>v1/</code> follows at once</>],
          ["A role is renamed or removed", "Major, 1.x to 2.0", <>Published under <code>v2/</code>; projects stay on <code>v1/</code> until they are moved</>],
        ]}
      />
      <p>Each release is tagged in this repository as <code>design-v</code> followed by its version, such as <code>{`design-v${version}`}</code>{`. This page describes ${version}, which has not been tagged yet. Generators for C++, Rust and other platforms will read the same tokens file; they are not built yet.`}</p>
    </Section>
  );
}
