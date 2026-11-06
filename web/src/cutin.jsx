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
float lum(vec3 c){ return max(max(c.r, c.g), c.b); }

// ---- 雲の空: 前半は暗い灰褐色、後半はクリーム色の岩のような雲 ----
vec3 sky(vec2 p){
  float tone = smoothstep(.9, 1.3, T);
  vec2 q = rot(-.2) * p * (1. + T * .12) + vec2(T * .18, T * .04);
  float c1 = fbm(q * 2.2 + fbm(q * 1.3) * 1.8);
  float c2 = fbm(q * 5. + c1 * 2.);
  vec3 dk = mix(vec3(.27, .24, .26), vec3(.72, .66, .68), smoothstep(.3, .85, c1));
  dk += vec3(.12, .1, .1) * smoothstep(.55, .9, c2);
  vec3 lt = mix(vec3(.5, .42, .38), vec3(1., .97, .92), smoothstep(.3, .75, c1));
  lt = mix(lt, vec3(.6, .48, .4), smoothstep(.5, .85, c2) * .5);
  return mix(dk, lt, tone);
}

// 青い衝撃(爆発)1つ分。白い芯→水色→青、放射状のトゲ、火花
vec3 burst(vec2 p, vec2 c, float t0, float sz, out float rockMask){
  rockMask = 0.;
  float t = T - t0; if (t < 0.) return vec3(0.);
  vec2 d = p - c; float r = length(d), a = atan(d.y, d.x);
  float k = 1. - exp(-t * 8.);
  float sp = pow(n(vec2(a * 9., t * 2.)), 2.) * 1.2 + pow(n(vec2(a * 26., t * 4.)), 3.) * 1.5;
  float rr = r / (sz * (.4 + k * 2.4));
  float body = smoothstep(1. + sp * .9, .0, rr) * (.55 + .6 * sp);
  float fade = exp(-t * 1.9);
  vec3 c0 = mix(vec3(.04, .22, .85), vec3(.35, .8, 1.), body);
  c0 = mix(c0, vec3(1.), pow(body, 3.));
  float spark = step(.97, h(floor(d / sz * 26. + floor(t * 12.)))) * smoothstep(1.6, .3, rr) * 1.3;
  float ring = smoothstep(.03, 0., abs(r - t * sz * 6.)) * exp(-t * 5.) * .5;
  return (c0 * body * 1.5 + vec3(.6, .9, 1.) * (spark + ring)) * fade;
}

// 魔法陣1つ分(歯車のような二重の輪+星)
vec3 circle(vec2 p, vec2 c, float t0, float rr, float seed){
  float t = T - t0; if (t < 0.) return vec3(0.);
  vec2 d = p - c; float r = length(d), a = atan(d.y, d.x) + t * (seed > .5 ? .8 : -.8);
  float grow = smoothstep(0., .25, t);
  rr *= .7 + .3 * grow;
  float ring = smoothstep(.0045, 0., abs(r - rr)) + smoothstep(.003, 0., abs(r - rr * .78)) * .8;
  float teeth = smoothstep(.01, 0., abs(r - rr * 1.12)) * step(.45, fract(a * 12. / PI));
  float inner = smoothstep(.003, 0., abs(r - rr * .5)) * .8;
  float star = smoothstep(.004, 0., abs(r * cos(mod(a, PI * .4) - PI * .2) - rr * .36)) * step(r, rr * .78);
  float glow = exp(-r * r / (rr * rr * .8)) * .35;
  return vec3(.4, .75, 1.) * (ring + teeth * .8 + inner + star * .8) * 1.5 * grow + vec3(.1, .3, .9) * glow * grow;
}

