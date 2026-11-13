import { InlineScript } from "@/components/InlineScript";
import { asset } from "@/lib/site";

/**
 * Decides, before the first paint, whether the opening plays: once per browser session, and never over a link into
 * the page; ?gate always replays it. It sets html.gated or html.entered, which the opening's styles and gate.js read.
 */
const gateClass = `
  // The opening plays once per browser session, and never over a link into the page; ?gate always replays it.
  try {
    const replay = new URLSearchParams(location.search).has("gate");
    const seen = sessionStorage.getItem("sternbild.entered") === "1";
    document.documentElement.classList.add(!replay && (seen || location.hash) ? "entered" : "gated");
  } catch { document.documentElement.classList.add("gated"); }
`;

export function GateClass() {
  return <InlineScript code={gateClass} />;
}

/*
 * The opening's markup, exactly as on the static page. gate.js owns it: it fills the beams and their filters, and it
 * removes the whole gate, either at once when the opening is skipped (often before React hydrates) or when the
 * opening ends. React must therefore never hydrate it, so it is kept as HTML inside a wrapper that React treats as
 * opaque. The wrapper has no box of its own: the gate inside is fixed to the viewport, or not displayed.
 */
const gateMarkup = `<div class="gate" id="gate" role="dialog" aria-label="Sternbild">
  <svg class="portal-definitions" width="0" height="0" aria-hidden="true"><defs id="portal-defs"></defs></svg>
  <div class="portal-atmosphere" aria-hidden="true">
    <div class="portal-source"><div class="portal-hover-lift"><div class="portal-ascent"><div class="login-drift"><div class="portal-beam-level"></div></div></div></div></div>
  </div>
  <div class="login-object">
    <div class="login-shadow-offset" aria-hidden="true">
      <svg class="login-shadow" viewBox="0 0 200 50">
        <defs><filter id="seal-ground-shadow" x="-40%" y="-100%" width="180%" height="300%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="10 4"/></filter></defs>
        <ellipse cx="100" cy="25" rx="66" ry="9" fill="var(--seal-shadow-ink)" filter="url(#seal-ground-shadow)"/>
      </svg>
    </div>
    <div class="portal-hover-lift"><div class="portal-ascent"><div class="login-perspective"><div class="login-tilt"><div class="login-drift">
      <button class="portal-trigger" type="button" aria-label="Enter Sternbild"><img class="login-seal" src="${asset("sternbild-seal.svg")}" alt="" draggable="false"></button>
    </div></div></div></div></div>
  </div>
  <p class="login-name" aria-hidden="true">Sternbild</p>
  <p class="gate-hint" aria-hidden="true"><span class="fine">Click to enter</span><span class="touch">Tap to enter</span></p>
  <div class="portal-glare" aria-hidden="true"><canvas></canvas></div>
  <div class="portal-dither" aria-hidden="true"></div>
</div>`;

/** The opening: the white seal over five breathing beams, driven by public/assets/gate.js. */
export function Gate() {
  return <div dangerouslySetInnerHTML={{ __html: gateMarkup }} />;
}

/**
 * gate.js, loaded as it is and in the same place as on the static page: at the end of the body, where the browser
 * runs it while parsing, before the first paint and before React hydrates. next/script cannot keep that timing:
 * beforeInteractive runs from the head, before the gate exists, and afterInteractive runs after hydration, so the
 * gate would first appear without its layout.
 */
export function GateScript() {
  // eslint-disable-next-line @next/next/no-sync-scripts -- see above: the opening must be laid out before it is painted.
  return <script src={asset("gate.js")} />;
}
