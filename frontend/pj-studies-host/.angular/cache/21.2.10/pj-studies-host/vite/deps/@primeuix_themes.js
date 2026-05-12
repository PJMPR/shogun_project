import "./chunk-VUJOFXKG.js";

// node_modules/@primeuix/utils/dist/object/index.mjs
var ie = Object.defineProperty;
var K = Object.getOwnPropertySymbols;
var se = Object.prototype.hasOwnProperty;
var ae = Object.prototype.propertyIsEnumerable;
var N = (e, t2, n) => t2 in e ? ie(e, t2, { enumerable: true, configurable: true, writable: true, value: n }) : e[t2] = n;
var d = (e, t2) => {
  for (var n in t2 || (t2 = {})) se.call(t2, n) && N(e, n, t2[n]);
  if (K) for (var n of K(t2)) ae.call(t2, n) && N(e, n, t2[n]);
  return e;
};
function l(e) {
  return e == null || e === "" || Array.isArray(e) && e.length === 0 || !(e instanceof Date) && typeof e == "object" && Object.keys(e).length === 0;
}
function c(e) {
  return typeof e == "function" && "call" in e && "apply" in e;
}
function s(e) {
  return !l(e);
}
function i(e, t2 = true) {
  return e instanceof Object && e.constructor === Object && (t2 || Object.keys(e).length !== 0);
}
function $(e = {}, t2 = {}) {
  let n = d({}, e);
  return Object.keys(t2).forEach((o) => {
    let r2 = o;
    i(t2[r2]) && r2 in e && i(e[r2]) ? n[r2] = $(e[r2], t2[r2]) : n[r2] = t2[r2];
  }), n;
}
function w(...e) {
  return e.reduce((t2, n, o) => o === 0 ? n : $(t2, n), {});
}
function m(e, ...t2) {
  return c(e) ? e(...t2) : e;
}
function a(e, t2 = true) {
  return typeof e == "string" && (t2 || e !== "");
}
function g(e) {
  return a(e) ? e.replace(/(-|_)/g, "").toLowerCase() : e;
}
function F(e, t2 = "", n = {}) {
  let o = g(t2).split("."), r2 = o.shift();
  if (r2) {
    if (i(e)) {
      let u2 = Object.keys(e).find((f) => g(f) === r2) || "";
      return F(m(e[u2], n), o.join("."), n);
    }
    return;
  }
  return m(e, n);
}
function C(e, t2 = true) {
  return Array.isArray(e) && (t2 || e.length !== 0);
}
function z(e) {
  return s(e) && !isNaN(e);
}
function G(e, t2) {
  if (t2) {
    let n = t2.test(e);
    return t2.lastIndex = 0, n;
  }
  return false;
}
function H(...e) {
  return w(...e);
}
function Y(e) {
  return e && e.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\/|[\r\n\t]+/g, "").replace(/ {2,}/g, " ").replace(/ ([{:}]) /g, "$1").replace(/([;,]) /g, "$1").replace(/ !/g, "!").replace(/: /g, ":").trim();
}
function re(e) {
  return a(e) ? e.replace(/(_)/g, "-").replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase() : e;
}

// node_modules/@primeuix/utils/dist/eventbus/index.mjs
function s2() {
  let r2 = /* @__PURE__ */ new Map();
  return { on(e, t2) {
    let n = r2.get(e);
    return n ? n.push(t2) : n = [t2], r2.set(e, n), this;
  }, off(e, t2) {
    let n = r2.get(e);
    return n && n.splice(n.indexOf(t2) >>> 0, 1), this;
  }, emit(e, t2) {
    let n = r2.get(e);
    n && n.forEach((i2) => {
      i2(t2);
    });
  }, clear() {
    r2.clear();
  } };
}

// node_modules/@primeuix/utils/dist/dom/index.mjs
function q(t2, e = {}) {
  return t2 ? `<style${Object.entries(e).reduce((o, [n, r2]) => o + ` ${n}="${r2}"`, "")}>${t2}</style>` : "";
}

// node_modules/@primeuix/utils/dist/zindex/index.mjs
function g2() {
  let r2 = [], i2 = (e, n, t2 = 999) => {
    let s4 = u2(e, n, t2), o = s4.value + (s4.key === e ? 0 : t2) + 1;
    return r2.push({ key: e, value: o }), o;
  }, d2 = (e) => {
    r2 = r2.filter((n) => n.value !== e);
  }, a3 = (e, n) => u2(e, n).value, u2 = (e, n, t2 = 0) => [...r2].reverse().find((s4) => n ? true : s4.key === e) || { key: e, value: t2 }, l2 = (e) => e && parseInt(e.style.zIndex, 10) || 0;
  return { get: l2, set: (e, n, t2) => {
    n && (n.style.zIndex = String(i2(e, true, t2)));
  }, clear: (e) => {
    e && (d2(l2(e)), e.style.zIndex = "");
  }, getCurrent: (e) => a3(e, true) };
}
var x = g2();

