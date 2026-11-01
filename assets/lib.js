// কমন হেল্পার (আগের lib.php এর জাভাস্ক্রিপ্ট সংস্করণ)
import { db, configured } from "/assets/firebase.js";
import { collection, doc, getDoc, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export { configured };
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const bn = n => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);
const MONTHS = ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];
const FMT = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hour12: false });
export function dhaka(t) { const o = {}; FMT.formatToParts(new Date(t * 1000)).forEach(p => o[p.type] = p.value); o.hour = String(+o.hour % 24); return o; }
export const fdate = t => { const p = dhaka(t); return bn(+p.day) + " " + MONTHS[+p.month - 1] + " " + bn(p.year); };
export const ftime = t => { const p = dhaka(t); const h = ((+p.hour + 11) % 12) + 1; return bn(String(h).padStart(2, "0") + ":" + p.minute); };
export const now = () => Math.floor(Date.now() / 1000);
export const when = t => { const d = now() - t; if (d < 60) return "এইমাত্র"; if (d < 3600) return bn(Math.floor(d / 60)) + " মিনিট আগে"; if (d < 86400) return bn(Math.floor(d / 3600)) + " ঘণ্টা আগে"; return fdate(t); };
export function img(i, w = 600) {
  if (!i) return "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="3" height="2"><rect width="3" height="2" fill="#e6e6e6"/></svg>');
  if (/^https?:/.test(i)) return i;
  return "https://media.prothomalo.com/" + i + "?auto=format,compress&format=webp&w=" + w + "&q=75";
}
export function card(a, cls = "") {
  const l = "/article?slug=" + encodeURIComponent(a.slug);
  return `<article class="pa-card ${cls}"><a href="${l}" class="pa-img"><img loading="lazy" src="${esc(img(a.image, cls === "lead" ? 900 : 500))}" alt="${esc(a.headline)}"></a><div class="pa-txt">${a.subheadline ? `<div class="pa-kick">${esc(a.subheadline)}</div>` : ""}<h2><a href="${l}">${esc(a.headline)}</a></h2><div class="pa-meta">${esc(a.author)} <span>${when(a.published_at)}</span></div></div></article>`;
}

// ছোট ক্যাশ (localStorage) — বারবার Firestore রিড কমানোর জন্য
const TTL = 300;
export function clearCache() { try { localStorage.removeItem("nb_sections"); localStorage.removeItem("nb_settings"); } catch (e) {} }
async function cached(key, fn) {
  try { const c = JSON.parse(localStorage.getItem(key) || "null"); if (c && Date.now() - c.t < TTL * 1000) return c.v; } catch (e) {}
  const v = await fn();
  try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), v })); } catch (e) {}
  return v;
}
export const getSections = () => cached("nb_sections", async () => {
  const s = await getDocs(query(collection(db, "sections"), orderBy("sort")));
  return s.docs.map(d => ({ slug: d.id, ...d.data() }));
});
export const getSettings = () => cached("nb_settings", async () => {
  const s = await getDoc(doc(db, "settings", "site"));
  return s.exists() ? s.data() : {};
});
export function setupNeeded(root) {
  root.innerHTML = '<div style="max-width:640px;margin:60px auto;padding:20px;font:16px/1.7 system-ui,sans-serif"><h2>Firebase কনফিগ বসানো হয়নি</h2><p><code>assets/firebase-config.js</code> ফাইলে আপনার Firebase প্রজেক্টের কনফিগ বসান। বিস্তারিত README.md-তে আছে।</p></div>';
}
