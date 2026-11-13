import { AssetImage } from "@/components/AssetImage";
import { contact, github } from "@/lib/site";

/** The sticky masthead: the logo and name at the left, the links at the right. */
export function Masthead() {
  return (
    <header className="mast">
      <div className="wrap">
        <a className="brand" href="#top">
          <AssetImage file="sternbild-logo.svg" />
          <span>STERNBILD</span>
        </a>
        <nav className="links" aria-label="Sternbild">
          <a href="#apps">Apps</a>
          <a className="wide" href="#research">Research</a>
          <a className="wide" href={github}>GitHub ↗</a>
          <a href={contact}>Contact</a>
        </nav>
      </div>
    </header>
  );
}
