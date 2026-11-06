import { useEffect, useRef } from 'react'

// カットイン演出(全画面・WebGL)。1つのシェーダーで、雲・光線・斬撃・渦・閃光・炎・青い球・衝撃・魔法陣を時間 T の関数として描く。
// 画像は使わない(全部その場で計算)。動かすのは時間の値だけなので、GPUで60fps。
// ファンファーレなどのタイミングで、キャラごとに決めた演出を流す。映像素材の転用はせず、独自の描画。

export const CUTINS = {
  'アルビオンバハムート|ファンファーレ': { id: 'albion', ms: 4200 },
}
export const cutinOf = (ev) => (ev && ev.type === 'ability' ? CUTINS[`${ev.owner}|${ev.kind}`] || null : null)

const VS = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`

const FS = `#version 300 es
precision highp float;
uniform vec2 R; uniform float T; out vec4 o;
#define PI 3.14159265
float h(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 5; i++){ s += a * n(p); p = m * p; a *= .5; } return s; }
float win(float a, float b, float c, float d){ return smoothstep(a, b, T) * (1. - smoothstep(c, d, T)); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// 衝撃(青い爆発)1つ分の明るさ。c=中心, t0=開始時刻
float burst(vec2 p, vec2 c, float t0, float sz){
  float t = T - t0; if (t < 0.) return 0.;
  vec2 d = p - c; float r = length(d);
  float k = 1. - exp(-t * 9.);
  float body = exp(-r * r / (sz * sz * (.5 + k * 2.6)));
  float tex = (.35 + fbm(d * 6. / sz * .35 + vec2(t * 1.5, 0.)) * 1.5);
  float fade = exp(-t * 2.2);
  float ring = smoothstep(.02, 0., abs(r - t * sz * 5.)) * exp(-t * 4.) * .25;
  return (body * tex * 1.6 + ring * .9) * fade;
}

void main(){
  float S = min(R.x, R.y);
  vec2 p = (gl_FragCoord.xy - .5 * R) / S;
  vec2 A = R / S;                    // 画面の広がり(短辺=1)
  vec3 col = vec3(0.); float alpha = 1.;

  // ---- 1) 雲の中を進む(0〜1.5秒) ----
  float wCloud = 1. - smoothstep(1.35, 1.7, T);
  if (wCloud > 0.){
    float z = 1. + T * .8;
    vec2 q = p / z + vec2(T * .05, 0.);
    float c1 = fbm(q * 3. + fbm(q * 2.) * 1.5);
    float c2 = fbm(q * 5. - vec2(0., T * .15));
    vec3 cl = mix(vec3(.30, .28, .34), vec3(.86, .88, .95), smoothstep(.25, .8, c1));
    cl = mix(cl, vec3(.62, .5, .45), smoothstep(.5, .9, c2) * .4);
    // 光の筋(斜めに走る)
    float st = smoothstep(.0, .45, T) * (1. - smoothstep(.4, .7, T));
    vec2 sd = rot(.9) * (p - vec2(-.4 + T * 1.6, .1 - T * .5));
    cl += vec3(.8, .95, 1.) * st * exp(-abs(sd.y) * 90.) * exp(-sd.x * sd.x * 2.) * 2.;
    // 放射状の青い光線(0.45〜1.5)
    float rw = win(.4, .8, 1.3, 1.6);
    vec2 rc = p - vec2(-.35, .35);
    float ang = atan(rc.y, rc.x);
    float rays = pow(n(vec2(ang * 9., T * .6)) * .7 + n(vec2(ang * 23., -T)) * .5, 2.4);
    cl += vec3(.3, .6, 1.) * rays * rw * 2.2 * exp(-length(rc) * .6);
    // 青い斬撃(0.9〜1.7): 斜めの速度線
    float sw = win(.85, 1.15, 1.45, 1.75);
    vec2 u = rot(-.6) * p;
    float sl = smoothstep(.55, 1., n(vec2(u.y * 38., u.x * .6 - T * 14.))) * exp(-u.y * u.y * 3.);
    float band = exp(-u.y * u.y * 10.);
    cl = mix(cl, vec3(.05, .35, .9), band * sw * .75);
    cl += vec3(.5, .9, 1.) * (sl * 1.8 + band * .5) * sw;
    col = mix(col, cl, wCloud);
  }

  // ---- 2) 渦(1.4〜1.95) ----
  float wV = win(1.35, 1.55, 1.8, 1.98);
  if (wV > 0.){
    float r = length(p) + 1e-4, ang = atan(p.y, p.x);
    float tw = ang + 3.2 / (r + .25) - T * 7.;
    float s = fbm(vec2(cos(tw), sin(tw)) * 1.8 + vec2(r * 4. - T * 1.5, r * 3.));
    vec3 v = mix(vec3(1., .45, .08), vec3(1., .85, .35), s);
    v = mix(v, vec3(.15, .45, 1.), smoothstep(.45, .1, r));
    v += vec3(.8, .9, 1.) * exp(-r * r * 90.) * 2.;
    v *= .5 + .7 * s;
    col = mix(col, v, wV);
  }

  // ---- 3) 白い閃光とインクの網点(1.75〜2.0) ----
  float wF = win(1.7, 1.82, 1.9, 2.05);
  if (wF > 0.){
    float r0 = length(p), an = atan(p.y, p.x);
    float st = n(vec2(cos(an), sin(an)) * 9. + r0 * 2.5 - T * 2.) * .65 + fbm(p * 5. + T) * .5;
    float ink = smoothstep(.55, .62, st) * smoothstep(.12, .45, r0);
    vec3 f = mix(vec3(1.), vec3(.12, .13, .8), ink);
    col = mix(col, f, wF);
  }

  // ---- 4) 炎と青いエネルギー球(1.95〜2.7) ----
  float wS = win(1.9, 2.0, 2.55, 2.75);
  if (wS > 0.){
    float r = length(p);
    float fl = fbm(vec2(p.x * 3., p.y * 3. - T * 2.5) + fbm(p * 4.) * 1.2);
    vec3 s = mix(vec3(.9, .25, .02), vec3(1., .75, .2), fl) * (.8 + fl);
    float pul = .24 + .015 * sin(T * 30.) + smoothstep(2., 2.5, T) * .05;
    float d = r - pul;
    float ball = fbm(p * 14. + vec2(T * 2., -T));
    s = mix(s, mix(vec3(.05, .18, .85), vec3(.35, .7, 1.), ball), smoothstep(.02, -.03, d));                // 球
    s += vec3(.3, .6, 1.) * exp(-max(d, 0.) * 14.) * .9;                       // 輪郭の光
    float ang = atan(p.y, p.x);
    for (int i = 0; i < 3; i++){
      float R0 = pul + .05 + float(i) * .075 + (T - 1.95) * .12;
      float ring = smoothstep(.012, 0., abs(r - R0)) * (.55 + .45 * sin(ang * (24. + float(i) * 8.) + T * (6. - float(i) * 3.)));
      s += vec3(.5, .8, 1.) * ring * 1.4;
    }
    s += vec3(.9, .95, 1.) * smoothstep(.12, 0., r) * 1.5;                    // 芯
    col = mix(col, s, wS);
  }

  // ---- 5) 2度目の閃光(白〜桃色)(2.55〜2.95) ----
  float wF2 = win(2.5, 2.68, 2.78, 3.0);
  col = mix(col, mix(vec3(1.), vec3(1., .75, .9), smoothstep(.0, .6, length(p))) , wF2);

  // 3.0秒以降は盤面が透けて見える(透明地に光だけを足す)
  float solid = 1. - smoothstep(2.8, 3.15, T);
  float tt = T;

  // ---- 6) 盤面への衝撃・破片・色収差(2.8〜4.0) ----
  vec3 add = vec3(0.);
  if (T > 2.75){
    float sh = (smoothstep(2.8, 2.9, T) * (1. - smoothstep(2.9, 3.6, T)));
    vec2 q = p + (vec2(n(vec2(T * 40., 1.)), n(vec2(T * 40., 9.))) - .5) * .02 * sh;  // 揺れ
    float ca = .012 * sh;
    vec3 b = vec3(0.);
    for (int i = 0; i < 7; i++){
      float fi = float(i);
      vec2 c = vec2((h(vec2(fi, 3.)) - .5) * A.x * .8, (h(vec2(fi, 7.)) - .5) * .5);
      float t0 = 2.8 + fi * .06 + h(vec2(fi, 5.)) * .1;
      float sz = .16 + h(vec2(fi, 1.)) * .12;
      b.r += burst(q + vec2(ca, 0.), c, t0, sz);
      b.g += burst(q, c, t0, sz);
      b.b += burst(q - vec2(ca, 0.), c, t0, sz);
      // 破片(暗い岩)
      for (int k = 0; k < 6; k++){
        float fk = float(k);
        float a2 = h(vec2(fi * 7. + fk, 2.)) * 6.283, sp = .25 + h(vec2(fi, fk)) * .5;
        float tf = T - t0; if (tf > 0.){
          vec2 pc = c + vec2(cos(a2), sin(a2)) * sp * tf * 1.2 + vec2(0., -tf * tf * .25);
          float dd = length(q - pc);
          float rk = .012 + h(vec2(fk, fi)) * .012;
          float rock = smoothstep(rk, rk * .6, dd) * exp(-tf * 1.2);
          b -= vec3(.9) * rock * .8;
        }
      }
    }
    vec3 hot = vec3(.25, .65, 1.) * b.g;
    hot.r += max(b.r - b.g, 0.) * .6; hot.b += max(b.b - b.g, 0.) * .6;
    hot += vec3(.7, .85, 1.) * pow(max(b.g, 0.), 2.) * .6;
    add += hot;
    add = max(add, vec3(0.));
  }

  // ---- 7) 魔法陣(3.5〜4.2) ----
  float wM = smoothstep(3.45, 3.7, T) * (1. - smoothstep(3.9, 4.2, T));
  if (wM > 0.){
    for (int i = 0; i < 5; i++){
      vec2 c = vec2((float(i) - 2.) * .17 * A.x * 1.5, .12);
      vec2 d = p - c; float r = length(d), ang = atan(d.y, d.x);
      float rr = .075;
      float ring = smoothstep(.004, 0., abs(r - rr)) + smoothstep(.003, 0., abs(r - rr * .72)) * .7;
      float ticks = smoothstep(.01, 0., abs(r - rr * 1.15)) * step(.5, fract(ang * 6. / PI + T * .4));
      float star = smoothstep(.004, 0., abs(r * cos(mod(ang + T * .6, PI / 2.5) - PI / 5.) - rr * .5)) * step(r, rr * .72);
      add += vec3(.35, .7, 1.) * (ring + ticks * .8 + star * .6) * wM * 1.4;
      add += vec3(.1, .3, .8) * exp(-r * r / .006) * wM * .6;
    }
  }

  // 合成: 3.0秒まで不透明、以降は光を足すだけ(透明地)
  vec3 rgb = col * solid + add;
  float a = clamp(solid + max(max(add.r, add.g), add.b), 0., 1.);
  rgb = rgb / max(a, 1e-3) * a;
  o = vec4(clamp(rgb, 0., 1.), a);
}`

// debugT が数値なら、その時刻で1コマだけ描く(動作確認用)
export function CutIn({ ms = 4200, onSkip, debugT }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    const gl = cv.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false })
    if (!gl) { onSkip && onSkip(); return undefined }
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s }
    const pr = gl.createProgram(); gl.attachShader(pr, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr)
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const uR = gl.getUniformLocation(pr, 'R'), uT = gl.getUniformLocation(pr, 'T')
    let scale = Math.min(window.devicePixelRatio || 1, 2), raf = 0, slow = 0, frames = 0
    const size = () => { cv.width = Math.round(cv.clientWidth * scale); cv.height = Math.round(cv.clientHeight * scale) }
    size()
    const draw = (t) => { gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, t); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3) }
    if (typeof debugT === 'number') { draw(debugT); return undefined }
    const t0 = performance.now(); let last = t0
    const loop = (now) => {
      const dt = now - last; last = now; frames += 1
      if (frames > 8 && dt > 24) { slow += 1 } else slow = Math.max(0, slow - 1)
      if (slow > 12 && scale > 0.9) { scale *= 0.8; slow = 0; size() } // 重い端末では、描く細かさを自動で少し下げて、コマ数を守る
      draw(Math.min((now - t0) / 1000, ms / 1000))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [ms, debugT]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div data-testid="cutin" onPointerDown={onSkip} style={{ position: 'fixed', inset: 0, zIndex: 9000, touchAction: 'manipulation', cursor: 'pointer' }}>
      <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
      <div style={{ position: 'absolute', right: 12, bottom: 10, fontSize: 11, color: 'rgba(255,255,255,0.7)', textShadow: '0 0 4px #000' }}>タップでスキップ</div>
    </div>
  )
}
