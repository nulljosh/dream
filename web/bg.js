// Hero background: a kaleidoscopic fractal, drawn as a fragment shader.
// ponytail: a shader, not a video file and not a gradient. Nothing to download, nothing
// to license, no autoplay rules, and it never loops back to a seam. Falls back to the
// hero's flat night colour anywhere WebGL is missing.
const canvas = document.getElementById("bg");
const gl = canvas?.getContext("webgl", { antialias: false, alpha: false });

if (gl) {
  const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

  // Value-noise fbm, domain-warped twice so the shapes fold into each other instead of
  // sliding past. Slow: a full turnover takes a couple of minutes.
  // Kaleidoscopic fractal. Sixfold mirror symmetry, an escaping fold that builds
  // filigree, and a slow zoom so it reads as falling into it rather than watching it.
  // Palette is deep blue -> amber -> coral by construction, because the house rule bans
  // the purple and teal this kind of visual usually reaches for.
  const FRAG = `
precision highp float;
uniform vec2 res;
uniform float t;

const float TAU = 6.28318;
const float SIDES = 6.0;

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / res.y;

  // Kaleidoscope: fold the plane into one wedge and mirror it.
  float a = atan(uv.y, uv.x);
  float r = length(uv);
  float seg = TAU / SIDES;
  a = mod(a, seg);
  a = abs(a - seg * 0.5);
  vec2 p = vec2(cos(a), sin(a)) * r;

  // Breathing zoom plus a slow counter-rotation, so it never sits still or repeats.
  p *= 1.6 + 0.55 * sin(t * 0.07);
  p *= rot(t * 0.045);

  // Kali fold. Each pass inverts and offsets, which is what makes the filigree.
  float glow = 0.0, edge = 0.0;
  vec2 c = vec2(0.86 + 0.05 * sin(t * 0.05), 0.72 + 0.05 * cos(t * 0.04));
  for (int i = 0; i < 9; i++){
    p = abs(p) / dot(p, p) - c;
    float l = length(p);
    glow += exp(-l * 1.7);
    edge += 1.0 / (1.0 + l * l * 6.0);
  }
  glow /= 9.0;
  edge /= 9.0;

  float v = clamp(glow * 1.55, 0.0, 1.0);
  float hot = clamp(edge * 2.1, 0.0, 1.0);

  vec3 night = vec3(0.027, 0.039, 0.070);
  vec3 blue  = vec3(0.055, 0.184, 0.353);
  vec3 amber = vec3(0.855, 0.616, 0.267);
  vec3 coral = vec3(0.847, 0.361, 0.286);
  vec3 cream = vec3(0.976, 0.925, 0.855);

  vec3 col = mix(night, blue, smoothstep(0.05, 0.55, v));
  col = mix(col, amber, smoothstep(0.45, 0.92, v) * 0.85);
  col = mix(col, coral, smoothstep(0.30, 0.80, hot) * 0.45);
  col = mix(col, cream, smoothstep(0.86, 1.0, v) * 0.55);

  // Vignette, so the centre stays readable under the headline.
  col *= 1.0 - 0.55 * smoothstep(0.35, 1.15, length(uv));
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(127.1, 311.7))) * 43758.5) - 0.5) * 0.012;
  gl_FragColor = vec4(col, 1.0);
}`;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const p = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, "res");
  const uT = gl.getUniformLocation(prog, "t");

  const resize = () => {
    // Two-thirds resolution. The fold has fine filigree in it, so half res smeared it,
    // but full res on a retina panel is a lot of fill for a background.
    const dpr = Math.min(devicePixelRatio, 2) * 0.66;
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  addEventListener("resize", resize);
  resize();

  const draw = (t) => {
    gl.uniform1f(uT, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let last = 0;
  const loop = (ms) => {
    // 30fps is plenty for something this slow, and halves the GPU work on a laptop.
    if (ms - last > 33) {
      draw(ms / 1000);
      last = ms;
    }
    if (!still.matches) requestAnimationFrame(loop);
  };

  // Reduced motion still gets the fog, just frozen — a still frame, not a blank panel.
  draw(0);
  if (!still.matches) requestAnimationFrame(loop);
  still.addEventListener("change", () => {
    if (!still.matches) requestAnimationFrame(loop);
  });
  document.addEventListener("visibilitychange", () => {
    // Do not burn a GPU on a tab nobody is looking at.
    if (!document.hidden && !still.matches) requestAnimationFrame(loop);
  });
}
