"use strict";
(() => {
    var Be = !1, Ve = !1, X = [];
    function Rt(e) { Gr(e); }
    function Gr(e) { X.includes(e) || X.push(e), Yr(); }
    function Yr() { !Ve && !Be && (Be = !0, queueMicrotask(Jr)); }
    function Jr() { Be = !1, Ve = !0; for (let e = 0; e < X.length; e++)
        X[e](); X.length = 0, Ve = !1; }
    var O, k, G, He, qe = !0;
    function Mt(e) { qe = !1, e(), qe = !0; }
    function Nt(e) { O = e.reactive, G = e.release, k = t => e.effect(t, { scheduler: r => { qe ? Rt(r) : r(); } }), He = e.raw; }
    function Ue(e) { k = e; }
    function kt(e) { let t = () => { }; return [n => { let i = k(n); e._x_effects || (e._x_effects = new Set, e._x_runEffects = () => { e._x_effects.forEach(o => o()); }), e._x_effects.add(i), t = () => { i !== void 0 && (e._x_effects.delete(i), G(i)); }; }, () => { t(); }]; }
    var It = [], Dt = [], Pt = [];
    function $t(e) { Pt.push(e); }
    function Lt(e) { Dt.push(e); }
    function Ft(e) { It.push(e); }
    function jt(e, t, r) { e._x_attributeCleanups || (e._x_attributeCleanups = {}), e._x_attributeCleanups[t] || (e._x_attributeCleanups[t] = []), e._x_attributeCleanups[t].push(r); }
    function We(e, t) { !e._x_attributeCleanups || Object.entries(e._x_attributeCleanups).forEach(([r, n]) => { (t === void 0 || t.includes(r)) && (n.forEach(i => i()), delete e._x_attributeCleanups[r]); }); }
    var Ye = new MutationObserver(Ge), Je = !1;
    function Ze() { Ye.observe(document, { subtree: !0, childList: !0, attributes: !0, attributeOldValue: !0 }), Je = !0; }
    function Qr() { Zr(), Ye.disconnect(), Je = !1; }
    var ee = [], Qe = !1;
    function Zr() { ee = ee.concat(Ye.takeRecords()), ee.length && !Qe && (Qe = !0, queueMicrotask(() => { Xr(), Qe = !1; })); }
    function Xr() { Ge(ee), ee.length = 0; }
    function m(e) { if (!Je)
        return e(); Qr(); let t = e(); return Ze(), t; }
    var Xe = !1, me = [];
    function Kt() { Xe = !0; }
    function zt() { Xe = !1, Ge(me), me = []; }
    function Ge(e) { if (Xe) {
        me = me.concat(e);
        return;
    } let t = [], r = [], n = new Map, i = new Map; for (let o = 0; o < e.length; o++)
        if (!e[o].target._x_ignoreMutationObserver && (e[o].type === "childList" && (e[o].addedNodes.forEach(s => s.nodeType === 1 && t.push(s)), e[o].removedNodes.forEach(s => s.nodeType === 1 && r.push(s))), e[o].type === "attributes")) {
            let s = e[o].target, a = e[o].attributeName, c = e[o].oldValue, l = () => { n.has(s) || n.set(s, []), n.get(s).push({ name: a, value: s.getAttribute(a) }); }, u = () => { i.has(s) || i.set(s, []), i.get(s).push(a); };
            s.hasAttribute(a) && c === null ? l() : s.hasAttribute(a) ? (u(), l()) : u();
        } i.forEach((o, s) => { We(s, o); }), n.forEach((o, s) => { It.forEach(a => a(s, o)); }); for (let o of r)
        t.includes(o) || Dt.forEach(s => s(o)); t.forEach(o => { o._x_ignoreSelf = !0, o._x_ignore = !0; }); for (let o of t)
        r.includes(o) || !o.isConnected || (delete o._x_ignoreSelf, delete o._x_ignore, Pt.forEach(s => s(o)), o._x_ignore = !0, o._x_ignoreSelf = !0); t.forEach(o => { delete o._x_ignoreSelf, delete o._x_ignore; }), t = null, r = null, n = null, i = null; }
    function C(e, t, r) { return e._x_dataStack = [t, ...I(r || e)], () => { e._x_dataStack = e._x_dataStack.filter(n => n !== t); }; }
    function et(e, t) { let r = e._x_dataStack[0]; Object.entries(t).forEach(([n, i]) => { r[n] = i; }); }
    function I(e) { return e._x_dataStack ? e._x_dataStack : typeof ShadowRoot == "function" && e instanceof ShadowRoot ? I(e.host) : e.parentNode ? I(e.parentNode) : []; }
    function D(e) { let t = new Proxy({}, { ownKeys: () => Array.from(new Set(e.flatMap(r => Object.keys(r)))), has: (r, n) => e.some(i => i.hasOwnProperty(n)), get: (r, n) => (e.find(i => { if (i.hasOwnProperty(n)) {
            let o = Object.getOwnPropertyDescriptor(i, n);
            if (o.get && o.get._x_alreadyBound || o.set && o.set._x_alreadyBound)
                return !0;
            if ((o.get || o.set) && o.enumerable) {
                let s = o.get, a = o.set, c = o;
                s = s && s.bind(t), a = a && a.bind(t), s && (s._x_alreadyBound = !0), a && (a._x_alreadyBound = !0), Object.defineProperty(i, n, Object.assign(Object.assign({}, c), { get: s, set: a }));
            }
            return !0;
        } return !1; }) || {})[n], set: (r, n, i) => { let o = e.find(s => s.hasOwnProperty(n)); return o ? o[n] = i : e[e.length - 1][n] = i, !0; } }); return t; }
    function he(e) { let t = n => typeof n == "object" && !Array.isArray(n) && n !== null, r = (n, i = "") => { Object.entries(Object.getOwnPropertyDescriptors(n)).forEach(([o, { value: s, enumerable: a }]) => { if (a === !1 || s === void 0)
        return; let c = i === "" ? o : `${i}.${o}`; typeof s == "object" && s !== null && s._x_interceptor ? n[o] = s.initialize(e, c, o) : t(s) && s !== n && !(s instanceof Element) && r(s, c); }); }; return r(e); }
    function _e(e, t = () => { }) { let r = { initialValue: void 0, _x_interceptor: !0, initialize(n, i, o) { return e(this.initialValue, () => en(n, i), s => tt(n, i, s), i, o); } }; return t(r), n => { if (typeof n == "object" && n !== null && n._x_interceptor) {
        let i = r.initialize.bind(r);
        r.initialize = (o, s, a) => { let c = n.initialize(o, s, a); return r.initialValue = c, i(o, s, a); };
    }
    else
        r.initialValue = n; return r; }; }
    function en(e, t) { return t.split(".").reduce((r, n) => r[n], e); }
    function tt(e, t, r) { if (typeof t == "string" && (t = t.split(".")), t.length === 1)
        e[t[0]] = r;
    else {
        if (t.length === 0)
            throw error;
        return e[t[0]] || (e[t[0]] = {}), tt(e[t[0]], t.slice(1), r);
    } }
    var Bt = {};
    function y(e, t) { Bt[e] = t; }
    function te(e, t) { return Object.entries(Bt).forEach(([r, n]) => { Object.defineProperty(e, `$${r}`, { get() { return n(t, { Alpine: R, interceptor: _e }); }, enumerable: !1 }); }), e; }
    function Vt(e, t, r, ...n) { try {
        return r(...n);
    }
    catch (i) {
        Y(i, e, t);
    } }
    function Y(e, t, r = void 0) {
        Object.assign(e, { el: t, expression: r }), console.warn(`Alpine Expression Error: ${e.message}

${r ? 'Expression: "' + r + `"

` : ""}`, t), setTimeout(() => { throw e; }, 0);
    }
    function w(e, t, r = {}) { let n; return h(e, t)(i => n = i, r), n; }
    function h(...e) { return Ht(...e); }
    var Ht = rt;
    function qt(e) { Ht = e; }
    function rt(e, t) { let r = {}; te(r, e); let n = [r, ...I(e)]; if (typeof t == "function")
        return tn(n, t); let i = rn(n, t, e); return Vt.bind(null, e, t, i); }
    function tn(e, t) { return (r = () => { }, { scope: n = {}, params: i = [] } = {}) => { let o = t.apply(D([n, ...e]), i); ge(r, o); }; }
    var nt = {};
    function nn(e, t) { if (nt[e])
        return nt[e]; let r = Object.getPrototypeOf(async function () { }).constructor, n = /^[\n\s]*if.*\(.*\)/.test(e) || /^(let|const)\s/.test(e) ? `(() => { ${e} })()` : e, o = (() => { try {
        return new r(["__self", "scope"], `with (scope) { __self.result = ${n} }; __self.finished = true; return __self.result;`);
    }
    catch (s) {
        return Y(s, t, e), Promise.resolve();
    } })(); return nt[e] = o, o; }
    function rn(e, t, r) { let n = nn(t, r); return (i = () => { }, { scope: o = {}, params: s = [] } = {}) => { n.result = void 0, n.finished = !1; let a = D([o, ...e]); if (typeof n == "function") {
        let c = n(n, a).catch(l => Y(l, r, t));
        n.finished ? (ge(i, n.result, a, s, r), n.result = void 0) : c.then(l => { ge(i, l, a, s, r); }).catch(l => Y(l, r, t)).finally(() => n.result = void 0);
    } }; }
    function ge(e, t, r, n, i) { if (typeof t == "function") {
        let o = t.apply(r, n);
        o instanceof Promise ? o.then(s => ge(e, s, r, n)).catch(s => Y(s, i, t)) : e(o);
    }
    else
        e(t); }
    var it = "x-";
    function E(e = "") { return it + e; }
    function Ut(e) { it = e; }
    var Wt = {};
    function d(e, t) { Wt[e] = t; }
    function re(e, t, r) { let n = {}; return Array.from(t).map(Gt((o, s) => n[o] = s)).filter(Yt).map(sn(n, r)).sort(an).map(o => on(e, o)); }
    function Jt(e) { return Array.from(e).map(Gt()).filter(t => !Yt(t)); }
    var ot = !1, ne = new Map, Zt = Symbol();
    function Qt(e) { ot = !0; let t = Symbol(); Zt = t, ne.set(t, []); let r = () => { for (; ne.get(t).length;)
        ne.get(t).shift()(); ne.delete(t); }, n = () => { ot = !1, r(); }; e(r), n(); }
    function on(e, t) { let r = () => { }, n = Wt[t.type] || r, i = [], o = p => i.push(p), [s, a] = kt(e); i.push(a); let c = { Alpine: R, effect: s, cleanup: o, evaluateLater: h.bind(h, e), evaluate: w.bind(w, e) }, l = () => i.forEach(p => p()); jt(e, t.original, l); let u = () => { e._x_ignore || e._x_ignoreSelf || (n.inline && n.inline(e, t, c), n = n.bind(n, e, t, c), ot ? ne.get(Zt).push(n) : n()); }; return u.runCleanups = l, u; }
    var xe = (e, t) => ({ name: r, value: n }) => (r.startsWith(e) && (r = r.replace(e, t)), { name: r, value: n }), ye = e => e;
    function Gt(e = () => { }) { return ({ name: t, value: r }) => { let { name: n, value: i } = Xt.reduce((o, s) => s(o), { name: t, value: r }); return n !== t && e(n, t), { name: n, value: i }; }; }
    var Xt = [];
    function J(e) { Xt.push(e); }
    function Yt({ name: e }) { return er().test(e); }
    var er = () => new RegExp(`^${it}([^:^.]+)\\b`);
    function sn(e, t) { return ({ name: r, value: n }) => { let i = r.match(er()), o = r.match(/:([a-zA-Z0-9\-:]+)/), s = r.match(/\.[^.\]]+(?=[^\]]*$)/g) || [], a = t || e[r] || r; return { type: i ? i[1] : null, value: o ? o[1] : null, modifiers: s.map(c => c.replace(".", "")), expression: n, original: a }; }; }
    var st = "DEFAULT", be = ["ignore", "ref", "data", "id", "bind", "init", "for", "model", "transition", "show", "if", st, "teleport", "element"];
    function an(e, t) { let r = be.indexOf(e.type) === -1 ? st : e.type, n = be.indexOf(t.type) === -1 ? st : t.type; return be.indexOf(r) - be.indexOf(n); }
    function K(e, t, r = {}) { e.dispatchEvent(new CustomEvent(t, { detail: r, bubbles: !0, composed: !0, cancelable: !0 })); }
    var at = [], ct = !1;
    function we(e) { at.push(e), queueMicrotask(() => { ct || setTimeout(() => { ve(); }); }); }
    function ve() { for (ct = !1; at.length;)
        at.shift()(); }
    function tr() { ct = !0; }
    function P(e, t) { if (typeof ShadowRoot == "function" && e instanceof ShadowRoot) {
        Array.from(e.children).forEach(i => P(i, t));
        return;
    } let r = !1; if (t(e, () => r = !0), r)
        return; let n = e.firstElementChild; for (; n;)
        P(n, t, !1), n = n.nextElementSibling; }
    function z(e, ...t) { console.warn(`Alpine Warning: ${e}`, ...t); }
    function nr() { document.body || z("Unable to initialize. Trying to load Alpine before `<body>` is available. Did you forget to add `defer` in Alpine's `<script>` tag?"), K(document, "alpine:init"), K(document, "alpine:initializing"), Ze(), $t(t => S(t, P)), Lt(t => cn(t)), Ft((t, r) => { re(t, r).forEach(n => n()); }); let e = t => !B(t.parentElement, !0); Array.from(document.querySelectorAll(rr())).filter(e).forEach(t => { S(t); }), K(document, "alpine:initialized"); }
    var lt = [], ir = [];
    function or() { return lt.map(e => e()); }
    function rr() { return lt.concat(ir).map(e => e()); }
    function Ee(e) { lt.push(e); }
    function Se(e) { ir.push(e); }
    function B(e, t = !1) { return Ae(e, r => { if ((t ? rr() : or()).some(i => r.matches(i)))
        return !0; }); }
    function Ae(e, t) { if (!!e) {
        if (t(e))
            return e;
        if (e._x_teleportBack && (e = e._x_teleportBack), !!e.parentElement)
            return Ae(e.parentElement, t);
    } }
    function sr(e) { return or().some(t => e.matches(t)); }
    function S(e, t = P) { Qt(() => { t(e, (r, n) => { re(r, r.attributes).forEach(i => i()), r._x_ignore && n(); }); }); }
    function cn(e) { P(e, t => We(t)); }
    function ie(e, t) { return Array.isArray(t) ? ar(e, t.join(" ")) : typeof t == "object" && t !== null ? ln(e, t) : typeof t == "function" ? ie(e, t()) : ar(e, t); }
    function ar(e, t) { let r = o => o.split(" ").filter(Boolean), n = o => o.split(" ").filter(s => !e.classList.contains(s)).filter(Boolean), i = o => (e.classList.add(...o), () => { e.classList.remove(...o); }); return t = t === !0 ? t = "" : t || "", i(n(t)); }
    function ln(e, t) { let r = a => a.split(" ").filter(Boolean), n = Object.entries(t).flatMap(([a, c]) => c ? r(a) : !1).filter(Boolean), i = Object.entries(t).flatMap(([a, c]) => c ? !1 : r(a)).filter(Boolean), o = [], s = []; return i.forEach(a => { e.classList.contains(a) && (e.classList.remove(a), s.push(a)); }), n.forEach(a => { e.classList.contains(a) || (e.classList.add(a), o.push(a)); }), () => { s.forEach(a => e.classList.add(a)), o.forEach(a => e.classList.remove(a)); }; }
    function V(e, t) { return typeof t == "object" && t !== null ? un(e, t) : fn(e, t); }
    function un(e, t) { let r = {}; return Object.entries(t).forEach(([n, i]) => { r[n] = e.style[n], e.style.setProperty(dn(n), i); }), setTimeout(() => { e.style.length === 0 && e.removeAttribute("style"); }), () => { V(e, r); }; }
    function fn(e, t) { let r = e.getAttribute("style", t); return e.setAttribute("style", t), () => { e.setAttribute("style", r || ""); }; }
    function dn(e) { return e.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(); }
    function oe(e, t = () => { }) { let r = !1; return function () { r ? t.apply(this, arguments) : (r = !0, e.apply(this, arguments)); }; }
    d("transition", (e, { value: t, modifiers: r, expression: n }, { evaluate: i }) => { typeof n == "function" && (n = i(n)), n ? pn(e, n, t) : mn(e, r, t); });
    function pn(e, t, r) { cr(e, ie, ""), { enter: i => { e._x_transition.enter.during = i; }, "enter-start": i => { e._x_transition.enter.start = i; }, "enter-end": i => { e._x_transition.enter.end = i; }, leave: i => { e._x_transition.leave.during = i; }, "leave-start": i => { e._x_transition.leave.start = i; }, "leave-end": i => { e._x_transition.leave.end = i; } }[r](t); }
    function mn(e, t, r) { cr(e, V); let n = !t.includes("in") && !t.includes("out") && !r, i = n || t.includes("in") || ["enter"].includes(r), o = n || t.includes("out") || ["leave"].includes(r); t.includes("in") && !n && (t = t.filter((g, b) => b < t.indexOf("out"))), t.includes("out") && !n && (t = t.filter((g, b) => b > t.indexOf("out"))); let s = !t.includes("opacity") && !t.includes("scale"), a = s || t.includes("opacity"), c = s || t.includes("scale"), l = a ? 0 : 1, u = c ? se(t, "scale", 95) / 100 : 1, p = se(t, "delay", 0), x = se(t, "origin", "center"), N = "opacity, transform", U = se(t, "duration", 150) / 1e3, de = se(t, "duration", 75) / 1e3, f = "cubic-bezier(0.4, 0.0, 0.2, 1)"; i && (e._x_transition.enter.during = { transformOrigin: x, transitionDelay: p, transitionProperty: N, transitionDuration: `${U}s`, transitionTimingFunction: f }, e._x_transition.enter.start = { opacity: l, transform: `scale(${u})` }, e._x_transition.enter.end = { opacity: 1, transform: "scale(1)" }), o && (e._x_transition.leave.during = { transformOrigin: x, transitionDelay: p, transitionProperty: N, transitionDuration: `${de}s`, transitionTimingFunction: f }, e._x_transition.leave.start = { opacity: 1, transform: "scale(1)" }, e._x_transition.leave.end = { opacity: l, transform: `scale(${u})` }); }
    function cr(e, t, r = {}) { e._x_transition || (e._x_transition = { enter: { during: r, start: r, end: r }, leave: { during: r, start: r, end: r }, in(n = () => { }, i = () => { }) { Oe(e, t, { during: this.enter.during, start: this.enter.start, end: this.enter.end }, n, i); }, out(n = () => { }, i = () => { }) { Oe(e, t, { during: this.leave.during, start: this.leave.start, end: this.leave.end }, n, i); } }); }
    window.Element.prototype._x_toggleAndCascadeWithTransitions = function (e, t, r, n) { let i = () => { document.visibilityState === "visible" ? requestAnimationFrame(r) : setTimeout(r); }; if (t) {
        e._x_transition && (e._x_transition.enter || e._x_transition.leave) ? e._x_transition.enter && (Object.entries(e._x_transition.enter.during).length || Object.entries(e._x_transition.enter.start).length || Object.entries(e._x_transition.enter.end).length) ? e._x_transition.in(r) : i() : e._x_transition ? e._x_transition.in(r) : i();
        return;
    } e._x_hidePromise = e._x_transition ? new Promise((o, s) => { e._x_transition.out(() => { }, () => o(n)), e._x_transitioning.beforeCancel(() => s({ isFromCancelledTransition: !0 })); }) : Promise.resolve(n), queueMicrotask(() => { let o = lr(e); o ? (o._x_hideChildren || (o._x_hideChildren = []), o._x_hideChildren.push(e)) : queueMicrotask(() => { let s = a => { let c = Promise.all([a._x_hidePromise, ...(a._x_hideChildren || []).map(s)]).then(([l]) => l()); return delete a._x_hidePromise, delete a._x_hideChildren, c; }; s(e).catch(a => { if (!a.isFromCancelledTransition)
        throw a; }); }); }); };
    function lr(e) { let t = e.parentNode; if (!!t)
        return t._x_hidePromise ? t : lr(t); }
    function Oe(e, t, { during: r, start: n, end: i } = {}, o = () => { }, s = () => { }) { if (e._x_transitioning && e._x_transitioning.cancel(), Object.keys(r).length === 0 && Object.keys(n).length === 0 && Object.keys(i).length === 0) {
        o(), s();
        return;
    } let a, c, l; hn(e, { start() { a = t(e, n); }, during() { c = t(e, r); }, before: o, end() { a(), l = t(e, i); }, after: s, cleanup() { c(), l(); } }); }
    function hn(e, t) { let r, n, i, o = oe(() => { m(() => { r = !0, n || t.before(), i || (t.end(), ve()), t.after(), e.isConnected && t.cleanup(), delete e._x_transitioning; }); }); e._x_transitioning = { beforeCancels: [], beforeCancel(s) { this.beforeCancels.push(s); }, cancel: oe(function () { for (; this.beforeCancels.length;)
            this.beforeCancels.shift()(); o(); }), finish: o }, m(() => { t.start(), t.during(); }), tr(), requestAnimationFrame(() => { if (r)
        return; let s = Number(getComputedStyle(e).transitionDuration.replace(/,.*/, "").replace("s", "")) * 1e3, a = Number(getComputedStyle(e).transitionDelay.replace(/,.*/, "").replace("s", "")) * 1e3; s === 0 && (s = Number(getComputedStyle(e).animationDuration.replace("s", "")) * 1e3), m(() => { t.before(); }), n = !0, requestAnimationFrame(() => { r || (m(() => { t.end(); }), ve(), setTimeout(e._x_transitioning.finish, s + a), i = !0); }); }); }
    function se(e, t, r) { if (e.indexOf(t) === -1)
        return r; let n = e[e.indexOf(t) + 1]; if (!n || t === "scale" && isNaN(n))
        return r; if (t === "duration") {
        let i = n.match(/([0-9]+)ms/);
        if (i)
            return i[1];
    } return t === "origin" && ["top", "right", "left", "center", "bottom"].includes(e[e.indexOf(t) + 2]) ? [n, e[e.indexOf(t) + 2]].join(" ") : n; }
    var ut = !1;
    function $(e, t = () => { }) { return (...r) => ut ? t(...r) : e(...r); }
    function ur(e, t) { t._x_dataStack || (t._x_dataStack = e._x_dataStack), ut = !0, gn(() => { _n(t); }), ut = !1; }
    function _n(e) { let t = !1; S(e, (n, i) => { P(n, (o, s) => { if (t && sr(o))
        return s(); t = !0, i(o, s); }); }); }
    function gn(e) { let t = k; Ue((r, n) => { let i = t(r); return G(i), () => { }; }), e(), Ue(t); }
    function Te(e, t) { var r; return function () { var n = this, i = arguments, o = function () { r = null, e.apply(n, i); }; clearTimeout(r), r = setTimeout(o, t); }; }
    function Ce(e, t) { let r; return function () { let n = this, i = arguments; r || (e.apply(n, i), r = !0, setTimeout(() => r = !1, t)); }; }
    function fr(e) { e(R); }
    var H = {}, dr = !1;
    function pr(e, t) { if (dr || (H = O(H), dr = !0), t === void 0)
        return H[e]; H[e] = t, typeof t == "object" && t !== null && t.hasOwnProperty("init") && typeof t.init == "function" && H[e].init(), he(H[e]); }
    function mr() { return H; }
    var hr = {};
    function _r(e, t) { hr[e] = t; }
    function gr(e, t) { return Object.entries(hr).forEach(([r, n]) => { Object.defineProperty(e, r, { get() { return (...i) => n.bind(t)(...i); }, enumerable: !1 }); }), e; }
    var xn = { get reactive() { return O; }, get release() { return G; }, get effect() { return k; }, get raw() { return He; }, version: "3.7.1", flushAndStopDeferringMutations: zt, disableEffectScheduling: Mt, setReactivityEngine: Nt, closestDataStack: I, skipDuringClone: $, addRootSelector: Ee, addInitSelector: Se, addScopeToNode: C, deferMutations: Kt, mapAttributes: J, evaluateLater: h, setEvaluator: qt, mergeProxies: D, closestRoot: B, interceptor: _e, transition: Oe, setStyles: V, mutateDom: m, directive: d, throttle: Ce, debounce: Te, evaluate: w, initTree: S, nextTick: we, prefixed: E, prefix: Ut, plugin: fr, magic: y, store: pr, start: nr, clone: ur, data: _r }, R = xn;
    function ft(e, t) { let r = Object.create(null), n = e.split(","); for (let i = 0; i < n.length; i++)
        r[n[i]] = !0; return t ? i => !!r[i.toLowerCase()] : i => !!r[i]; }
    var $o = { [1]: "TEXT", [2]: "CLASS", [4]: "STYLE", [8]: "PROPS", [16]: "FULL_PROPS", [32]: "HYDRATE_EVENTS", [64]: "STABLE_FRAGMENT", [128]: "KEYED_FRAGMENT", [256]: "UNKEYED_FRAGMENT", [512]: "NEED_PATCH", [1024]: "DYNAMIC_SLOTS", [2048]: "DEV_ROOT_FRAGMENT", [-1]: "HOISTED", [-2]: "BAIL" }, Lo = { [1]: "STABLE", [2]: "DYNAMIC", [3]: "FORWARDED" };
    var yn = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly";
    var Fo = ft(yn + ",async,autofocus,autoplay,controls,default,defer,disabled,hidden,loop,open,required,reversed,scoped,seamless,checked,muted,multiple,selected");
    var xr = Object.freeze({}), jo = Object.freeze([]);
    var dt = Object.assign;
    var bn = Object.prototype.hasOwnProperty, ae = (e, t) => bn.call(e, t), L = Array.isArray, Z = e => yr(e) === "[object Map]";
    var vn = e => typeof e == "string", Re = e => typeof e == "symbol", ce = e => e !== null && typeof e == "object";
    var wn = Object.prototype.toString, yr = e => wn.call(e), pt = e => yr(e).slice(8, -1);
    var Me = e => vn(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e;
    var Ne = e => { let t = Object.create(null); return r => t[r] || (t[r] = e(r)); }, En = /-(\w)/g, Ko = Ne(e => e.replace(En, (t, r) => r ? r.toUpperCase() : "")), Sn = /\B([A-Z])/g, zo = Ne(e => e.replace(Sn, "-$1").toLowerCase()), mt = Ne(e => e.charAt(0).toUpperCase() + e.slice(1)), Bo = Ne(e => e ? `on${mt(e)}` : ""), ht = (e, t) => e !== t && (e === e || t === t);
    var _t = new WeakMap, le = [], M, q = Symbol("iterate"), gt = Symbol("Map key iterate");
    function An(e) { return e && e._isEffect === !0; }
    function br(e, t = xr) { An(e) && (e = e.raw); let r = On(e, t); return t.lazy || r(), r; }
    function wr(e) { e.active && (vr(e), e.options.onStop && e.options.onStop(), e.active = !1); }
    var Tn = 0;
    function On(e, t) { let r = function () { if (!r.active)
        return e(); if (!le.includes(r)) {
        vr(r);
        try {
            return Cn(), le.push(r), M = r, e();
        }
        finally {
            le.pop(), Er(), M = le[le.length - 1];
        }
    } }; return r.id = Tn++, r.allowRecurse = !!t.allowRecurse, r._isEffect = !0, r.active = !0, r.raw = e, r.deps = [], r.options = t, r; }
    function vr(e) { let { deps: t } = e; if (t.length) {
        for (let r = 0; r < t.length; r++)
            t[r].delete(e);
        t.length = 0;
    } }
    var Q = !0, xt = [];
    function Rn() { xt.push(Q), Q = !1; }
    function Cn() { xt.push(Q), Q = !0; }
    function Er() { let e = xt.pop(); Q = e === void 0 ? !0 : e; }
    function T(e, t, r) { if (!Q || M === void 0)
        return; let n = _t.get(e); n || _t.set(e, n = new Map); let i = n.get(r); i || n.set(r, i = new Set), i.has(M) || (i.add(M), M.deps.push(i), M.options.onTrack && M.options.onTrack({ effect: M, target: e, type: t, key: r })); }
    function F(e, t, r, n, i, o) { let s = _t.get(e); if (!s)
        return; let a = new Set, c = u => { u && u.forEach(p => { (p !== M || p.allowRecurse) && a.add(p); }); }; if (t === "clear")
        s.forEach(c);
    else if (r === "length" && L(e))
        s.forEach((u, p) => { (p === "length" || p >= n) && c(u); });
    else
        switch (r !== void 0 && c(s.get(r)), t) {
            case "add":
                L(e) ? Me(r) && c(s.get("length")) : (c(s.get(q)), Z(e) && c(s.get(gt)));
                break;
            case "delete":
                L(e) || (c(s.get(q)), Z(e) && c(s.get(gt)));
                break;
            case "set":
                Z(e) && c(s.get(q));
                break;
        } let l = u => { u.options.onTrigger && u.options.onTrigger({ effect: u, target: e, key: r, type: t, newValue: n, oldValue: i, oldTarget: o }), u.options.scheduler ? u.options.scheduler(u) : u(); }; a.forEach(l); }
    var Mn = ft("__proto__,__v_isRef,__isVue"), Sr = new Set(Object.getOwnPropertyNames(Symbol).map(e => Symbol[e]).filter(Re)), Nn = ke(), kn = ke(!1, !0), In = ke(!0), Dn = ke(!0, !0), Ie = {};
    ["includes", "indexOf", "lastIndexOf"].forEach(e => { let t = Array.prototype[e]; Ie[e] = function (...r) { let n = _(this); for (let o = 0, s = this.length; o < s; o++)
        T(n, "get", o + ""); let i = t.apply(n, r); return i === -1 || i === !1 ? t.apply(n, r.map(_)) : i; }; });
    ["push", "pop", "shift", "unshift", "splice"].forEach(e => { let t = Array.prototype[e]; Ie[e] = function (...r) { Rn(); let n = t.apply(this, r); return Er(), n; }; });
    function ke(e = !1, t = !1) { return function (n, i, o) { if (i === "__v_isReactive")
        return !e; if (i === "__v_isReadonly")
        return e; if (i === "__v_raw" && o === (e ? t ? $n : Or : t ? Pn : Ar).get(n))
        return n; let s = L(n); if (!e && s && ae(Ie, i))
        return Reflect.get(Ie, i, o); let a = Reflect.get(n, i, o); return (Re(i) ? Sr.has(i) : Mn(i)) || (e || T(n, "get", i), t) ? a : yt(a) ? !s || !Me(i) ? a.value : a : ce(a) ? e ? Tr(a) : De(a) : a; }; }
    var Ln = Cr(), Fn = Cr(!0);
    function Cr(e = !1) { return function (r, n, i, o) { let s = r[n]; if (!e && (i = _(i), s = _(s), !L(r) && yt(s) && !yt(i)))
        return s.value = i, !0; let a = L(r) && Me(n) ? Number(n) < r.length : ae(r, n), c = Reflect.set(r, n, i, o); return r === _(o) && (a ? ht(i, s) && F(r, "set", n, i, s) : F(r, "add", n, i)), c; }; }
    function jn(e, t) { let r = ae(e, t), n = e[t], i = Reflect.deleteProperty(e, t); return i && r && F(e, "delete", t, void 0, n), i; }
    function Kn(e, t) { let r = Reflect.has(e, t); return (!Re(t) || !Sr.has(t)) && T(e, "has", t), r; }
    function zn(e) { return T(e, "iterate", L(e) ? "length" : q), Reflect.ownKeys(e); }
    var Rr = { get: Nn, set: Ln, deleteProperty: jn, has: Kn, ownKeys: zn }, Mr = { get: In, set(e, t) { return console.warn(`Set operation on key "${String(t)}" failed: target is readonly.`, e), !0; }, deleteProperty(e, t) { return console.warn(`Delete operation on key "${String(t)}" failed: target is readonly.`, e), !0; } }, Go = dt({}, Rr, { get: kn, set: Fn }), Yo = dt({}, Mr, { get: Dn }), bt = e => ce(e) ? De(e) : e, vt = e => ce(e) ? Tr(e) : e, wt = e => e, Pe = e => Reflect.getPrototypeOf(e);
    function $e(e, t, r = !1, n = !1) { e = e.__v_raw; let i = _(e), o = _(t); t !== o && !r && T(i, "get", t), !r && T(i, "get", o); let { has: s } = Pe(i), a = n ? wt : r ? vt : bt; if (s.call(i, t))
        return a(e.get(t)); if (s.call(i, o))
        return a(e.get(o)); e !== i && e.get(t); }
    function Le(e, t = !1) { let r = this.__v_raw, n = _(r), i = _(e); return e !== i && !t && T(n, "has", e), !t && T(n, "has", i), e === i ? r.has(e) : r.has(e) || r.has(i); }
    function Fe(e, t = !1) { return e = e.__v_raw, !t && T(_(e), "iterate", q), Reflect.get(e, "size", e); }
    function Nr(e) { e = _(e); let t = _(this); return Pe(t).has.call(t, e) || (t.add(e), F(t, "add", e, e)), this; }
    function Ir(e, t) { t = _(t); let r = _(this), { has: n, get: i } = Pe(r), o = n.call(r, e); o ? kr(r, n, e) : (e = _(e), o = n.call(r, e)); let s = i.call(r, e); return r.set(e, t), o ? ht(t, s) && F(r, "set", e, t, s) : F(r, "add", e, t), this; }
    function Dr(e) { let t = _(this), { has: r, get: n } = Pe(t), i = r.call(t, e); i ? kr(t, r, e) : (e = _(e), i = r.call(t, e)); let o = n ? n.call(t, e) : void 0, s = t.delete(e); return i && F(t, "delete", e, void 0, o), s; }
    function Pr() { let e = _(this), t = e.size !== 0, r = Z(e) ? new Map(e) : new Set(e), n = e.clear(); return t && F(e, "clear", void 0, void 0, r), n; }
    function je(e, t) { return function (n, i) { let o = this, s = o.__v_raw, a = _(s), c = t ? wt : e ? vt : bt; return !e && T(a, "iterate", q), s.forEach((l, u) => n.call(i, c(l), c(u), o)); }; }
    function Ke(e, t, r) { return function (...n) { let i = this.__v_raw, o = _(i), s = Z(o), a = e === "entries" || e === Symbol.iterator && s, c = e === "keys" && s, l = i[e](...n), u = r ? wt : t ? vt : bt; return !t && T(o, "iterate", c ? gt : q), { next() { let { value: p, done: x } = l.next(); return x ? { value: p, done: x } : { value: a ? [u(p[0]), u(p[1])] : u(p), done: x }; }, [Symbol.iterator]() { return this; } }; }; }
    function j(e) { return function (...t) { {
        let r = t[0] ? `on key "${t[0]}" ` : "";
        console.warn(`${mt(e)} operation ${r}failed: target is readonly.`, _(this));
    } return e === "delete" ? !1 : this; }; }
    var $r = { get(e) { return $e(this, e); }, get size() { return Fe(this); }, has: Le, add: Nr, set: Ir, delete: Dr, clear: Pr, forEach: je(!1, !1) }, Lr = { get(e) { return $e(this, e, !1, !0); }, get size() { return Fe(this); }, has: Le, add: Nr, set: Ir, delete: Dr, clear: Pr, forEach: je(!1, !0) }, Fr = { get(e) { return $e(this, e, !0); }, get size() { return Fe(this, !0); }, has(e) { return Le.call(this, e, !0); }, add: j("add"), set: j("set"), delete: j("delete"), clear: j("clear"), forEach: je(!0, !1) }, jr = { get(e) { return $e(this, e, !0, !0); }, get size() { return Fe(this, !0); }, has(e) { return Le.call(this, e, !0); }, add: j("add"), set: j("set"), delete: j("delete"), clear: j("clear"), forEach: je(!0, !0) }, Bn = ["keys", "values", "entries", Symbol.iterator];
    Bn.forEach(e => { $r[e] = Ke(e, !1, !1), Fr[e] = Ke(e, !0, !1), Lr[e] = Ke(e, !1, !0), jr[e] = Ke(e, !0, !0); });
    function ze(e, t) { let r = t ? e ? jr : Lr : e ? Fr : $r; return (n, i, o) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_raw" ? n : Reflect.get(ae(r, i) && i in n ? r : n, i, o); }
    var Vn = { get: ze(!1, !1) }, Jo = { get: ze(!1, !0) }, Hn = { get: ze(!0, !1) }, Zo = { get: ze(!0, !0) };
    function kr(e, t, r) { let n = _(r); if (n !== r && t.call(e, n)) {
        let i = pt(e);
        console.warn(`Reactive ${i} contains both the raw and reactive versions of the same object${i === "Map" ? " as keys" : ""}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`);
    } }
    var Ar = new WeakMap, Pn = new WeakMap, Or = new WeakMap, $n = new WeakMap;
    function qn(e) { switch (e) {
        case "Object":
        case "Array": return 1;
        case "Map":
        case "Set":
        case "WeakMap":
        case "WeakSet": return 2;
        default: return 0;
    } }
    function Un(e) { return e.__v_skip || !Object.isExtensible(e) ? 0 : qn(pt(e)); }
    function De(e) { return e && e.__v_isReadonly ? e : Kr(e, !1, Rr, Vn, Ar); }
    function Tr(e) { return Kr(e, !0, Mr, Hn, Or); }
    function Kr(e, t, r, n, i) { if (!ce(e))
        return console.warn(`value cannot be made reactive: ${String(e)}`), e; if (e.__v_raw && !(t && e.__v_isReactive))
        return e; let o = i.get(e); if (o)
        return o; let s = Un(e); if (s === 0)
        return e; let a = new Proxy(e, s === 2 ? n : r); return i.set(e, a), a; }
    function _(e) { return e && _(e.__v_raw) || e; }
    function yt(e) { return Boolean(e && e.__v_isRef === !0); }
    y("nextTick", () => we);
    y("dispatch", e => K.bind(K, e));
    y("watch", e => (t, r) => { let n = h(e, t), i = !0, o; k(() => n(s => { JSON.stringify(s), i ? o = s : queueMicrotask(() => { r(s, o), o = s; }), i = !1; })); });
    y("store", mr);
    y("data", e => D(I(e)));
    y("root", e => B(e));
    y("refs", e => (e._x_refs_proxy || (e._x_refs_proxy = D(Wn(e))), e._x_refs_proxy));
    function Wn(e) { let t = [], r = e; for (; r;)
        r._x_refs && t.push(r._x_refs), r = r.parentNode; return t; }
    var Et = {};
    function St(e) { return Et[e] || (Et[e] = 0), ++Et[e]; }
    function zr(e, t) { return Ae(e, r => { if (r._x_ids && r._x_ids[t])
        return !0; }); }
    function Br(e, t) { e._x_ids || (e._x_ids = {}), e._x_ids[t] || (e._x_ids[t] = St(t)); }
    y("id", e => (t, r = null) => { let n = zr(e, t), i = n ? n._x_ids[t] : St(t); return r ? new At(`${t}-${i}-${r}`) : new At(`${t}-${i}`); });
    var At = class {
        constructor(t) { this.id = t; }
        toString() { return this.id; }
    };
    y("el", e => e);
    d("teleport", (e, { expression: t }, { cleanup: r }) => { e.tagName.toLowerCase() !== "template" && z("x-teleport can only be used on a <template> tag", e); let n = document.querySelector(t); n || z(`Cannot find x-teleport element for selector: "${t}"`); let i = e.content.cloneNode(!0).firstElementChild; e._x_teleport = i, i._x_teleportBack = e, e._x_forwardEvents && e._x_forwardEvents.forEach(o => { i.addEventListener(o, s => { s.stopPropagation(), e.dispatchEvent(new s.constructor(s.type, s)); }); }), C(i, {}, e), m(() => { n.appendChild(i), S(i), i._x_ignore = !0; }), r(() => i.remove()); });
    var Vr = () => { };
    Vr.inline = (e, { modifiers: t }, { cleanup: r }) => { t.includes("self") ? e._x_ignoreSelf = !0 : e._x_ignore = !0, r(() => { t.includes("self") ? delete e._x_ignoreSelf : delete e._x_ignore; }); };
    d("ignore", Vr);
    d("effect", (e, { expression: t }, { effect: r }) => r(h(e, t)));
    function ue(e, t, r, n = []) { switch (e._x_bindings || (e._x_bindings = O({})), e._x_bindings[t] = r, t = n.includes("camel") ? Qn(t) : t, t) {
        case "value":
            Gn(e, r);
            break;
        case "style":
            Jn(e, r);
            break;
        case "class":
            Yn(e, r);
            break;
        default:
            Zn(e, t, r);
            break;
    } }
    function Gn(e, t) { if (e.type === "radio")
        e.attributes.value === void 0 && (e.value = t), window.fromModel && (e.checked = Hr(e.value, t));
    else if (e.type === "checkbox")
        Number.isInteger(t) ? e.value = t : !Number.isInteger(t) && !Array.isArray(t) && typeof t != "boolean" && ![null, void 0].includes(t) ? e.value = String(t) : Array.isArray(t) ? e.checked = t.some(r => Hr(r, e.value)) : e.checked = !!t;
    else if (e.tagName === "SELECT")
        Xn(e, t);
    else {
        if (e.value === t)
            return;
        e.value = t;
    } }
    function Yn(e, t) { e._x_undoAddedClasses && e._x_undoAddedClasses(), e._x_undoAddedClasses = ie(e, t); }
    function Jn(e, t) { e._x_undoAddedStyles && e._x_undoAddedStyles(), e._x_undoAddedStyles = V(e, t); }
    function Zn(e, t, r) { [null, void 0, !1].includes(r) && ri(t) ? e.removeAttribute(t) : (ti(t) && (r = t), ei(e, t, r)); }
    function ei(e, t, r) { e.getAttribute(t) != r && e.setAttribute(t, r); }
    function Xn(e, t) { let r = [].concat(t).map(n => n + ""); Array.from(e.options).forEach(n => { n.selected = r.includes(n.value); }); }
    function Qn(e) { return e.toLowerCase().replace(/-(\w)/g, (t, r) => r.toUpperCase()); }
    function Hr(e, t) { return e == t; }
    function ti(e) { return ["disabled", "checked", "required", "readonly", "hidden", "open", "selected", "autofocus", "itemscope", "multiple", "novalidate", "allowfullscreen", "allowpaymentrequest", "formnovalidate", "autoplay", "controls", "loop", "muted", "playsinline", "default", "ismap", "reversed", "async", "defer", "nomodule"].includes(e); }
    function ri(e) { return !["aria-pressed", "aria-checked", "aria-expanded"].includes(e); }
    function fe(e, t, r, n) { let i = e, o = c => n(c), s = {}, a = (c, l) => u => l(c, u); if (r.includes("dot") && (t = ni(t)), r.includes("camel") && (t = ii(t)), r.includes("passive") && (s.passive = !0), r.includes("capture") && (s.capture = !0), r.includes("window") && (i = window), r.includes("document") && (i = document), r.includes("prevent") && (o = a(o, (c, l) => { l.preventDefault(), c(l); })), r.includes("stop") && (o = a(o, (c, l) => { l.stopPropagation(), c(l); })), r.includes("self") && (o = a(o, (c, l) => { l.target === e && c(l); })), (r.includes("away") || r.includes("outside")) && (i = document, o = a(o, (c, l) => { e.contains(l.target) || e.offsetWidth < 1 && e.offsetHeight < 1 || e._x_isShown !== !1 && c(l); })), o = a(o, (c, l) => { oi(t) && si(l, r) || c(l); }), r.includes("debounce")) {
        let c = r[r.indexOf("debounce") + 1] || "invalid-wait", l = Ot(c.split("ms")[0]) ? Number(c.split("ms")[0]) : 250;
        o = Te(o, l);
    } if (r.includes("throttle")) {
        let c = r[r.indexOf("throttle") + 1] || "invalid-wait", l = Ot(c.split("ms")[0]) ? Number(c.split("ms")[0]) : 250;
        o = Ce(o, l);
    } return r.includes("once") && (o = a(o, (c, l) => { c(l), i.removeEventListener(t, o, s); })), i.addEventListener(t, o, s), () => { i.removeEventListener(t, o, s); }; }
    function ni(e) { return e.replace(/-/g, "."); }
    function ii(e) { return e.toLowerCase().replace(/-(\w)/g, (t, r) => r.toUpperCase()); }
    function Ot(e) { return !Array.isArray(e) && !isNaN(e); }
    function ai(e) { return e.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[_\s]/, "-").toLowerCase(); }
    function oi(e) { return ["keydown", "keyup"].includes(e); }
    function si(e, t) { let r = t.filter(o => !["window", "document", "prevent", "stop", "once"].includes(o)); if (r.includes("debounce")) {
        let o = r.indexOf("debounce");
        r.splice(o, Ot((r[o + 1] || "invalid-wait").split("ms")[0]) ? 2 : 1);
    } if (r.length === 0 || r.length === 1 && qr(e.key).includes(r[0]))
        return !1; let i = ["ctrl", "shift", "alt", "meta", "cmd", "super"].filter(o => r.includes(o)); return r = r.filter(o => !i.includes(o)), !(i.length > 0 && i.filter(s => ((s === "cmd" || s === "super") && (s = "meta"), e[`${s}Key`])).length === i.length && qr(e.key).includes(r[0])); }
    function qr(e) { if (!e)
        return []; e = ai(e); let t = { ctrl: "control", slash: "/", space: "-", spacebar: "-", cmd: "meta", esc: "escape", up: "arrow-up", down: "arrow-down", left: "arrow-left", right: "arrow-right", period: ".", equal: "=" }; return t[e] = e, Object.keys(t).map(r => { if (t[r] === e)
        return r; }).filter(r => r); }
    d("model", (e, { modifiers: t, expression: r }, { effect: n, cleanup: i }) => { let o = h(e, r), s = `${r} = rightSideOfExpression($event, ${r})`, a = h(e, s); var c = e.tagName.toLowerCase() === "select" || ["checkbox", "radio"].includes(e.type) || t.includes("lazy") ? "change" : "input"; let l = ci(e, t, r), u = fe(e, c, t, x => { a(() => { }, { scope: { $event: x, rightSideOfExpression: l } }); }); i(() => u()); let p = h(e, `${r} = __placeholder`); e._x_model = { get() { let x; return o(N => x = N), x; }, set(x) { p(() => { }, { scope: { __placeholder: x } }); } }, e._x_forceModelUpdate = () => { o(x => { x === void 0 && r.match(/\./) && (x = ""), window.fromModel = !0, m(() => ue(e, "value", x)), delete window.fromModel; }); }, n(() => { t.includes("unintrusive") && document.activeElement.isSameNode(e) || e._x_forceModelUpdate(); }); });
    function ci(e, t, r) { return e.type === "radio" && m(() => { e.hasAttribute("name") || e.setAttribute("name", r); }), (n, i) => m(() => { if (n instanceof CustomEvent && n.detail !== void 0)
        return n.detail || n.target.value; if (e.type === "checkbox")
        if (Array.isArray(i)) {
            let o = t.includes("number") ? Tt(n.target.value) : n.target.value;
            return n.target.checked ? i.concat([o]) : i.filter(s => !li(s, o));
        }
        else
            return n.target.checked;
    else {
        if (e.tagName.toLowerCase() === "select" && e.multiple)
            return t.includes("number") ? Array.from(n.target.selectedOptions).map(o => { let s = o.value || o.text; return Tt(s); }) : Array.from(n.target.selectedOptions).map(o => o.value || o.text);
        {
            let o = n.target.value;
            return t.includes("number") ? Tt(o) : t.includes("trim") ? o.trim() : o;
        }
    } }); }
    function Tt(e) { let t = e ? parseFloat(e) : null; return ui(t) ? t : e; }
    function li(e, t) { return e == t; }
    function ui(e) { return !Array.isArray(e) && !isNaN(e); }
    d("cloak", e => queueMicrotask(() => m(() => e.removeAttribute(E("cloak")))));
    Se(() => `[${E("init")}]`);
    d("init", $((e, { expression: t }) => typeof t == "string" ? !!t.trim() && w(e, t, {}, !1) : w(e, t, {}, !1)));
    d("text", (e, { expression: t }, { effect: r, evaluateLater: n }) => { let i = n(t); r(() => { i(o => { m(() => { e.textContent = o; }); }); }); });
    d("html", (e, { expression: t }, { effect: r, evaluateLater: n }) => { let i = n(t); r(() => { i(o => { e.innerHTML = o; }); }); });
    J(xe(":", ye(E("bind:"))));
    d("bind", (e, { value: t, modifiers: r, expression: n, original: i }, { effect: o }) => { if (!t)
        return fi(e, n, i, o); if (t === "key")
        return di(e, n); let s = h(e, n); o(() => s(a => { a === void 0 && n.match(/\./) && (a = ""), m(() => ue(e, t, a, r)); })); });
    function fi(e, t, r, n) { let i = h(e, t), o = []; n(() => { for (; o.length;)
        o.pop()(); i(s => { let a = Object.entries(s).map(([l, u]) => ({ name: l, value: u })), c = Jt(a); a = a.map(l => c.find(u => u.name === l.name) ? { name: `x-bind:${l.name}`, value: `"${l.value}"` } : l), re(e, a, r).map(l => { o.push(l.runCleanups), l(); }); }); }); }
    function di(e, t) { e._x_keyExpression = t; }
    Ee(() => `[${E("data")}]`);
    d("data", $((e, { expression: t }, { cleanup: r }) => { t = t === "" ? "{}" : t; let n = {}; te(n, e); let i = {}; gr(i, n); let o = w(e, t, { scope: i }); o === void 0 && (o = {}), te(o, e); let s = O(o); he(s); let a = C(e, s); s.init && w(e, s.init), r(() => { a(), s.destroy && w(e, s.destroy); }); }));
    d("show", (e, { modifiers: t, expression: r }, { effect: n }) => { let i = h(e, r), o = () => m(() => { e.style.display = "none", e._x_isShown = !1; }), s = () => m(() => { e.style.length === 1 && e.style.display === "none" ? e.removeAttribute("style") : e.style.removeProperty("display"), e._x_isShown = !0; }), a = () => setTimeout(s), c = oe(p => p ? s() : o(), p => { typeof e._x_toggleAndCascadeWithTransitions == "function" ? e._x_toggleAndCascadeWithTransitions(e, p, s, o) : p ? a() : o(); }), l, u = !0; n(() => i(p => { !u && p === l || (t.includes("immediate") && (p ? a() : o()), c(p), l = p, u = !1); })); });
    d("for", (e, { expression: t }, { effect: r, cleanup: n }) => { let i = mi(t), o = h(e, i.items), s = h(e, e._x_keyExpression || "index"); e._x_prevKeys = [], e._x_lookup = {}, r(() => pi(e, i, o, s)), n(() => { Object.values(e._x_lookup).forEach(a => a.remove()), delete e._x_prevKeys, delete e._x_lookup; }); });
    function pi(e, t, r, n) { let i = s => typeof s == "object" && !Array.isArray(s), o = e; r(s => { hi(s) && s >= 0 && (s = Array.from(Array(s).keys(), f => f + 1)), s === void 0 && (s = []); let a = e._x_lookup, c = e._x_prevKeys, l = [], u = []; if (i(s))
        s = Object.entries(s).map(([f, g]) => { let b = Ur(t, g, f, s); n(v => u.push(v), { scope: Object.assign({ index: f }, b) }), l.push(b); });
    else
        for (let f = 0; f < s.length; f++) {
            let g = Ur(t, s[f], f, s);
            n(b => u.push(b), { scope: Object.assign({ index: f }, g) }), l.push(g);
        } let p = [], x = [], N = [], U = []; for (let f = 0; f < c.length; f++) {
        let g = c[f];
        u.indexOf(g) === -1 && N.push(g);
    } c = c.filter(f => !N.includes(f)); let de = "template"; for (let f = 0; f < u.length; f++) {
        let g = u[f], b = c.indexOf(g);
        if (b === -1)
            c.splice(f, 0, g), p.push([de, f]);
        else if (b !== f) {
            let v = c.splice(f, 1)[0], A = c.splice(b - 1, 1)[0];
            c.splice(f, 0, A), c.splice(b, 0, v), x.push([v, A]);
        }
        else
            U.push(g);
        de = g;
    } for (let f = 0; f < N.length; f++) {
        let g = N[f];
        a[g].remove(), a[g] = null, delete a[g];
    } for (let f = 0; f < x.length; f++) {
        let [g, b] = x[f], v = a[g], A = a[b], W = document.createElement("div");
        m(() => { A.after(W), v.after(A), A._x_currentIfEl && A.after(A._x_currentIfEl), W.before(v), v._x_currentIfEl && v.after(v._x_currentIfEl), W.remove(); }), et(A, l[u.indexOf(b)]);
    } for (let f = 0; f < p.length; f++) {
        let [g, b] = p[f], v = g === "template" ? o : a[g];
        v._x_currentIfEl && (v = v._x_currentIfEl);
        let A = l[b], W = u[b], pe = document.importNode(o.content, !0).firstElementChild;
        C(pe, O(A), o), m(() => { v.after(pe), S(pe); }), typeof W == "object" && z("x-for key cannot be an object, it must be a string or an integer", o), a[W] = pe;
    } for (let f = 0; f < U.length; f++)
        et(a[U[f]], l[u.indexOf(U[f])]); o._x_prevKeys = u; }); }
    function mi(e) { let t = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/, r = /^\s*\(|\)\s*$/g, n = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/, i = e.match(n); if (!i)
        return; let o = {}; o.items = i[2].trim(); let s = i[1].replace(r, "").trim(), a = s.match(t); return a ? (o.item = s.replace(t, "").trim(), o.index = a[1].trim(), a[2] && (o.collection = a[2].trim())) : o.item = s, o; }
    function Ur(e, t, r, n) { let i = {}; return /^\[.*\]$/.test(e.item) && Array.isArray(t) ? e.item.replace("[", "").replace("]", "").split(",").map(s => s.trim()).forEach((s, a) => { i[s] = t[a]; }) : /^\{.*\}$/.test(e.item) && !Array.isArray(t) && typeof t == "object" ? e.item.replace("{", "").replace("}", "").split(",").map(s => s.trim()).forEach(s => { i[s] = t[s]; }) : i[e.item] = t, e.index && (i[e.index] = r), e.collection && (i[e.collection] = n), i; }
    function hi(e) { return !Array.isArray(e) && !isNaN(e); }
    function Wr() { }
    Wr.inline = (e, { expression: t }, { cleanup: r }) => { let n = B(e); n._x_refs || (n._x_refs = {}), n._x_refs[t] = e, r(() => delete n._x_refs[t]); };
    d("ref", Wr);
    d("if", (e, { expression: t }, { effect: r, cleanup: n }) => { let i = h(e, t), o = () => { if (e._x_currentIfEl)
        return e._x_currentIfEl; let a = e.content.cloneNode(!0).firstElementChild; return C(a, {}, e), m(() => { e.after(a), S(a); }), e._x_currentIfEl = a, e._x_undoIf = () => { a.remove(), delete e._x_currentIfEl; }, a; }, s = () => { !e._x_undoIf || (e._x_undoIf(), delete e._x_undoIf); }; r(() => i(a => { a ? o() : s(); })), n(() => e._x_undoIf && e._x_undoIf()); });
    d("id", (e, { expression: t }, { evaluate: r }) => { r(t).forEach(i => Br(e, i)); });
    J(xe("@", ye(E("on:"))));
    d("on", $((e, { value: t, modifiers: r, expression: n }, { cleanup: i }) => { let o = n ? h(e, n) : () => { }; e.tagName.toLowerCase() === "template" && (e._x_forwardEvents || (e._x_forwardEvents = []), e._x_forwardEvents.includes(t) || e._x_forwardEvents.push(t)); let s = fe(e, t, r, a => { o(() => { }, { scope: { $event: a }, params: [a] }); }); i(() => s()); }));
    R.setEvaluator(rt);
    R.setReactivityEngine({ reactive: De, effect: br, release: wr, raw: _ });
    var Ct = R;
    window.Alpine = Ct;
    queueMicrotask(() => { Ct.start(); });
})();
