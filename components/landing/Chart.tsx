import type { CSSProperties } from "react";
import { AssetImage } from "@/components/AssetImage";
import { InlineScript } from "@/components/InlineScript";
import { asset } from "@/lib/site";
import { projects, type Project } from "@/lib/projects";

/*
 * The two flows, drawn on the seal's own construction: five rays at 0, 18 and 36 degrees either side of the upright,
 * rising from one point on the horizon. Positions are in the drawing's units (1600 by 1000), so the HTML and the SVG
 * share one frame.
 *
 * The logo's five beams continue past its border, from each crown spike's base along its ray from (800, 1051.15),
 * widening 0.05 per unit as inside the logo. Each beam is its own drawing, so that each breathes on its own layer as
 * the opening's beams do: the browser fades a finished picture rather than redrawing the glow.
 */
const beams = [
  { cycle: "13.2s", phase: "-7.1s", points: "769.1,1011.2 -60.1,-17.8 49.1,-97.2 771.6,1009.4", from: ["696.4", "908.5"], to: ["117.0", "111.2"] },
  { cycle: "9.6s", phase: "-3.3s", points: "785.3,1010.9 314.7,-224.0 443.0,-265.8 788.1,1009.9", from: ["739.6", "865.4"], to: ["494.5", "111.2"] },
  { cycle: "11.7s", phase: "-9.2s", points: "798.5,1010.4 732.5,-309.5 867.4,-309.5 801.5,1010.4", from: ["800.0", "829.0"], to: ["800.0", "111.2"] },
  { cycle: "14s", phase: "-1.4s", points: "811.8,1009.9 1156.9,-265.8 1285.3,-224.0 814.6,1010.9", from: ["860.3", "865.4"], to: ["1105.4", "111.2"] },
  { cycle: "8.8s", phase: "-4.8s", points: "828.4,1009.4 1550.8,-97.2 1660.0,-17.8 830.8,1011.2", from: ["903.5", "908.5"], to: ["1482.9", "111.2"] },
];

/** One place on the drawing: a mark with its kicker, name and role, at (x, y) in percent of the drawing. */
function ChartNode({ project, className, x, y, href }: { project: Project; className: string; x: string; y: string; href?: string }) {
  const style = { "--x": x, "--y": y } as CSSProperties;
  const inner = (
    <>
      <AssetImage file={project.mark} width="120" height="120" />
      <span className="text">
        <span className="step">Project</span>
        <span className="name">{project.name}</span>
        <span className="role">{project.role}</span>
      </span>
    </>
  );
  return href ? (
    <a className={`node ${className}`} href={href} style={style}>{inner}</a>
  ) : (
    <div className={`node ${className}`} style={style}>{inner}</div>
  );
}

/**
 * The subtitle runs exactly as wide as the name above it: its size is set from the name's drawn width (the last
 * letter's trailing letter-spacing left out), on load, once the fonts are in, and on resize.
 */
const fitMission = `
  (() => {
    const h = document.querySelector('.title-block h1'), m = document.querySelector('.title-block .mission');
    const width = el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; };
    const fit = () => {
      m.style.fontSize = '';
      const target = width(h) - (parseFloat(getComputedStyle(h).letterSpacing) || 0);
      const base = parseFloat(getComputedStyle(m).fontSize), now = width(m);
      if (target > 0 && now > 0) m.style.fontSize = (base * target / now).toFixed(2) + 'px';
    };
    fit(); document.fonts && document.fonts.ready.then(fit); addEventListener('resize', fit);
  })();
`;