// node_modules/@primeuix/styled/dist/index.mjs
var rt = Object.defineProperty;
var st = Object.defineProperties;
var nt = Object.getOwnPropertyDescriptors;
var F2 = Object.getOwnPropertySymbols;
var xe = Object.prototype.hasOwnProperty;
var be = Object.prototype.propertyIsEnumerable;
var _e = (e, t2, r2) => t2 in e ? rt(e, t2, { enumerable: true, configurable: true, writable: true, value: r2 }) : e[t2] = r2;
var h = (e, t2) => {
  for (var r2 in t2 || (t2 = {})) xe.call(t2, r2) && _e(e, r2, t2[r2]);
  if (F2) for (var r2 of F2(t2)) be.call(t2, r2) && _e(e, r2, t2[r2]);
  return e;
};
var $2 = (e, t2) => st(e, nt(t2));
var v = (e, t2) => {
  var r2 = {};
  for (var s4 in e) xe.call(e, s4) && t2.indexOf(s4) < 0 && (r2[s4] = e[s4]);
  if (e != null && F2) for (var s4 of F2(e)) t2.indexOf(s4) < 0 && be.call(e, s4) && (r2[s4] = e[s4]);
  return r2;
};
function ke(...e) {
  return w(...e);
}
var at = s2();
var N2 = at;
var k = /{([^}]*)}/g;
var ne = /(\d+\s+[\+\-\*\/]\s+\d+)/g;
var ie2 = /var\([^)]+\)/g;
function oe(e) {
  return a(e) ? e.replace(/[A-Z]/g, (t2, r2) => r2 === 0 ? t2 : "." + t2.toLowerCase()).toLowerCase() : e;
}
function Lt(e, t2) {
  C(e) ? e.push(...t2 || []) : i(e) && Object.assign(e, t2);
}
function ve(e) {
  return i(e) && e.hasOwnProperty("$value") && e.hasOwnProperty("$type") ? e.$value : e;
}
function At(e, t2 = "") {
  return ["opacity", "z-index", "line-height", "font-weight", "flex", "flex-grow", "flex-shrink", "order"].some((s4) => t2.endsWith(s4)) ? e : `${e}`.trim().split(" ").map((a3) => z(a3) ? `${a3}px` : a3).join(" ");
}
function dt(e) {
  return e.replaceAll(/ /g, "").replace(/[^\w]/g, "-");
}
function Q(e = "", t2 = "") {
  return dt(`${a(e, false) && a(t2, false) ? `${e}-` : e}${t2}`);
}
function ae2(e = "", t2 = "") {
  return `--${Q(e, t2)}`;
}
function ht(e = "") {
  let t2 = (e.match(/{/g) || []).length, r2 = (e.match(/}/g) || []).length;
  return (t2 + r2) % 2 !== 0;
}
function Y2(e, t2 = "", r2 = "", s4 = [], i2) {
  if (a(e)) {
    let a3 = e.trim();
    if (ht(a3)) return;
    if (G(a3, k)) {
      let n = a3.replaceAll(k, (l2) => {
        let c2 = l2.replace(/{|}/g, "").split(".").filter((m2) => !s4.some((d2) => G(m2, d2)));
        return `var(${ae2(r2, re(c2.join("-")))}${s(i2) ? `, ${i2}` : ""})`;
      });
      return G(n.replace(ie2, "0"), ne) ? `calc(${n})` : n;
    }
    return a3;
  } else if (z(e)) return e;
}
function Dt(e = {}, t2) {
  if (a(t2)) {
    let r2 = t2.trim();
    return G(r2, k) ? r2.replaceAll(k, (s4) => F(e, s4.replace(/{|}/g, ""))) : r2;
  } else if (z(t2)) return t2;
}
function Re(e, t2, r2) {
  a(t2, false) && e.push(`${t2}:${r2};`);
}
function C2(e, t2) {
  return e ? `${e}{${t2}}` : "";
}
function le(e, t2) {
  if (e.indexOf("dt(") === -1) return e;
  function r2(n, l2) {
    let o = [], c2 = 0, m2 = "", d2 = null, u2 = 0;
    for (; c2 <= n.length; ) {
      let g3 = n[c2];
      if ((g3 === '"' || g3 === "'" || g3 === "`") && n[c2 - 1] !== "\\" && (d2 = d2 === g3 ? null : g3), !d2 && (g3 === "(" && u2++, g3 === ")" && u2--, (g3 === "," || c2 === n.length) && u2 === 0)) {
        let f = m2.trim();
        f.startsWith("dt(") ? o.push(le(f, l2)) : o.push(s4(f)), m2 = "", c2++;
        continue;
      }
      g3 !== void 0 && (m2 += g3), c2++;
    }
    return o;
  }
  function s4(n) {
    let l2 = n[0];
    if ((l2 === '"' || l2 === "'" || l2 === "`") && n[n.length - 1] === l2) return n.slice(1, -1);
    let o = Number(n);
    return isNaN(o) ? n : o;
  }
  let i2 = [], a3 = [];
  for (let n = 0; n < e.length; n++) if (e[n] === "d" && e.slice(n, n + 3) === "dt(") a3.push(n), n += 2;
  else if (e[n] === ")" && a3.length > 0) {
    let l2 = a3.pop();
    a3.length === 0 && i2.push([l2, n]);
  }
  if (!i2.length) return e;
  for (let n = i2.length - 1; n >= 0; n--) {
    let [l2, o] = i2[n], c2 = e.slice(l2 + 3, o), m2 = r2(c2, t2), d2 = t2(...m2);
    e = e.slice(0, l2) + d2 + e.slice(o + 1);
  }
  return e;
}
function Te(e) {
  return e.length === 4 ? `#${e[1]}${e[1]}${e[2]}${e[2]}${e[3]}${e[3]}` : e;
}
function Ne(e) {
  let t2 = parseInt(e.substring(1), 16), r2 = t2 >> 16 & 255, s4 = t2 >> 8 & 255, i2 = t2 & 255;
  return { r: r2, g: s4, b: i2 };
}
function gt(e, t2, r2) {
  return `#${e.toString(16).padStart(2, "0")}${t2.toString(16).padStart(2, "0")}${r2.toString(16).padStart(2, "0")}`;
}
var D = (e, t2, r2) => {
  e = Te(e), t2 = Te(t2);
  let a3 = (r2 / 100 * 2 - 1 + 1) / 2, n = 1 - a3, l2 = Ne(e), o = Ne(t2), c2 = Math.round(l2.r * a3 + o.r * n), m2 = Math.round(l2.g * a3 + o.g * n), d2 = Math.round(l2.b * a3 + o.b * n);
  return gt(c2, m2, d2);
};
var ce = (e, t2) => D("#000000", e, t2);
var me = (e, t2) => D("#ffffff", e, t2);
var Ce = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
var ft = (e) => {
  if (G(e, k)) {
    let t2 = e.replace(/{|}/g, "");
    return Ce.reduce((r2, s4) => (r2[s4] = `{${t2}.${s4}}`, r2), {});
  }
  return typeof e == "string" ? Ce.reduce((t2, r2, s4) => (t2[r2] = s4 <= 5 ? me(e, (5 - s4) * 19) : ce(e, (s4 - 5) * 15), t2), {}) : e;
};
var rr = (e) => {
  var a3;
  let t2 = S.getTheme(), r2 = ue(t2, e, void 0, "variable"), s4 = (a3 = r2 == null ? void 0 : r2.match(/--[\w-]+/g)) == null ? void 0 : a3[0], i2 = ue(t2, e, void 0, "value");
  return { name: s4, variable: r2, value: i2 };
};
var E = (...e) => ue(S.getTheme(), ...e);
var ue = (e = {}, t2, r2, s4) => {
  if (t2) {
    let { variable: i2, options: a3 } = S.defaults || {}, { prefix: n, transform: l2 } = (e == null ? void 0 : e.options) || a3 || {}, o = G(t2, k) ? t2 : `{${t2}}`;
    return s4 === "value" || l(s4) && l2 === "strict" ? S.getTokenValue(t2) : Y2(o, void 0, n, [i2.excludedKeyRegex], r2);
  }
  return "";
};
function ar(e, ...t2) {
  if (e instanceof Array) {
    let r2 = e.reduce((s4, i2, a3) => {
      var n;
      return s4 + i2 + ((n = m(t2[a3], { dt: E })) != null ? n : "");
    }, "");
    return le(r2, E);
  }
  return m(e, { dt: E });
}
var w2 = (e = {}) => {
  let { preset: t2, options: r2 } = e;
  return { preset(s4) {
    return t2 = t2 ? H(t2, s4) : s4, this;
  }, options(s4) {
    return r2 = r2 ? h(h({}, r2), s4) : s4, this;
  }, primaryPalette(s4) {
    let { semantic: i2 } = t2 || {};
    return t2 = $2(h({}, t2), { semantic: $2(h({}, i2), { primary: s4 }) }), this;
  }, surfacePalette(s4) {
    var o, c2;
    let { semantic: i2 } = t2 || {}, a3 = s4 && Object.hasOwn(s4, "light") ? s4.light : s4, n = s4 && Object.hasOwn(s4, "dark") ? s4.dark : s4, l2 = { colorScheme: { light: h(h({}, (o = i2 == null ? void 0 : i2.colorScheme) == null ? void 0 : o.light), !!a3 && { surface: a3 }), dark: h(h({}, (c2 = i2 == null ? void 0 : i2.colorScheme) == null ? void 0 : c2.dark), !!n && { surface: n }) } };
    return t2 = $2(h({}, t2), { semantic: h(h({}, i2), l2) }), this;
  }, define({ useDefaultPreset: s4 = false, useDefaultOptions: i2 = false } = {}) {
    return { preset: s4 ? S.getPreset() : t2, options: i2 ? S.getOptions() : r2 };
  }, update({ mergePresets: s4 = true, mergeOptions: i2 = true } = {}) {
    let a3 = { preset: s4 ? H(S.getPreset(), t2) : t2, options: i2 ? h(h({}, S.getOptions()), r2) : r2 };
    return S.setTheme(a3), a3;
  }, use(s4) {
    let i2 = this.define(s4);
    return S.setTheme(i2), i2;
  } };
};
function de(e, t2 = {}) {
  let r2 = S.defaults.variable, { prefix: s4 = r2.prefix, selector: i2 = r2.selector, excludedKeyRegex: a3 = r2.excludedKeyRegex } = t2, n = [], l2 = [], o = [{ node: e, path: s4 }];
  for (; o.length; ) {
    let { node: m2, path: d2 } = o.pop();
    for (let u2 in m2) {
      let g3 = m2[u2], f = ve(g3), p = G(u2, a3) ? Q(d2) : Q(d2, re(u2));
      if (i(f)) o.push({ node: f, path: p });
      else {
        let y = ae2(p), R = Y2(f, p, s4, [a3]);
        Re(l2, y, R);
        let T = p;
        s4 && T.startsWith(s4 + "-") && (T = T.slice(s4.length + 1)), n.push(T.replace(/-/g, "."));
      }
    }
  }
  let c2 = l2.join("");
  return { value: l2, tokens: n, declarations: c2, css: C2(i2, c2) };
}
var b = { regex: { rules: { class: { pattern: /^\.([a-zA-Z][\w-]*)$/, resolve(e) {
  return { type: "class", selector: e, matched: this.pattern.test(e.trim()) };
} }, attr: { pattern: /^\[(.*)\]$/, resolve(e) {
  return { type: "attr", selector: `:root${e},:host${e}`, matched: this.pattern.test(e.trim()) };
} }, media: { pattern: /^@media (.*)$/, resolve(e) {
  return { type: "media", selector: e, matched: this.pattern.test(e.trim()) };
} }, system: { pattern: /^system$/, resolve(e) {
  return { type: "system", selector: "@media (prefers-color-scheme: dark)", matched: this.pattern.test(e.trim()) };
} }, custom: { resolve(e) {
  return { type: "custom", selector: e, matched: true };
} } }, resolve(e) {
  let t2 = Object.keys(this.rules).filter((r2) => r2 !== "custom").map((r2) => this.rules[r2]);
  return [e].flat().map((r2) => {
    var s4;
    return (s4 = t2.map((i2) => i2.resolve(r2)).find((i2) => i2.matched)) != null ? s4 : this.rules.custom.resolve(r2);
  });
} }, _toVariables(e, t2) {
  return de(e, { prefix: t2 == null ? void 0 : t2.prefix });
}, getCommon({ name: e = "", theme: t2 = {}, params: r2, set: s4, defaults: i2 }) {
  var R, T, j, O, M, z2, V;
  let { preset: a3, options: n } = t2, l2, o, c2, m2, d2, u2, g3;
  if (s(a3) && n.transform !== "strict") {
    let { primitive: L, semantic: te, extend: re2 } = a3, f = te || {}, { colorScheme: K2 } = f, A = v(f, ["colorScheme"]), x2 = re2 || {}, { colorScheme: X } = x2, G2 = v(x2, ["colorScheme"]), p = K2 || {}, { dark: U } = p, B = v(p, ["dark"]), y = X || {}, { dark: I } = y, H2 = v(y, ["dark"]), W = s(L) ? this._toVariables({ primitive: L }, n) : {}, q2 = s(A) ? this._toVariables({ semantic: A }, n) : {}, Z = s(B) ? this._toVariables({ light: B }, n) : {}, pe = s(U) ? this._toVariables({ dark: U }, n) : {}, fe = s(G2) ? this._toVariables({ semantic: G2 }, n) : {}, ye = s(H2) ? this._toVariables({ light: H2 }, n) : {}, Se = s(I) ? this._toVariables({ dark: I }, n) : {}, [Me, ze] = [(R = W.declarations) != null ? R : "", W.tokens], [Ke, Xe] = [(T = q2.declarations) != null ? T : "", q2.tokens || []], [Ge, Ue] = [(j = Z.declarations) != null ? j : "", Z.tokens || []], [Be, Ie] = [(O = pe.declarations) != null ? O : "", pe.tokens || []], [He, We] = [(M = fe.declarations) != null ? M : "", fe.tokens || []], [qe, Ze] = [(z2 = ye.declarations) != null ? z2 : "", ye.tokens || []], [Fe, Je] = [(V = Se.declarations) != null ? V : "", Se.tokens || []];
    l2 = this.transformCSS(e, Me, "light", "variable", n, s4, i2), o = ze;
    let Qe = this.transformCSS(e, `${Ke}${Ge}`, "light", "variable", n, s4, i2), Ye = this.transformCSS(e, `${Be}`, "dark", "variable", n, s4, i2);
    c2 = `${Qe}${Ye}`, m2 = [.../* @__PURE__ */ new Set([...Xe, ...Ue, ...Ie])];
    let et = this.transformCSS(e, `${He}${qe}color-scheme:light`, "light", "variable", n, s4, i2), tt = this.transformCSS(e, `${Fe}color-scheme:dark`, "dark", "variable", n, s4, i2);
    d2 = `${et}${tt}`, u2 = [.../* @__PURE__ */ new Set([...We, ...Ze, ...Je])], g3 = m(a3.css, { dt: E });
  }
  return { primitive: { css: l2, tokens: o }, semantic: { css: c2, tokens: m2 }, global: { css: d2, tokens: u2 }, style: g3 };
}, getPreset({ name: e = "", preset: t2 = {}, options: r2, params: s4, set: i2, defaults: a3, selector: n }) {
  var f, x2, p;
  let l2, o, c2;
  if (s(t2) && r2.transform !== "strict") {
    let y = e.replace("-directive", ""), m2 = t2, { colorScheme: R, extend: T, css: j } = m2, O = v(m2, ["colorScheme", "extend", "css"]), d2 = T || {}, { colorScheme: M } = d2, z2 = v(d2, ["colorScheme"]), u2 = R || {}, { dark: V } = u2, L = v(u2, ["dark"]), g3 = M || {}, { dark: te } = g3, re2 = v(g3, ["dark"]), K2 = s(O) ? this._toVariables({ [y]: h(h({}, O), z2) }, r2) : {}, A = s(L) ? this._toVariables({ [y]: h(h({}, L), re2) }, r2) : {}, X = s(V) ? this._toVariables({ [y]: h(h({}, V), te) }, r2) : {}, [G2, U] = [(f = K2.declarations) != null ? f : "", K2.tokens || []], [B, I] = [(x2 = A.declarations) != null ? x2 : "", A.tokens || []], [H2, W] = [(p = X.declarations) != null ? p : "", X.tokens || []], q2 = this.transformCSS(y, `${G2}${B}`, "light", "variable", r2, i2, a3, n), Z = this.transformCSS(y, H2, "dark", "variable", r2, i2, a3, n);
    l2 = `${q2}${Z}`, o = [.../* @__PURE__ */ new Set([...U, ...I, ...W])], c2 = m(j, { dt: E });
  }
  return { css: l2, tokens: o, style: c2 };
}, getPresetC({ name: e = "", theme: t2 = {}, params: r2, set: s4, defaults: i2 }) {
  var o;
  let { preset: a3, options: n } = t2, l2 = (o = a3 == null ? void 0 : a3.components) == null ? void 0 : o[e];
  return this.getPreset({ name: e, preset: l2, options: n, params: r2, set: s4, defaults: i2 });
}, getPresetD({ name: e = "", theme: t2 = {}, params: r2, set: s4, defaults: i2 }) {
  var c2, m2;
  let a3 = e.replace("-directive", ""), { preset: n, options: l2 } = t2, o = ((c2 = n == null ? void 0 : n.components) == null ? void 0 : c2[a3]) || ((m2 = n == null ? void 0 : n.directives) == null ? void 0 : m2[a3]);
  return this.getPreset({ name: a3, preset: o, options: l2, params: r2, set: s4, defaults: i2 });
}, applyDarkColorScheme(e) {
  return !(e.darkModeSelector === "none" || e.darkModeSelector === false);
}, getColorSchemeOption(e, t2) {
  var r2;
  return this.applyDarkColorScheme(e) ? this.regex.resolve(e.darkModeSelector === true ? t2.options.darkModeSelector : (r2 = e.darkModeSelector) != null ? r2 : t2.options.darkModeSelector) : [];
}, getLayerOrder(e, t2 = {}, r2, s4) {
  let { cssLayer: i2 } = t2;
  return i2 ? `@layer ${m(i2.order || i2.name || "primeui", r2)}` : "";
}, getCommonStyleSheet({ name: e = "", theme: t2 = {}, params: r2, props: s4 = {}, set: i2, defaults: a3 }) {
  let n = this.getCommon({ name: e, theme: t2, params: r2, set: i2, defaults: a3 }), l2 = Object.entries(s4).reduce((o, [c2, m2]) => o.push(`${c2}="${m2}"`) && o, []).join(" ");
  return Object.entries(n || {}).reduce((o, [c2, m2]) => {
    if (i(m2) && Object.hasOwn(m2, "css")) {
      let d2 = Y(m2.css), u2 = `${c2}-variables`;
      o.push(`<style type="text/css" data-primevue-style-id="${u2}" ${l2}>${d2}</style>`);
    }
    return o;
  }, []).join("");
}, getStyleSheet({ name: e = "", theme: t2 = {}, params: r2, props: s4 = {}, set: i2, defaults: a3 }) {
  var c2;
  let n = { name: e, theme: t2, params: r2, set: i2, defaults: a3 }, l2 = (c2 = e.includes("-directive") ? this.getPresetD(n) : this.getPresetC(n)) == null ? void 0 : c2.css, o = Object.entries(s4).reduce((m2, [d2, u2]) => m2.push(`${d2}="${u2}"`) && m2, []).join(" ");
  return l2 ? `<style type="text/css" data-primevue-style-id="${e}-variables" ${o}>${Y(l2)}</style>` : "";
}, createTokens(e = {}, t2, r2 = "", s4 = "", i2 = {}) {
  let a3 = function(l2, o = {}, c2 = []) {
    if (c2.includes(this.path)) return console.warn(`Circular reference detected at ${this.path}`), { colorScheme: l2, path: this.path, paths: o, value: void 0 };
    c2.push(this.path), o.name = this.path, o.binding || (o.binding = {});
    let m2 = this.value;
    if (typeof this.value == "string" && k.test(this.value)) {
      let u2 = this.value.trim().replace(k, (g3) => {
        var y;
        let f = g3.slice(1, -1), x2 = this.tokens[f];
        if (!x2) return console.warn(`Token not found for path: ${f}`), "__UNRESOLVED__";
        let p = x2.computed(l2, o, c2);
        return Array.isArray(p) && p.length === 2 ? `light-dark(${p[0].value},${p[1].value})` : (y = p == null ? void 0 : p.value) != null ? y : "__UNRESOLVED__";
      });
      m2 = ne.test(u2.replace(ie2, "0")) ? `calc(${u2})` : u2;
    }
    return l(o.binding) && delete o.binding, c2.pop(), { colorScheme: l2, path: this.path, paths: o, value: m2.includes("__UNRESOLVED__") ? void 0 : m2 };
  }, n = (l2, o, c2) => {
    Object.entries(l2).forEach(([m2, d2]) => {
      let u2 = G(m2, t2.variable.excludedKeyRegex) ? o : o ? `${o}.${oe(m2)}` : oe(m2), g3 = c2 ? `${c2}.${m2}` : m2;
      i(d2) ? n(d2, u2, g3) : (i2[u2] || (i2[u2] = { paths: [], computed: (f, x2 = {}, p = []) => {
        if (i2[u2].paths.length === 1) return i2[u2].paths[0].computed(i2[u2].paths[0].scheme, x2.binding, p);
        if (f && f !== "none") for (let y = 0; y < i2[u2].paths.length; y++) {
          let R = i2[u2].paths[y];
          if (R.scheme === f) return R.computed(f, x2.binding, p);
        }
        return i2[u2].paths.map((y) => y.computed(y.scheme, x2[y.scheme], p));
      } }), i2[u2].paths.push({ path: g3, value: d2, scheme: g3.includes("colorScheme.light") ? "light" : g3.includes("colorScheme.dark") ? "dark" : "none", computed: a3, tokens: i2 }));
    });
  };
  return n(e, r2, s4), i2;
}, getTokenValue(e, t2, r2) {
  var l2;
  let i2 = ((o) => o.split(".").filter((m2) => !G(m2.toLowerCase(), r2.variable.excludedKeyRegex)).join("."))(t2), a3 = t2.includes("colorScheme.light") ? "light" : t2.includes("colorScheme.dark") ? "dark" : void 0, n = [(l2 = e[i2]) == null ? void 0 : l2.computed(a3)].flat().filter((o) => o);
  return n.length === 1 ? n[0].value : n.reduce((o = {}, c2) => {
    let u2 = c2, { colorScheme: m2 } = u2, d2 = v(u2, ["colorScheme"]);
    return o[m2] = d2, o;
  }, void 0);
}, getSelectorRule(e, t2, r2, s4) {
  return r2 === "class" || r2 === "attr" ? C2(s(t2) ? `${e}${t2},${e} ${t2}` : e, s4) : C2(e, C2(t2 != null ? t2 : ":root,:host", s4));
}, transformCSS(e, t2, r2, s4, i2 = {}, a3, n, l2) {
  if (s(t2)) {
    let { cssLayer: o } = i2;
    if (s4 !== "style") {
      let c2 = this.getColorSchemeOption(i2, n);
      t2 = r2 === "dark" ? c2.reduce((m2, { type: d2, selector: u2 }) => (s(u2) && (m2 += u2.includes("[CSS]") ? u2.replace("[CSS]", t2) : this.getSelectorRule(u2, l2, d2, t2)), m2), "") : C2(l2 != null ? l2 : ":root,:host", t2);
    }
    if (o) {
      let c2 = { name: "primeui", order: "primeui" };
      i(o) && (c2.name = m(o.name, { name: e, type: s4 })), s(c2.name) && (t2 = C2(`@layer ${c2.name}`, t2), a3 == null || a3.layerNames(c2.name));
    }
    return t2;
  }
  return "";
} };
var S = { defaults: { variable: { prefix: "p", selector: ":root,:host", excludedKeyRegex: /^(primitive|semantic|components|directives|variables|colorscheme|light|dark|common|root|states|extend|css)$/gi }, options: { prefix: "p", darkModeSelector: "system", cssLayer: false } }, _theme: void 0, _layerNames: /* @__PURE__ */ new Set(), _loadedStyleNames: /* @__PURE__ */ new Set(), _loadingStyles: /* @__PURE__ */ new Set(), _tokens: {}, update(e = {}) {
  let { theme: t2 } = e;
  t2 && (this._theme = $2(h({}, t2), { options: h(h({}, this.defaults.options), t2.options) }), this._tokens = b.createTokens(this.preset, this.defaults), this.clearLoadedStyleNames());
}, get theme() {
  return this._theme;
}, get preset() {
  var e;
  return ((e = this.theme) == null ? void 0 : e.preset) || {};
}, get options() {
  var e;
  return ((e = this.theme) == null ? void 0 : e.options) || {};
}, get tokens() {
  return this._tokens;
}, getTheme() {
  return this.theme;
}, setTheme(e) {
  this.update({ theme: e }), N2.emit("theme:change", e);
}, getPreset() {
  return this.preset;
}, setPreset(e) {
  this._theme = $2(h({}, this.theme), { preset: e }), this._tokens = b.createTokens(e, this.defaults), this.clearLoadedStyleNames(), N2.emit("preset:change", e), N2.emit("theme:change", this.theme);
}, getOptions() {
  return this.options;
}, setOptions(e) {
  this._theme = $2(h({}, this.theme), { options: e }), this.clearLoadedStyleNames(), N2.emit("options:change", e), N2.emit("theme:change", this.theme);
}, getLayerNames() {
  return [...this._layerNames];
}, setLayerNames(e) {
  this._layerNames.add(e);
}, getLoadedStyleNames() {
  return this._loadedStyleNames;
}, isStyleNameLoaded(e) {
  return this._loadedStyleNames.has(e);
}, setLoadedStyleName(e) {
  this._loadedStyleNames.add(e);
}, deleteLoadedStyleName(e) {
  this._loadedStyleNames.delete(e);
}, clearLoadedStyleNames() {
  this._loadedStyleNames.clear();
}, getTokenValue(e) {
  return b.getTokenValue(this.tokens, e, this.defaults);
}, getCommon(e = "", t2) {
  return b.getCommon({ name: e, theme: this.theme, params: t2, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } });
}, getComponent(e = "", t2) {
  let r2 = { name: e, theme: this.theme, params: t2, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } };
  return b.getPresetC(r2);
}, getDirective(e = "", t2) {
  let r2 = { name: e, theme: this.theme, params: t2, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } };
  return b.getPresetD(r2);
}, getCustomPreset(e = "", t2, r2, s4) {
  let i2 = { name: e, preset: t2, options: this.options, selector: r2, params: s4, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } };
  return b.getPreset(i2);
}, getLayerOrderCSS(e = "") {
  return b.getLayerOrder(e, this.options, { names: this.getLayerNames() }, this.defaults);
}, transformCSS(e = "", t2, r2 = "style", s4) {
  return b.transformCSS(e, t2, s4, r2, this.options, { layerNames: this.setLayerNames.bind(this) }, this.defaults);
}, getCommonStyleSheet(e = "", t2, r2 = {}) {
  return b.getCommonStyleSheet({ name: e, theme: this.theme, params: t2, props: r2, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } });
}, getStyleSheet(e, t2, r2 = {}) {
  return b.getStyleSheet({ name: e, theme: this.theme, params: t2, props: r2, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } });
}, onStyleMounted(e) {
  this._loadingStyles.add(e);
}, onStyleUpdated(e) {
  this._loadingStyles.add(e);
}, onStyleLoaded(e, { name: t2 }) {
  this._loadingStyles.size && (this._loadingStyles.delete(t2), N2.emit(`theme:${t2}:load`, e), !this._loadingStyles.size && N2.emit("theme:load"));
} };
function Ve(...e) {
  let t2 = w(S.getPreset(), ...e);
  return S.setPreset(t2), t2;
}
function Le(e) {
  return w2().primaryPalette(e).update().preset;
}
function Ae(e) {
  return w2().surfacePalette(e).update().preset;
}
function De(...e) {
  let t2 = w(...e);
  return S.setPreset(t2), t2;
}
function je(e) {
  return w2(e).update({ mergePresets: false });
}
var ge = class {
  constructor({ attrs: t2 } = {}) {
    this._styles = /* @__PURE__ */ new Map(), this._attrs = t2 || {};
  }
  get(t2) {
    return this._styles.get(t2);
  }
  has(t2) {
    return this._styles.has(t2);
  }
  delete(t2) {
    this._styles.delete(t2);
  }
  clear() {
    this._styles.clear();
  }
  add(t2, r2) {
    if (s(r2)) {
      let s4 = { name: t2, css: r2, attrs: this._attrs, markup: q(r2, this._attrs) };
      this._styles.set(t2, $2(h({}, s4), { element: this.createStyleElement(s4) }));
    }
  }
  update() {
  }
  getStyles() {
    return this._styles;
  }
  getAllCSS() {
    return [...this._styles.values()].map((t2) => t2.css).filter(String);
  }
  getAllMarkup() {
    return [...this._styles.values()].map((t2) => t2.markup).filter(String);
  }
  getAllElements() {
    return [...this._styles.values()].map((t2) => t2.element);
  }
  createStyleElement(t2 = {}) {
  }
};
var Nt = ge;

