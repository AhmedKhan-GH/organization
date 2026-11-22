// Gate animation: the white seal rests over five light beams along its construction rays.
// The seal lifts when the pointer moves near it. Only a click, tap, Enter key, or Space key opens the gate.
// Activation tips the beams toward the viewer around the seal base until light fills the screen.
// The white screen then fades away to show the dark site underneath.
// The gate runs once per browser session and skips deep links.
(() => {
  const root = document.documentElement;
  const gate = document.getElementById("gate");
  const site = document.getElementById("site");
  if (!gate) return;
  if (!root.classList.contains("gated")) { gate.remove(); return; }

  // A shared horizontal hinge through the seal's base and a finite-depth camera.
  const CAMERA = 1100, REACH = 850, PITCH = 86, RISE = .15;
  const OPEN_MS = 2000, HOLD_MS = 120, ADJUST_MS = 400, FACE_UNIT = 128, FACE_BLUR = .04;
  const RAYS = [
    { angle: -36, duration: 13.2, delay: -7.1, face: 500 },
    { angle: -18, duration: 9.6, delay: -3.3, face: 580 },
    { angle: 0, duration: 11.7, delay: -9.2, face: 2700 },
    { angle: 18, duration: 14, delay: -1.4, face: 580 },
    { angle: 36, duration: 8.8, delay: -4.8, face: 500 },
  ];

  const openingAt = time => {
    const t = Math.max(0, Math.min(1, time));
    const progress = t * t * (3 - 2 * t);
    return { time: t, progress, pitch: -PITCH * progress, width: 1 + 3 * progress,
      // Approach the lens late, while the faces turn towards the viewer.
      face: progress ** 20, light: Math.max(0, Math.min(1, (progress - .45) / .4)), shadow: (1 - progress) ** 2 };
  };
  // Long viewport-space shafts have finite depth; at rest their z is zero, so their projection is unchanged.
  const depthOf = (length, spread, angle) => {
    const phi = angle * Math.PI / 180;
    return REACH / (length * Math.cos(phi) + 4 * spread * Math.abs(Math.sin(phi)));
  };
  const lockupOf = (width, height, seal) => {
    // STERNBILD's ink spans 7.338em at the site's .3em tracking (5.418em at .06em, plus eight more gaps of .24em);
    // the phone lockup stays below 85vw.
    const nameWidth = width < 600 ? width * .8 : seal * 1.45;
    const nameSize = nameWidth / 7.338;
    const gap = Math.max(24, Math.min(40, seal * .12));
    const below = seal * .7 + 14 + gap;
    // Centre the visible frame and name ink rather than the image's empty margins.
    const centerY = height / 2 - (below + nameSize * .858 - seal * .37710665) / 2;
    return { centerY, nameTop: centerY + below, nameSize };
  };
  const spaceOf = (width, height, seal, centerY) => {
    // The rays meet at the frame's bottom-flat centre, (500, 870.4) in seal units.
    const origin = { x: width / 2, y: centerY + .3704 * seal };
    const length = (height / 2 + .3704 * seal) / Math.cos(Math.PI / 5) + Math.max(50, height * .08);
    // As the chart's beams: a narrow spread (0.05 per unit) with softly blurred edges.
    return { width, height, origin, seal, crown: .13588 * seal, length, spread: length * .05 + seal * .02, softness: Math.max(3, seal * .012) };
  };

  // Project the same triangular shafts, then scatter their light across their three oriented edges: radiance turned
  // into exposure, never the opacity of a white sheet.
  const glareFrame = (space, origin, frame, breaths) => {
    const t = frame.time, angle = -frame.pitch * Math.PI / 180;
    const ct = Math.cos(angle), st = Math.sin(angle), diagonal = Math.hypot(space.width, space.height);
    const edges = new Float32Array(45), depths = new Float32Array(5);
    for (let i = 0; i < 5; i++) {
      const phi = RAYS[i].angle * Math.PI / 180, c = Math.cos(phi), s = Math.sin(phi);
      const depth = depthOf(space.length, space.spread, RAYS[i].angle);
      const project = (x, y) => {
        const xx = x * frame.width, fanY = xx * s + y * c, q = 1 + fanY * st * depth / CAMERA;
        return { x: origin.x + (xx * c - y * s) / q, y: origin.y + fanY * ct / q };
      };
      const triangle = [origin, project(-space.spread, -space.length), project(space.spread, -space.length)];
      for (let j = 0; j < 3; j++) {
        const a = triangle[j], b = triangle[(j + 1) % 3], length = Math.hypot(b.x - a.x, b.y - a.y);
        const nx = -(b.y - a.y) / length, ny = (b.x - a.x) / length;
        edges.set([nx, ny, -nx * a.x - ny * a.y], (i * 3 + j) * 3);
      }
      const k = (i * 3 + 1) * 3;
      depths[i] = Math.max(1, edges[k] * origin.x + edges[k + 1] * origin.y + edges[k + 2]);
    }
    return { edges, depths, weights: Float32Array.from(breaths),
      // Exposure in stops, with a slow, accelerating turn towards us.
      exposure: Math.expm1(Math.LN2 * 11 * t ** 3),
      core: space.softness + diagonal * .012 * t ** 2,
      near: space.softness + diagonal * .045 * t ** 2,
      far: space.softness + diagonal * (.004 + .55 * t ** 3),
      scatter: t ** 2 };
  };
  const GLARE_FRAGMENT = `
precision highp float;
uniform vec2 viewport;
uniform vec3 edges[15];
uniform float depths[5];
uniform float weights[5];
uniform vec4 response;
uniform float scatter;
varying vec2 uv;
float spread(vec3 d, float sigma) {
  vec3 e = .5 + .5 * d / sqrt(d*d + vec3(sigma*sigma));
  return e.x*e.y*e.z;
}
void main() {
  vec2 p = vec2(uv.x, 1.0-uv.y)*viewport;
  // Where the beams overlap, near their source under the seal, their light combines as light through layers does
  // (one minus the product of what each lets through), not by plain addition, so it cannot pile up there.
  float through = 1.0;
  for (int i=0; i<5; i++) {
    vec3 d = vec3(dot(edges[i*3].xy,p)+edges[i*3].z,
      dot(edges[i*3+1].xy,p)+edges[i*3+1].z,
      dot(edges[i*3+2].xy,p)+edges[i*3+2].z);
    // Each beam's sharp light (its core and its near glow) thins out towards the point where the five meet, and stops
    // there, so they do not pile up into a point of light at the seal's foot. The wide wash of the flood is left whole,
    // so it stays continuous with the beams and still whitens everything in the end.
    float r = d.y/depths[i];
    float apex = 1.0 - smoothstep(.74, 1.0, r);
    float density = .08+.92*clamp(r,0.0,1.0);
    float l = weights[i]*(apex*(.32*density*spread(d,response.y)+.12*spread(d,response.z))+.10*scatter*spread(d,response.w));
    through *= 1.0 - min(l, .98);
  }
  float light = 1.0 - through;
  float exposed = min(1.0,(1.0-exp(-light*response.x))*1.025);
  gl_FragColor = vec4(vec3(1.0,246.0/255.0,232.0/255.0)*exposed,1.0);
}`;
  // Without WebGL the shafts' own facing light carries the opening instead.
  const glareRenderer = (canvas, width, height) => {
    let gl;
    try { gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true }); }
    catch { return null; }
    if (!gl) return null;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("glare shader");
      return shader;
    };
    try {
      const program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, "attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}"));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, GLARE_FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("glare program");
      // The light is deliberately soft; cap the fill cost even on a 5K display.
      const ratio = Math.min(1, Math.sqrt(1e6 / (width * height)));
      canvas.width = Math.ceil(width * ratio); canvas.height = Math.ceil(height * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height); gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const attribute = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
      const at = name => gl.getUniformLocation(program, name);
      const edges = at("edges[0]"), depths = at("depths[0]"), weights = at("weights[0]"), response = at("response"), scatter = at("scatter");
      gl.uniform2f(at("viewport"), width, height);
      return {
        paint(f) {
          gl.uniform3fv(edges, f.edges); gl.uniform1fv(depths, f.depths); gl.uniform1fv(weights, f.weights);
          gl.uniform4f(response, f.exposure, f.core, f.near, f.far); gl.uniform1f(scatter, f.scatter);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        },
        dispose() { gl.getExtension("WEBGL_lose_context")?.loseContext(); },
      };
    } catch { return null; }
  };

  const level = gate.querySelector(".portal-beam-level");
  const source = gate.querySelector(".portal-source");
  const defs = gate.querySelector("#portal-defs");
  const object = gate.querySelector(".login-object");
  const trigger = gate.querySelector(".portal-trigger");
  const canvas = gate.querySelector(".portal-glare canvas");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let space = null, phase = "idle", motion = 0;

  const layout = () => {
    if (phase !== "idle") return;
    const width = gate.clientWidth, height = gate.clientHeight;
    const seal = Math.min(Math.min(width, height) / 3, 360);
    const lockup = lockupOf(width, height, seal);
    space = spaceOf(width, height, seal, lockup.centerY);
    const { length, spread, softness } = space, margin = softness * 16;
    Object.entries({ "--seal-size": `${seal}px`, "--gate-center-y": `${lockup.centerY}px`, "--name-top": `${lockup.nameTop}px`,
      "--name-size": `${lockup.nameSize}px`, "--portal-rise": `${-height * RISE}px` }).forEach(([k, v]) => gate.style.setProperty(k, v));
    defs.innerHTML = `
      <linearGradient id="portal-shaft-light" gradientUnits="userSpaceOnUse" x1="0" y1="${-space.crown}" x2="0" y2="${-length}">
        <stop offset="0" stop-color="#e9f0ff" stop-opacity=".2"/><stop offset=".3" stop-color="#e9f0ff" stop-opacity=".13"/>
        <stop offset=".65" stop-color="#e9f0ff" stop-opacity=".095"/><stop offset="1" stop-color="#e9f0ff" stop-opacity=".06"/>
      </linearGradient>
      <filter id="portal-shaft-softness" filterUnits="userSpaceOnUse" x="${-spread - margin}" y="${-length - margin}"
        width="${2 * (spread + margin)}" height="${length + 2 * margin}" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${softness}" result="soft"/>
        <feGaussianBlur in="SourceGraphic" stdDeviation="${softness * 5}" result="wide"/>
        <feComponentTransfer in="wide" result="glow"><feFuncA type="linear" slope=".85"/></feComponentTransfer>
        <feMerge><feMergeNode in="glow"/><feMergeNode in="soft"/></feMerge>
      </filter>
      <filter id="portal-shaft-plain" filterUnits="userSpaceOnUse" x="${-spread - softness * 4}" y="${-length - softness * 4}"
        width="${2 * (spread + softness * 4)}" height="${length + softness * 8}" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="${softness}"/>
      </filter>
      <linearGradient id="portal-facing-light" gradientUnits="userSpaceOnUse" x1="0" y1="-1" x2="0" y2="1">
        <stop offset="0" stop-color="#fff6e8" stop-opacity="0"/><stop offset=".2" stop-color="#fff6e8"/>
        <stop offset=".8" stop-color="#fff6e8"/><stop offset="1" stop-color="#fff6e8" stop-opacity="0"/>
      </linearGradient>
      <filter id="portal-facing-softness" filterUnits="userSpaceOnUse" x="-1.2" y="-1.2" width="2.4" height="2.4" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="${FACE_BLUR}"/>
      </filter>`;
    source.style.left = `${space.origin.x}px`;
    source.style.top = `${space.origin.y}px`;
    // Each beam begins at its spike's base on the crown bar, as the logo's own beams do, and widens from there.
    const shaft = angle => {
      const r0 = space.crown / Math.cos(angle * Math.PI / 180), w0 = spread * r0 / length;
      return `M${-w0} ${-r0} L${-spread} ${-length} H${spread} L${w0} ${-r0} Z`;
    };
    level.innerHTML = RAYS.map(ray => `
      <div class="portal-ray-bearing" style="--ray-angle:${ray.angle}deg;--ray-depth:${depthOf(length, spread, ray.angle)};--cap-max:${ray.face / FACE_UNIT};--cap-distance:${-REACH}px">
        <div class="portal-ray-plane" style="left:${-spread}px;top:${-length}px;width:${2 * spread}px;height:${length}px;perspective:${CAMERA}px">
          <div class="portal-ray-swing">
            <svg class="portal-breath" viewBox="${-spread} ${-length} ${2 * spread} ${length}" style="--beam-cycle:${ray.duration}s;--beam-phase:${ray.delay}s">
              <path d="${shaft(ray.angle)}" fill="url(#portal-shaft-light)" filter="url(#portal-shaft-softness)"/>
            </svg>
          </div>
        </div>
        <div class="portal-beam-camera" style="perspective:${CAMERA}px">
          <svg class="portal-beam-face" viewBox="-1 -1 2 2" style="left:${-FACE_UNIT}px;top:${-FACE_UNIT}px;width:${2 * FACE_UNIT}px;height:${2 * FACE_UNIT}px">
            <path d="M-1 -1 H1 V1 H-1 Z" fill="url(#portal-facing-light)" filter="url(#portal-facing-softness)"/>
          </svg>
        </div>
      </div>`).join("");
  };

  const open = () => {
    if (phase !== "idle") return;
    phase = "opening";
    const reduced = reduce.matches;
    gate.classList.toggle("is-reduced", reduced);
    // Hold the hover lift, then raise the seal and the beams' source together.
    gate.style.setProperty("--gate-rise", getComputedStyle(gate).getPropertyValue("--gate-rise") || "0px");
    gate.classList.add("is-opening");
    trigger.disabled = true;
    const glare = reduced ? null : glareRenderer(canvas, space.width, space.height);
    if (glare) gate.classList.add("has-glare");
    gate.querySelectorAll(".portal-breath path").forEach(path => path.setAttribute("filter", "url(#portal-shaft-plain)"));
    const weights = [...gate.querySelectorAll(".portal-breath")].map((el, i) =>
      (Number(getComputedStyle(el).opacity) || .8) * (Number(getComputedStyle(gate.querySelectorAll(".portal-ray-bearing")[i]).opacity) || 1));
    const start = gate.querySelector(".portal-source .login-drift").getBoundingClientRect();
    const rise = -space.height * RISE;                   // the source lifts by this much over the opening
    const paint = time => {
      const f = openingAt(time), style = gate.style;
      style.setProperty("--portal-open", String(f.progress));
      style.setProperty("--portal-pitch", `${f.pitch}deg`);
      style.setProperty("--portal-width", String(f.width));
      style.setProperty("--portal-face", String(f.face));
      style.setProperty("--portal-light", String(f.light));
      style.setProperty("--portal-shadow", String(f.shadow));
      if (glare) glare.paint(glareFrame(space, { x: start.x, y: start.y + rise * f.progress }, f, weights));
    };
    if (!reduced) {
      const start = performance.now();
      const tick = now => {
        const time = Math.min(1, (now - start) / OPEN_MS);
        paint(time);
        motion = time < 1 ? requestAnimationFrame(tick) : 0;
      };
      motion = requestAnimationFrame(tick);
    }
    setTimeout(() => {
      // Full white: take the scene away and let the light fade off the night site.
      cancelAnimationFrame(motion);
      paint(1);
      glare?.dispose();
      gate.replaceChildren();
      gate.style.setProperty("--portal-adjust-ms", `${reduced ? 240 : ADJUST_MS}ms`);
      gate.classList.add("is-settling");
      root.classList.remove("gated");
      site.inert = false;
      try { sessionStorage.setItem("sternbild.entered", "1"); } catch {}
      let done = false;
      const finish = () => { if (done) return; done = true; gate.remove(); };
      gate.addEventListener("animationend", finish, { once: true });
      setTimeout(finish, (reduced ? 240 : ADJUST_MS) + 50);
    }, reduced ? 160 : OPEN_MS + HOLD_MS);
  };

  site.inert = true;
  layout();
  new ResizeObserver(layout).observe(gate);
  gate.addEventListener("click", open);                 // anywhere on the screen, the seal included
  // The seal rises a little while the pointer is near it, and settles when it moves away; its beams' source rises with
  // it so they stay attached (their light does not change). Its ground shadow stays, so it lifts off the ground.
  const hovering = matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
  const settle = () => { if (phase === "idle") gate.style.setProperty("--gate-rise", "0px"); };
  gate.addEventListener("pointermove", event => {
    if (phase !== "idle" || !hovering.matches || event.pointerType === "touch" || !space) return;
    const seal = parseFloat(gate.style.getPropertyValue("--seal-size"));
    const centre = parseFloat(gate.style.getPropertyValue("--gate-center-y"));
    const near = Math.hypot(event.clientX - space.width / 2, event.clientY - centre) < seal * .95;
    gate.style.setProperty("--gate-rise", near ? "-10px" : "0px");
  });
  gate.addEventListener("pointerleave", settle);

  // Only a deliberate act enters: a click or tap, or Enter or Space. Scrolling and swiping do not, as a trackpad's
  // light touch would open the site by accident.
  addEventListener("keydown", event => {
    if (phase === "idle" && ["Enter", " "].includes(event.key) && document.activeElement !== trigger) {
      event.preventDefault(); open();
    }
  });
})();