/** The first screen: the drawing of the applications and research projects about the logo, then the name. */
export function Chart() {
  return (
    <section className="chart" aria-label="Alidade then Astrolabe, Compass then Caliper, and the research projects">
      <div className="sky">
        {beams.map((beam, i) => (
          <svg key={i} className="beam" viewBox="0 0 1600 1000" aria-hidden="true" style={{ "--beam-cycle": beam.cycle, "--beam-phase": beam.phase } as CSSProperties}>
            <polygon points={beam.points} fill={`url(#beam${i})`} filter="url(#beam-light)" />
          </svg>
        ))}
        <svg viewBox="0 0 1600 1000" aria-hidden="true">
          <defs>
            {beams.map((beam, i) => (
              <linearGradient key={i} id={`beam${i}`} gradientUnits="userSpaceOnUse" x1={beam.from[0]} y1={beam.from[1]} x2={beam.to[0]} y2={beam.to[1]}>
                <stop offset="0" stopColor="#e9f0ff" stopOpacity=".12" />
                <stop offset=".5" stopColor="#e9f0ff" stopOpacity=".092" />
                <stop offset="1" stopColor="#e9f0ff" stopOpacity=".055" />
              </linearGradient>
            ))}
            <linearGradient id="horizon" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1600" y2="0">
              <stop offset="0" stopColor="#6a655a" stopOpacity=".55" />
              <stop offset=".5" stopColor="#6a655a" />
              <stop offset="1" stopColor="#6a655a" stopOpacity=".55" />
            </linearGradient>
            {/* The beams' light: softened edges, and a faint wider glow of the same light around them. */}
            <filter id="beam-light" filterUnits="userSpaceOnUse" x="-60" y="-160" width="1720" height="1240" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="soft" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="20" result="wide" />
              <feComponentTransfer in="wide" result="glow">
                <feFuncA type="linear" slope=".85" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="soft" />
              </feMerge>
            </filter>
            {/* A faint glow of the beams' light around the logo. */}
            <filter id="seal-glow" x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceAlpha" stdDeviation="16" result="soft" />
              <feFlood floodColor="#fff6e8" floodOpacity=".2" />
              <feComposite in2="soft" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker id="head" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto">
              <path className="flow-head" d="M0 0.5 L12 6 L0 11.5 Z" />
            </marker>
          </defs>
          {/* The horizon (dimming a little to either side), and three rings about the point, each a little fainter
              outwards: through the apps you learn in, the apps you work in, and the research projects. On the upright,
              Alioth sits between the second and third rings and Atlas between the first and second. */}
          <g className="construction">
            <line x1="-400" y1="940" x2="2000" y2="940" stroke="url(#horizon)" />
            <path d="M 530 940 A 270 270 0 0 1 1070 940" strokeOpacity="1" />
            <path d="M 250 940 A 550 550 0 0 1 1350 940" strokeOpacity=".86" />
            <path d="M -30 940 A 830 830 0 0 1 1630 940" strokeOpacity=".72" />
          </g>
          {/* The logo centred on the horizon: its rays' meeting point, (512, 851.1) in the logo file's 1024 units, is
              the beams' origin, so its crown spikes and stars lie along the five beams. At .328 it sits below the two
              lower apps. */}
          <image className="seal-base" href={asset("sternbild-logo.svg")} x="632.2" y="772.25" width="335.5" height="335.5" filter="url(#seal-glow)" />
        </svg>

        <ChartNode project={projects.alioth} className="r south lead" href="#research" x="50.000%" y="18.800%" />
        <ChartNode project={projects.polaris} className="r west" href="#research" x="16.300%" y="30.900%" />
        <ChartNode project={projects.quasar} className="r west" href="#research" x="31.942%" y="16.191%" />
        <ChartNode project={projects.orion} className="r east" href="#research" x="83.700%" y="30.900%" />
        <ChartNode project={projects.nebula} className="r east" href="#research" x="68.058%" y="16.191%" />

        {/* Atlas, the organization's central knowledge base, on the upright between the first and second rings. */}
        <ChartNode project={projects.atlas} className="south core" href={projects.atlas.href} x="50.000%" y="47.000%" />

        <div className="group">
          <ChartNode project={projects.alidade} className="west learn" href={projects.alidade.href} x="37.072%" y="76.646%" />
          <ChartNode project={projects.astrolabe} className="west work" href={projects.astrolabe.href} x="26.635%" y="53.659%" />
        </div>

        <div className="group">
          <ChartNode project={projects.compass} className="east learn" href={projects.compass.href} x="62.928%" y="76.646%" />
          <ChartNode project={projects.caliper} className="east work" href={projects.caliper.href} x="73.365%" y="53.659%" />
        </div>
      </div>
      <div className="title-block">
        <h1>Sternbild</h1>
        <p className="mission" suppressHydrationWarning>Dedicated to advancing human values in the age of AI</p>
        <InlineScript code={fitMission} />
      </div>
    </section>
  );
}