void main(){
  float S = min(R.x, R.y);
  vec2 p = (gl_FragCoord.xy - .5 * R) / S;
  vec2 A = R / S;
  vec3 col = vec3(0.);

  // ===== 0.0〜0.6 暗い雲の空に、淡い青の光の柱が降りる =====
  float wA = 1. - smoothstep(.55, .72, T);
  if (wA > 0.){
    vec3 s = sky(p);
    float pil = 0.;
    for (int i = 0; i < 9; i++){
      float fi = float(i);
      float x0 = (h(vec2(fi, 4.)) - .5) * A.x * 1.1;
      vec2 u = rot(.2 + (h(vec2(fi, 8.)) - .5) * .25) * (p - vec2(x0, .55));
      float wd = .006 + (.5 - u.y) * .028;
      float on = smoothstep(.12 + fi * .02, .3 + fi * .02, T);
      pil += exp(-pow(u.x / wd, 2.)) * smoothstep(-.4, .2, u.y) * (1. - smoothstep(.45, .6, u.y)) * on * (.5 + h(vec2(fi, 2.)) * .6);
    }
    s += vec3(.55, .75, 1.) * pil * .9;
    s += vec3(.7, .9, 1.) * smoothstep(.2, .55, T) * .22 * exp(-length(p - vec2(.1, .1)) * 1.8);  // 青い光が満ちてくる
    float sp = step(.9996, h(floor(p * 60. + vec2(0., floor(T * 14.))))) * smoothstep(.0, .2, T);
    s += vec3(.9, 1., .8) * sp * 1.4;   // 小さな火花
    s += vec3(.7, 1., .8) * exp(-pow(length(rot(-.25) * (p - vec2(.18, .15)) * vec2(14., 2.2)), 2.)) * smoothstep(.0, .15, T) * (1. - smoothstep(.2, .4, T)) * 1.4; // 緑白の光の筋(竜の気配)
    col = mix(col, s, wA);
  }

  // ===== 0.4〜0.8 青い光の雲が広がり、斜めの青い帯と暗い青の輪が走る =====
  float wB = smoothstep(.36, .52, T) * (1. - smoothstep(.76, .8, T));
  if (wB > 0.){
    vec3 s0 = sky(p) * .75;
    vec2 c = vec2(-.38, -.02);
    float sc = .5 + (T - .36) * 1.5;
    float bub = fbm((p - c) * 3. + vec2(T * .9, 0.));
    float rad = length((p - c) * vec2(.78, 1.)) / sc + (bub - .5) * .6;
    float g = smoothstep(1., .1, rad);
    vec3 bc = mix(vec3(.2, .5, .95), vec3(.6, .96, 1.), g * g);
    bc = mix(bc, vec3(1.), pow(g, 4.) * .8);
    vec3 b = mix(s0 + vec3(.05, .15, .35), bc, clamp(g * 1.15, 0., 1.));
    // 斜めの帯(輪郭がはっきりした青い板)
    vec2 u = rot(.74) * (p - vec2(.22, .05));
    float wd = .02 + smoothstep(.45, .78, T) * .27;
    float slab = smoothstep(.015, 0., abs(u.y + .04) - wd);
    float stk = n(vec2(u.y * 70., u.x * 1.4 - T * 12.));
    vec3 sl = mix(vec3(.15, .75, 1.), vec3(.85, 1., 1.), smoothstep(.3, .0, abs(u.y + .04)) + stk * .3);
    b = mix(b, sl, slab * .95 * smoothstep(.5, .65, T));
    // 暗い青の輪(竜の影のような曲線)
    vec2 rc = p - vec2(.3, -.05);
    float ang = atan(rc.y, rc.x);
    float rg = length(rc) + (fbm(vec2(ang * 2., T * 1.5)) - .5) * .14;
    float ringm = (smoothstep(.03, 0., abs(rg - .36)) + smoothstep(.02, 0., abs(rg - .5 + .04 * sin(ang * 3.))) * .8) * smoothstep(-.3, .8, sin(ang * 1.0 + 1.)) * smoothstep(.52, .62, T);
    b = mix(b, vec3(.03, .1, .42), ringm * .92);
    col = mix(col, b, wB);
  }

  // ===== 0.72〜0.9 真っ白に光る =====
  col = mix(col, vec3(1.), win(.7, .78, .82, .9));

  // ===== 0.85〜1.2 右へ流れる水色の速度線と、青い破片 =====
  float wC = win(.84, .9, 1.1, 1.2);
  if (wC > 0.){
    vec2 F = vec2(.42, -.06); vec2 d = p - F; float r = length(d), a = atan(d.y, d.x);
    float sp = pow(n(vec2(a * 26., T * 9.)), 2.2) * 1.6 + pow(n(vec2(a * 70., -T * 12.)), 3.) * 1.2;
    vec3 cc = mix(vec3(.1, .6, 1.), vec3(.9, 1., 1.), smoothstep(.1, .9, sp * exp(-r * .7) + .45 * exp(-r * 1.6)));
    float sh = smoothstep(.55, .75, n(vec2(a * 9., r * 2.5 - T * 9.)) * .8 + fbm(vec2(a * 2., r * 4. - T * 6.)) * .4);
    cc = mix(cc, vec3(.04, .22, .8), sh * .65 * smoothstep(.1, .5, r));
    cc += vec3(1.) * exp(-r * r * 9.) * .6;
    float low = smoothstep(.05, -.4, p.y + .3 * p.x) * smoothstep(.95, 1.15, T);
    cc = mix(cc, sky(p) * .8, low * .6);
    col = mix(col, cc, wC);
  }

  // ===== 1.1〜1.6 岩のような雲の空。青い筋が1点に向かって集まる =====
  float wD = win(1.08, 1.2, 1.5, 1.6);
  if (wD > 0.){
    vec3 s = sky(p);
    vec2 F2 = vec2(.34 + (T - 1.2) * .12, -.02); vec2 d = p - F2;
    float a = atan(d.y, d.x), r = length(d);
    float da = abs(mod(a - 2.5 + PI, 2. * PI) - PI);
    float cone = smoothstep(.36, .0, da) * exp(-r * .45);
    float sk = n(vec2(a * 55., T * 6.)) * .6 + .5;
    s += vec3(.25, .7, 1.) * cone * sk * 1.6 + vec3(.9, .97, 1.) * cone * cone * 1.6;
    s += vec3(.8, .92, 1.) * smoothstep(.3, -.5, p.x * .7 - p.y) * .35 * (1. - smoothstep(1.3, 1.5, T));
    s += vec3(.85, .95, 1.) * exp(-r * r * 45.) * smoothstep(1.15, 1.55, T) * 3.;
    col = mix(col, s, wD);
  }

  // ===== 1.52〜1.84 傾いた渦(目のような円盤): 橙の炎の輪・青い縁・白い芯 =====
  float wE = win(1.5, 1.58, 1.78, 1.84);
  if (wE > 0.){
    vec3 bg = sky(p * 1.15) * .6;
    float zoom = 1.05 * (1. + smoothstep(1.55, 1.84, T) * 2.4);
    vec2 e = (p - vec2(.03, -.05)) / zoom;
    e = rot(-.45) * e; e.y /= .72;
    float r = length(e), a = atan(e.y, e.x);
    float sw = fbm(vec2(a * 2. + r * 7. - T * 5., r * 5.));
    vec3 v = mix(vec3(.55, .08, .03), vec3(1., .72, .15), sw);
    v = mix(v, vec3(1., .95, .75), smoothstep(.34, .22, r) * (.55 + .45 * sw));
    float rim = smoothstep(.09, .12, r) * smoothstep(.2, .17, r);
    v = mix(v, mix(vec3(.04, .18, .8), vec3(.5, .8, 1.), sw), rim);
    float pup = smoothstep(.095, .08, r);
    v = mix(v, vec3(.02, .05, .22), pup);
    { vec2 gq = e * 110.; v += vec3(.7, .85, 1.) * step(.985, h(floor(gq))) * smoothstep(.45, .1, length(fract(gq) - .5)) * pup * 1.8; }
    v += vec3(1.) * exp(-r * r * 1800.) * 3.;
    v += vec3(1., .6, .2) * exp(-abs(r - .3) * 18.) * .25;
    float rim2 = smoothstep(.44, .48, r) * smoothstep(.6, .52, r);
    v = mix(v, mix(vec3(.05, .2, .85), vec3(.5, .8, 1.), sw), rim2 * .9);
    float stk = pow(n(vec2(a * 30., T * 9.)), 3.) * smoothstep(.15, .7, r) * smoothstep(1.62, 1.76, T);
    v += mix(vec3(.5, .8, 1.), vec3(1., .7, .3), n(vec2(a * 9., 3.))) * stk * 1.8;
    float al = smoothstep(.9, .5, r);
    col = mix(col, mix(bg, v, al), wE);
  }

  // ===== 1.76〜1.9 白地に黒いインクの筆致(漫画のような一瞬のコマ) =====
  float wF = win(1.8, 1.82, 1.86, 1.88);
  if (wF > 0.){
    float r0 = length(p), an = atan(p.y, p.x);
    float ink = 0.;
    for (int i = 0; i < 3; i++){
      float Rr = .26 + float(i) * .24 + sin(T * 20. + float(i)) * .01;
      float wob = .05 * sin(an * 5. + float(i) * 2.) + .06 * n(vec2(an * 3., float(i)));
      float th = .045 * (.5 + .5 * sin(an * 2. + float(i)));
      ink += smoothstep(th, 0., abs(r0 - Rr + wob)) * step(.3, n(vec2(an * 1.6 + float(i) * 3., 1.)));
    }
    ink += smoothstep(.62, .7, n(vec2(an * 22., 4.))) * smoothstep(.2, .55, r0) * smoothstep(.1, .0, abs(fract(r0 * 3. + .5) - .5) - .3) * .9;
    col = mix(col, mix(vec3(1.), vec3(.03), clamp(ink, 0., 1.)), wF);
  }

  // ===== 1.86〜2.45 炎の中に、巨大な青いエネルギー球 =====
  float wG = win(1.84, 1.9, 2.34, 2.44);
  if (wG > 0.){
    vec2 q = p * 2.2;
    float f1 = fbm(q + fbm(q * 1.5 + T * .6) * 1.6 - vec2(0., T * .7));
    vec3 fc = mix(vec3(.85, .12, .03), vec3(1., .55, .06), smoothstep(.2, .55, f1));
    fc = mix(fc, vec3(1., .92, .4), smoothstep(.5, .8, f1));
    fc *= (.85 + .5 * f1);
    vec2 sc = vec2(.02, .0); float R0 = .4 + (T - 1.9) * .1;
    vec2 d = p - sc; float r = length(d), a = atan(d.y, d.x), x = r / R0;
    float tex = fbm(d * 12. + T);
    vec3 bl = mix(vec3(.02, .06, .55), vec3(.2, .5, 1.), tex);
    float band = smoothstep(.6, .7, x) * smoothstep(.97, .87, x);
    bl = mix(bl, vec3(.01, .03, .32), band * .85);
    bl += vec3(.3, .6, 1.) * smoothstep(.55, .0, x);
    bl += vec3(.8, .9, 1.) * step(.96, h(floor(d * 170. + floor(T * 8.)))) * smoothstep(.2, .9, x) * 1.6;
    bl += vec3(1.) * smoothstep(.34, .0, x) * (1.6 + (T - 1.9) * 1.8);
    float inside = smoothstep(1.01, .99, x);
    bl += vec3(.7, .95, 1.) * smoothstep(.06, .0, abs(x - .985 + .03 * (fbm(vec2(a * 6., T * 6.)) - .5))) * 1.6;
    vec3 glow = vec3(.4, .7, 1.) * exp(-max(x - 1., 0.) * 8.) * .9;
    float cr = smoothstep(.012, 0., abs(r - R0 * 1.17)) * smoothstep(.2, .9, sin(a * 1. - .8));
    cr += smoothstep(.01, 0., abs(r - R0 * 1.3)) * smoothstep(.5, .95, sin(a * 1. + 2.4)) * .7;
    float rp = (T - 2.18) * 1.1;
    float rip = T > 2.18 ? smoothstep(.014, 0., abs(r - R0 - rp)) * exp(-(T - 2.18) * 7.) : 0.;
    vec3 c2 = fc + glow;
    c2 = mix(c2, bl, inside) + vec3(1.) * cr * .9 + vec3(.7, .9, 1.) * rip * 1.6;
    col = mix(col, c2, wG);
  }

  // ===== 2.34〜 白とピンクの閃光(このあと透明になって盤面が見える) =====
  float wH = smoothstep(2.32, 2.42, T);
  if (wH > 0.){
    float r = length(p), an = atan(p.y, p.x);
    float edge = smoothstep(.25, .9, r);
    float pk = pow(n(vec2(an * 22., T * 5.)), 2.) * edge;
    vec3 hh = mix(vec3(1.), vec3(1., .55, .85), pk * 1.3);
    hh = mix(hh, vec3(.55, .72, 1.), pow(n(vec2(an * 40., T * 3.)), 3.) * edge);
    col = mix(col, hh, wH);
  }

  float solid = 1. - smoothstep(2.5, 2.72, T);

  // ===== 2.55〜 盤面の上: 水色の光が盤面を洗い、青い衝撃・巨大な爆発・岩の破片・魔法陣 =====
  vec3 add = vec3(0.); float wash = 0.; float rock = 0.;
  if (T > 2.5){
    wash = smoothstep(2.5, 2.6, T) * (1. - smoothstep(2.72, 3.3, T)) * .9;
    add += vec3(.6, .85, 1.) * wash * .7;
    float sh = smoothstep(2.9, 3.0, T) * (1. - smoothstep(3.0, 3.8, T)) + smoothstep(2.6, 2.7, T) * (1. - smoothstep(2.7, 3.0, T)) * .4;
    vec2 q = p + (vec2(n(vec2(T * 45., 1.)), n(vec2(T * 45., 9.))) - .5) * .028 * sh;
    float ca = .014 * sh;
    // 小さな衝撃(2.6〜3.1)。盤面の上のあちこちで弾ける
    for (int i = 0; i < 8; i++){
      float fi = float(i), r0, r1, r2;
      vec2 c = vec2((h(vec2(fi, 3.)) - .5) * A.x * .8, (h(vec2(fi, 7.)) - .5) * .6);
      float t0 = 2.62 + fi * .06 + h(vec2(fi, 5.)) * .1;
      float sz = .08 + h(vec2(fi, 1.)) * .07;
      vec3 b = burst(q, c, t0, sz, r0);
      add += b * (1. - smoothstep(3.0, 3.3, T));
    }
    // 巨大な爆発(3.0〜3.7): 青い炎と、暗い青の岩の破片が一面に飛び散る。色収差つき
    float tG = T - 3.0;
    if (tG > 0.){
      vec2 c = vec2(.12, -.04);
      float k = 1. - exp(-tG * 6.);
      float Rg = .18 + k * .95;
      for (int ch = 0; ch < 3; ch++){
        vec2 qq = q + vec2(float(ch - 1) * ca, 0.);
        vec2 d = qq - c;
        float rl = length(d);
        float fv = fbm(d * 9. + vec2(tG * 1.5, 0.));
        float frag = pow(1. - abs(fv * 2. - 1.), 9.) * .55 + smoothstep(.62, .72, fv) * .5;
        float shell = smoothstep(.07 * Rg + .02, .0, abs(rl - Rg * .88)) * (.6 + .6 * fbm(vec2(atan(d.y, d.x) * 5., tG * 2.)));  // 衝撃の輪
        float inner = smoothstep(Rg * .95, Rg * .1, rl) * frag;
        float body = clamp(shell * 1.3 + inner * 1.1, 0., 1.);
        float f2 = exp(-tG * 1.1);
        vec3 bc = mix(vec3(.03, .22, .85), vec3(.35, .85, 1.), body);
        bc = mix(bc, vec3(1.), pow(body, 4.) * .8 + smoothstep(Rg * .25, 0., rl) * .8);
        float v = body * f2 * 1.5;
        if (ch == 0) add.r += bc.r * v; else if (ch == 1) add.g += bc.g * v; else add.b += bc.b * v;
      }
      add += vec3(.4, .8, 1.) * exp(-pow(length(q - c) / (Rg * .35), 2.)) * exp(-tG * 4.) * 1.2;
      // 岩の破片
      vec2 ex = c + (q - c) / (1. + tG * 1.8);
      vec2 g = (ex - c) * 6.; vec2 id = floor(g), f = fract(g) - .5;
      float rn = h(id + 3.);
      vec2 off = (vec2(h(id + 1.), h(id + 2.)) - .5) * .5;
      float sizeR = .14 + .2 * h(id + 5.);
      vec2 fo = (f - off) * vec2(1., 1. + rn * .8);
      float rk = smoothstep(sizeR, sizeR * .62, length(fo) * (1. + .5 * (fbm(fo * 6. + id) - .5)));
      rock = rk * step(.42, rn) * smoothstep(0., .12, tG) * (1. - smoothstep(.55, 1.15, tG)) * smoothstep(.1, .5, length(q - c));
    }
    // 魔法陣(3.3〜4.2): 盤面のあちこちに浮かぶ
    for (int i = 0; i < 12; i++){
      float fi = float(i);
      vec2 c = vec2((h(vec2(fi, 11.)) - .5) * A.x * .86, (h(vec2(fi, 13.)) - .5) * .66);
      add += circle(q, c, 3.3 + h(vec2(fi, 6.)) * .45, .085 + h(vec2(fi, 9.)) * .04, h(vec2(fi, 15.))) * (1. - smoothstep(4.0, 4.2, T));
    }
  }

  vec3 rgb = col * solid + add;
  float a = clamp(solid + wash + lum(add), 0., 1.);
  rgb = rgb * (1. - rock * .9) + vec3(.01, .03, .16) * rock * .9;
  a = max(a, rock * .92);
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
