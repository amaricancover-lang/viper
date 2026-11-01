import { db } from "/assets/firebase.js";
import { collection, getCountFromServer, getDocs, limit, offset, orderBy, query, where } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { bn, card, configured, esc, now, setupNeeded } from "/assets/lib.js";
import { mountLayout } from "/assets/layout.js";

if (!configured) { setupNeeded(document.body); throw new Error("firebase-config.js not set"); }

const { app, sections, S } = await mountLayout();
const P = new URLSearchParams(location.search);
const slug = (P.get("s") || "").trim();
const qs = P.has("q") ? (P.get("q") || "").trim() : null;
const pg = Math.max(1, parseInt(P.get("page") || "1", 10) || 1);
const per = Math.max(5, parseInt(S.per_page || 20, 10) || 20);
const SITE = S.site_name || "NB NEWS";
const A = collection(db, "articles");

let sec = null, nf = false;
const constraints = [where("status", "==", "published"), where("published_at", "<=", now())];
if (slug) {
  sec = sections.find(x => x.slug === slug) || null;
  if (!sec) nf = true;
  else {
    const ids = [sec.slug, ...sections.filter(x => x.parent === sec.slug).map(x => x.slug)].slice(0, 30);
    constraints.push(where("section", "in", ids));
  }
}

let list = [], total = 0;
try {
  if (!nf) {
    if (qs) {
      // Firestore-এ LIKE সার্চ নেই — সাম্প্রতিক ২০০টি খবরের মধ্যে খোঁজা হয়
      const snap = await getDocs(query(A, ...constraints, orderBy("published_at", "desc"), limit(200)));
      const k = qs.toLowerCase();
      const all = snap.docs.map(d => ({ slug: d.id, ...d.data() })).filter(a => (a.headline + " " + (a.subheadline || "") + " " + (a.content || "")).toLowerCase().includes(k));
      total = all.length; list = all.slice((pg - 1) * per, pg * per);
    } else {
      total = (await getCountFromServer(query(A, ...constraints))).data().count;
      const snap = await getDocs(query(A, ...constraints, orderBy("published_at", "desc"), offset((pg - 1) * per), limit(per)));
      list = snap.docs.map(d => ({ slug: d.id, ...d.data() }));
    }
  }
} catch (err) { console.error(err); app.innerHTML = '<main class="pa-wrap"><p class="pa-empty">খবর লোড করা যায়নি। (Firestore ইনডেক্স/রুলস ডিপ্লয় হয়েছে কি না দেখুন)</p></main>'; throw err; }

document.title = (qs !== null ? "খুঁজুন" : sec ? sec.name : "সর্বশেষ খবর") + " | " + SITE;

let h = '<main class="pa-wrap">';
if (qs !== null) h += `<form class="pa-search" action="/"><input name="q" value="${esc(qs)}" placeholder="খবর খুঁজুন" autofocus><button>খুঁজুন</button></form>`;
else {
  h += `<h1 class="pa-title">${esc(sec ? sec.name : nf ? "পাওয়া যায়নি" : "সর্বশেষ")}</h1>`;
  if (sec) {
    const pid = sec.parent || sec.slug;
    const subs = sections.filter(x => x.parent === pid);
    if (subs.length) {
      const par = sections.find(x => x.slug === pid);
      h += `<div class="pa-chips"><a class="${par.slug === sec.slug ? "on" : ""}" href="/?s=${encodeURIComponent(par.slug)}">সব</a>` +
        subs.map(x => `<a class="${x.slug === sec.slug ? "on" : ""}" href="/?s=${encodeURIComponent(x.slug)}">${esc(x.name)}</a>`).join("") + "</div>";
    }
  }
}
if (!list.length) h += '<p class="pa-empty">কোনো খবর পাওয়া যায়নি।</p>';
else {
  const first = (pg === 1 && qs === null && list.length >= 5) ? list.splice(0, 5) : [];
  if (first.length) h += `<div class="pa-top">${card(first[0], "lead")}<div class="pa-col">${card(first[1])}${card(first[2])}</div><div class="pa-col">${card(first[3])}${card(first[4])}</div></div>`;
  h += '<div class="pa-grid">' + list.map(x => card(x)).join("") + "</div>";
  const pages = Math.ceil(total / per);
  if (pages > 1) {
    h += '<div class="pa-pager">';
    for (let i = 1; i <= pages; i++) {
      const q = new URLSearchParams();
      if (slug) q.set("s", slug);
      if (qs) q.set("q", qs);
      if (i > 1) q.set("page", i);
      h += i === pg ? `<b>${bn(i)}</b>` : `<a href="/${q.toString() ? "?" + q : ""}">${bn(i)}</a>`;
    }
    h += "</div>";
  }
}
app.innerHTML = h + "</main>";
