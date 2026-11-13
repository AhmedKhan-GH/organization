import { AssetImage } from "@/components/AssetImage";
import { designFile } from "@/lib/guide";
import { page } from "@/lib/site";
import { version } from "@/lib/tokens";
import { ContentsList } from "./Contents";

/** The masthead: the logo at the left, visible and small, beside the name; the guide's version at the right. */
export function GuideMasthead() {
  return (
    <header className="mast">
      <div className="mast-in">
        <a className="brand" href={page("/")}>
          <AssetImage file="sternbild-logo.svg" />
          <span className="display">Sternbild</span>
        </a>
        <span className="doc display">Style guide</span>
        <span className="ver">{`Version ${version}`}</span>
      </div>
    </header>
  );
}

/** The opening, on the aura: the title, what the guide covers, its facts, and the contents on narrow screens. */
export function GuideOpening() {
  return (
    <div className="opening">
      <div className="opening-in">
        <h1 className="display">Style guide</h1>
        <p className="intro">This guide describes how Sternbild looks and reads: the logo and the seal, the marks of the applications and research projects, colour, type, layout, the interface of the applications, and the writing. Every value on this page comes from one file of design tokens, and every token names the existing source it was taken from.</p>
        <dl className="facts">
          <div><dt className="label">Version</dt><dd>{`${version}, not yet tagged`}</dd></div>
          <div><dt className="label">Date</dt><dd>13 November 2026</dd></div>
          <div><dt className="label">Style sheet</dt><dd><a href={designFile("v1/sternbild.css")}><code>design/<wbr />v1/<wbr />sternbild.css</code></a></dd></div>
          <div><dt className="label">Tokens</dt><dd><a href={designFile("v1/tokens.json")}><code>design/<wbr />v1/<wbr />tokens.json</code></a></dd></div>
        </dl>
        <ol className="toc" aria-label="Contents">
          <ContentsList />
        </ol>
      </div>
    </div>
  );
}

/** The contents beside the reading column, on wide screens. */
export function GuideRail() {
  return (
    <nav className="rail" aria-label="Contents">
      <ol>
        <ContentsList />
      </ol>
    </nav>
  );
}

export function GuideFooter() {
  return (
    <footer>
      <div className="foot">
        <a className="house" href={page("/")}>
          <AssetImage file="sternbild-logo.svg" />
          <span className="house-name display">Sternbild</span>
        </a>
        <p>{`Style guide, version ${version}`}</p>
      </div>
    </footer>
  );
}
