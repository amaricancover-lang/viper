import { db } from "/assets/firebase.js";
import { collection, doc, getDoc, getDocs, increment, limit, orderBy, query, updateDoc, where } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { app as fbApp } from "/assets/firebase.js";
import { bn, card, configured, esc, fdate, ftime, getSections, img, setupNeeded } from "/assets/lib.js";
import { mountLayout } from "/assets/layout.js";

if (!configured) { setupNeeded(document.body); throw new Error("firebase-config.js not set"); }

const { app, S } = await mountLayout();
const SITE = S.site_name || "NB NEWS";
const slug = (new URLSearchParams(location.search).get("slug") || "").trim();

function notFound() {
  document.title = "পাওয়া যায়নি | " + SITE;
  app.innerHTML = '<main class="pa-wrap"><p class="pa-empty">খবরটি পাওয়া যায়নি।</p></main>';
}

// অ্যাডমিন লগইন থাকলে খসড়াও প্রিভিউ করা যায়, তাই অথ লোড হওয়া পর্যন্ত অপেক্ষা
try { await getAuth(fbApp).authStateReady(); } catch (e) {}

let a = null;
if (slug) {
  try {
    const s = await getDoc(doc(db, "articles", slug));
    if (s.exists()) a = { slug: s.id, ...s.data() };
  } catch (e) { /* খসড়া: পারমিশন নেই = পাওয়া যায়নি */ }
}
if (!a) { notFound(); throw new Error("not found"); }

const isDraft = a.status !== "published";
// পঠিত সংখ্যা — প্রতি সেশনে একবার
let views = a.views || 0;
if (!isDraft) {
  try {
    if (!sessionStorage.getItem("v_" + a.slug)) {
      sessionStorage.setItem("v_" + a.slug, "1");
      await updateDoc(doc(db, "articles", a.slug), { views: increment(1) });
      views += 1;
    }
  } catch (e) {}
}

const sections = await getSections();
const sec = sections.find(x => x.slug === a.section);
const A = collection(db, "articles");
const [relSnap, topSnap] = await Promise.all([
  a.section ? getDocs(query(A, where("status", "==", "published"), where("section", "==", a.section), orderBy("published_at", "desc"), limit(5))).catch(() => null) : null,
  getDocs(query(A, where("status", "==", "published"), orderBy("views", "desc"), limit(6))).catch(() => null)
]);
const rel = relSnap ? relSnap.docs.filter(d => d.id !== a.slug).slice(0, 4).map(d => ({ slug: d.id, ...d.data() })) : [];
const top = topSnap ? topSnap.docs.map(d => ({ slug: d.id, ...d.data() })) : [];

document.title = a.headline + " | " + SITE;
const setMeta = (key, name, val) => { let m = document.querySelector(`meta[${key}="${name}"]`); if (!m) { m = document.createElement("meta"); m.setAttribute(key, name); document.head.appendChild(m); } m.setAttribute("content", val); };
setMeta("name", "description", a.subheadline || "");
setMeta("property", "og:title", a.headline);
setMeta("property", "og:image", img(a.image, 1200));

const url = location.href;
let body;
const c = (a.content || "").trim();
if (c !== "") {
  const isHtml = /<[a-z][\s\S]*>/i.test(c);
  body = isHtml ? (window.DOMPurify ? DOMPurify.sanitize(c, { ADD_ATTR: ["target"] }) : esc(c)) : esc(c).replace(/\n/g, "<br>");
} else {
  body = "<p>এই খবরের বিস্তারিত এখানে যোগ করা হয়নি।" + (a.source_url ? ` <a href="${esc(a.source_url)}" target="_blank" rel="noopener" style="color:#e4262c">মূল প্রতিবেদন পড়ুন →</a>` : "") + "</p>";
}

app.innerHTML = `<main class="pa-wrap"><div class="pa-art"><article>
${isDraft ? '<div style="background:#fef3c7;padding:8px 12px;margin-bottom:10px;border-radius:6px">⚠ এটি খসড়া — শুধু অ্যাডমিন দেখছেন</div>' : ""}
${sec ? `<a class="pa-kick" href="/?s=${encodeURIComponent(sec.slug)}">${esc(sec.name)}</a>` : ""}
<h1>${esc(a.headline)}</h1>
${a.subheadline ? `<div class="pa-kick" style="font-size:1.1rem">${esc(a.subheadline)}</div>` : ""}
<div class="pa-meta">${esc(a.author)} <span>প্রকাশ: ${fdate(a.published_at)}, ${ftime(a.published_at)}</span> <span>পঠিত: ${bn(views)}</span></div>
<figure><img src="${esc(img(a.image, 1000))}" alt="${esc(a.headline)}"></figure>
<div class="pa-share"><a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">ফেসবুক</a><a target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(a.headline)}">টুইটার</a><button id="cp">লিংক কপি</button><button id="pr">প্রিন্ট</button></div>
<div class="pa-body">${body}</div>
</article>
<aside class="pa-side"><h3>সর্বাধিক পঠিত</h3><ol>${top.map(t => `<li><a href="/article?slug=${encodeURIComponent(t.slug)}">${esc(t.headline)}</a></li>`).join("")}</ol></aside></div>
${rel.length ? `<h3 class="pa-title" style="font-size:1.3rem">আরও পড়ুন</h3><div class="pa-rel">${rel.map(r => card(r)).join("")}</div>` : ""}</main>`;
document.getElementById("cp").onclick = e => { navigator.clipboard.writeText(location.href); e.target.textContent = "কপি হয়েছে"; };
document.getElementById("pr").onclick = () => print();