// node_modules/@primeuix/themes/dist/index.mjs
var t = (...t2) => ke(...t2);
var a2 = (...t2) => Ve(...t2);
var r = (t2) => Le(t2);
var s3 = (t2) => Ae(t2);
var u = (...t2) => De(...t2);
var P = (theme) => je(theme);
export {
  rr as $dt,
  w2 as $t,
  ne as CALC_REGEX,
  k as EXPR_REGEX,
  Nt as StyleSheet,
  S as Theme,
  N2 as ThemeService,
  b as ThemeUtils,
  ie2 as VAR_REGEX,
  ar as css,
  t as definePreset,
  E as dt,
  ue as dtwt,
  le as evaluateDtExpressions,
  Dt as getComputedValue,
  C2 as getRule,
  ae2 as getVariableName,
  Y2 as getVariableValue,
  ht as hasOddBraces,
  Lt as merge,
  D as mix,
  ft as palette,
  Re as setProperty,
  ce as shade,
  me as tint,
  dt as toNormalizePrefix,
  Q as toNormalizeVariable,
  oe as toTokenKey,
  At as toUnit,
  ve as toValue,
  de as toVariables,
  a2 as updatePreset,
  r as updatePrimaryPalette,
  s3 as updateSurfacePalette,
  u as usePreset,
  P as useTheme
};
//# sourceMappingURL=@primeuix_themes.js.map
