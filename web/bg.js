// Hero background: drifting fog, drawn as a fragment shader.
// ponytail: a shader, not a video file and not a gradient. Nothing to download, nothing
// to license, no autoplay rules, and it never loops back to a seam. Falls back to the
// hero's flat night colour anywhere WebGL is missing.
const canvas = document.getElementById("bg");
const gl = canvas?.getContext("webgl", { antialias: false, alpha: false });

if (gl) {
  const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

  // Value-noise fbm, domain-warped twice so the shapes fold into each other instead of
  // sliding past. Slow: a full turnover takes a couple of minutes.
  const FRAG = `
precision mediump float;
uniform vec2 res;
uniform float t;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / res;
  uv.x *= res.x / res.y;
  vec2 p = uv * 2.6;

  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.06)), fbm(p + vec2(4.3, -t * 0.05)));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.03),
                fbm(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.02));
  float f = fbm(p + 3.5 * r);

  vec3 deep = vec3(0.031, 0.043, 0.075);
  vec3 mid  = vec3(0.086, 0.192, 0.298);
  vec3 lift = vec3(0.235, 0.396, 0.514);

  vec3 col = mix(deep, mid, clamp(f * f * 2.4, 0.0, 1.0));
  col = mix(col, lift, clamp(length(r) * 0.55, 0.0, 1.0) * 0.55);

  // Faint grain, so flat areas do not band on wide screens.
  col += (hash(gl_FragCoord.xy) - 0.5) * 0.012;
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
    // Half resolution. It is fog — nobody can tell, and it quarters the fill cost.
    const dpr = Math.min(devicePixelRatio, 2) * 0.5;
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
