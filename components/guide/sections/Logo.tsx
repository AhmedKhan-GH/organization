import { AssetImage } from "@/components/AssetImage";
import { asset } from "@/lib/site";
import { DataTable } from "../DataTable";
import { RulesList } from "../RulesList";
import { Section } from "../Section";
import { Specimen } from "../Specimen";

/** The logo with its clear space drawn as a dotted line, half the diamond's width from each side. */
function ClearSpace() {
  return (
    <svg className="clear" viewBox="-352 -300 1728 1612" role="img" aria-label="The logo with its clear space drawn as a dotted line, half the diamond's width from each side">
      <rect className="zone" x="-312" y="-238.8" width="1648" height="1501.6" vectorEffect="non-scaling-stroke" />
      <image href={asset("sternbild-logo.svg")} x="0" y="0" width="1024" height="1024" />
      <line className="dim" x1="924" y1="512" x2="1336" y2="512" vectorEffect="non-scaling-stroke" />
      <line className="dim" x1="924" y1="472" x2="924" y2="552" vectorEffect="non-scaling-stroke" />
      <line className="dim" x1="1336" y1="472" x2="1336" y2="552" vectorEffect="non-scaling-stroke" />
      <text x="1130" y="450" textAnchor="middle">½ W</text>
      <line className="dim" x1="100" y1="-120" x2="924" y2="-120" vectorEffect="non-scaling-stroke" />
      <line className="dim" x1="100" y1="-160" x2="100" y2="-80" vectorEffect="non-scaling-stroke" />
      <line className="dim" x1="924" y1="-160" x2="924" y2="-80" vectorEffect="non-scaling-stroke" />
      <text x="512" y="-160" textAnchor="middle">W</text>
    </svg>
  );
}

const sizes = [
  { size: "120px", caption: "120 px" },
  { size: "72px", caption: "72 px" },
  { size: "var(--sb-logo-min-size)", caption: "40 px" },
];

export function LogoSection() {
  return (
    <Section id="logo">
      <p>The logo and the seal are one drawing. A crown of five blades rises from one foot inside a flat-topped diamond, with seven four-point stars on rays 18° apart. The logo sets the drawing on its own shaded diamond with five faint beams, and it is used at every size on screen. The seal is the flat white drawing with no ground, used where it stands alone on the night ground, as at the website&apos;s opening.</p>
      <div className="cols">
        <Specimen
          file="sternbild-logo.svg"
          alt="The Sternbild logo"
          name="Logo"
          spec={[
            ["File", <code key="f">assets/sternbild-logo.svg</code>],
            ["Canvas", "1024 × 1024"],
            ["Colours", "White drawing on a charcoal diamond shaded from #36332d to #141311"],
          ]}
        />
        <Specimen
          file="sternbild-seal.svg"
          alt="The Sternbild seal"
          name="Seal"
          spec={[
            ["File", <code key="f">assets/sternbild-seal.svg</code>],
            ["Canvas", "915.6 × 915.6, cropped to the frame"],
            ["Colours", "White only"],
          ]}
        />
      </div>

      <h3>Clear space and minimum size</h3>
      <div className="cols">
        <figure style={{ margin: 0 }}>
          <ClearSpace />
          <figcaption className="caption">Keep clear space of at least half the diamond&apos;s width (W) on every side.</figcaption>
        </figure>
        <figure style={{ margin: 0 }}>
          <div className="sizes">
            {sizes.map(({ size, caption }) => (
              <figure key={caption}>
                <AssetImage file="sternbild-logo.svg" style={{ width: size, height: size }} />
                <figcaption>{caption}</figcaption>
              </figure>
            ))}
          </div>
          <figcaption className="caption" style={{ marginTop: "var(--sb-space-4)" }}>The logo is never smaller than 40&nbsp;px. For a browser tab and a home screen, use the raster files drawn for those sizes, <code>sternbild-32.png</code> and <code>sternbild-180.png</code>.</figcaption>
        </figure>
      </div>
      <p className="source">Both values come from an October study for the website. The website&apos;s masthead currently sets the logo at 38&nbsp;px.</p>

      <h3>Placement</h3>
      <p>The logo is always visible and never the subject of a page. It marks the page at the top left of the masthead, beside the name, and returns in the footer. The seal appears only on its own, on the night ground.</p>
      <DataTable
        columns={[{ label: "Where" }, { label: "Size", td: "num" }, { label: "File" }]}
        rows={[
          ["Masthead, beside STERNBILD", "40 px", <code key="f">sternbild-logo.svg</code>],
          ["Footer, beside STERNBILD", "72 px", <code key="f">sternbild-logo.svg</code>],
          ["The website's opening", "full screen", <code key="f">sternbild-seal.svg</code>],
          ["Browser tab", "32 px", <code key="f">sternbild-32.png</code>],
          ["Home screen", "180 px", <code key="f">sternbild-180.png</code>],
          ["Link preview", "1200 × 630", <code key="f">og.png</code>],
        ]}
      />

      <h3>What not to do</h3>
      <RulesList
        rules={[
          ["Do not redraw, recolour or rearrange the logo or the seal. Use the files as they are.", "marks drawing notes"],
          ["Do not use a superseded version, such as the circular logo or an older lockup.", "October site study; marks drawing notes"],
          ["Do not set the name STERNBILD in any typeface other than Sternbild Display.", "brand book"],
          ["Do not place the seal, its fan of rays or its stars inside an application as decoration.", "Caliper interface specification"],
          ["Do not give the crown to a product mark. Product marks borrow only the language of its blades.", "marks drawing notes"],
          ["Do not make the logo the centre of a page. It marks the page; it is not the page's subject.", "placement on the website"],
        ]}
      />
    </Section>
  );
}
