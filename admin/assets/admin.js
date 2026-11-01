import { app as fbApp, db, configured } from "/assets/firebase.js";
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, query, where, orderBy, limit,
  getCountFromServer, getAggregateFromServer, sum
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword,
  reauthenticateWithCredential, EmailAuthProvider, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getStorage, ref as sref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
import { bn, clearCache, dhaka, esc, fdate, img, now, when } from "/assets/lib.js";

const root = document.getElementById("root");
if (!configured) {
  root.innerHTML = '<div style="max-width:640px;margin:60px auto;padding:20px;font:16px/1.7 system-ui"><h2>Firebase কনফিগ বসানো হয়নি</h2><p><code>assets/firebase-config.js</code> ফাইলে আপনার Firebase কনফিগ বসান (README দেখুন)।</p></div>';
  throw new Error("firebase-config.js not set");
}
const auth = getAuth(fbApp);
const A = collection(db, "articles"), SEC = collection(db, "sections");
let SITE = "NB NEWS", user = null, sections = [], settings = {};

/* ---------- হেল্পার ---------- */
const $ = s => document.querySelector(s);
const toast = m => { const t = document.createElement("div"); t.className = "toast"; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 4600); };
const errMsg = e => e && e.code === "permission-denied" ? "অনুমতি নেই — এই ইমেইল firestore.rules-এ অ্যাডমিন হিসেবে যোগ করা আছে কি?" : (e && e.message) || "কিছু একটা সমস্যা হয়েছে";
const ensureSlug = s => String(s || "").trim().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
const rand = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => (b % 36).toString(36)).join("");
const fromDhakaInput = v => { const t = Date.parse(v + ":00+06:00"); return isNaN(t) ? now() : Math.floor(t / 1000); };
const toDhakaInput = t => new Date((t + 6 * 3600) * 1000).toISOString().slice(0, 16);
const IC = {
  dash: '<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>',
  articles: '<path d="M4 4h13a3 3 0 013 3v13H7a3 3 0 01-3-3V4zm3 4v2h10V8H7zm0 4v2h10v-2H7zm0 4v2h6v-2H7z"/>',
  edit: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/>',
  sections: '<path d="M3 4h7v7H3V4zm11 0h7v7h-7V4zM3 13h7v7H3v-7zm11 0h7v7h-7v-7z"/>',
  settings: '<path d="M19.4 13a7.9 7.9 0 000-2l2-1.6-2-3.4-2.4 1a8 8 0 00-1.7-1L15 3.3h-4l-.3 2.7a8 8 0 00-1.7 1l-2.4-1-2 3.4 2 1.6a7.9 7.9 0 000 2l-2 1.6 2 3.4 2.4-1a8 8 0 001.7 1l.3 2.7h4l.3-2.7a8 8 0 001.7-1l2.4 1 2-3.4-2-1.6zM13 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z"/>',
  site: '<path d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14V3zM5 5h6v2H5v12h12v-6h2v8H3V5h2z"/>',
  out: '<path d="M16 17v-3H9v-4h7V7l5 5-5 5zM14 2a2 2 0 012 2v2h-2V4H5v16h9v-2h2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h9z"/>'
};
const ic = k => `<svg viewBox="0 0 24 24" fill="currentColor">${IC[k]}</svg>`;
const badge = st => `<span class="bd ${st === "draft" ? "d" : ""}">${st === "draft" ? "খসড়া" : "প্রকাশিত"}</span>`;
const secName = s => (sections.find(x => x.slug === s) || {}).name || "";
const secOpts = (sel, skip) => '<option value="">— নির্বাচন করুন —</option>' + [...sections]
  .sort((a, b) => ((a.parent || a.slug).localeCompare(b.parent || b.slug)) || (!!a.parent - !!b.parent) || (a.sort - b.sort))
  .filter(s => s.slug !== skip).map(s => `<option value="${esc(s.slug)}"${s.slug === sel ? " selected" : ""}>${s.parent ? "— " : ""}${esc(s.name)}</option>`).join("");

async function loadMeta() {
  clearCache();
  const [ss, st] = await Promise.all([getDocs(query(SEC, orderBy("sort"))), getDoc(doc(db, "settings", "site"))]);
  sections = ss.docs.map(d => ({ slug: d.id, ...d.data() }));
  settings = st.exists() ? st.data() : {};
  SITE = settings.site_name || "NB NEWS";
}

/* ---------- লগইন ---------- */
function loginView(err = "") {
  root.innerHTML = `<div class="lgw"><div class="lgl"><div class="brand" style="border:0;padding:0;position:relative;z-index:1"><i>NB</i><div><b>${esc(SITE)}</b><small>নিউজ ম্যানেজমেন্ট সিস্টেম</small></div></div><h2>খবর পরিচালনা এখন আরও সহজ</h2><p>এক জায়গা থেকে খবর, বিভাগ ও সাইটের সেটিংস নিয়ন্ত্রণ করুন।</p><ul><li>দ্রুত খবর প্রকাশ ও খসড়া সংরক্ষণ</li><li>লাইভ পরিসংখ্যান ও চার্ট</li><li>মোবাইল-বান্ধব অ্যাডমিন</li></ul></div><div class="lgr"><form id="lf" class="lgf"><h3>অ্যাডমিন লগইন</h3><p>চালিয়ে যেতে লগইন করুন</p>${err ? `<div class="err">${esc(err)}</div>` : ""}<label>ইমেইল</label><input type="email" name="u" required autofocus autocomplete="username"><label>পাসওয়ার্ড</label><input type="password" name="pw" required autocomplete="current-password"><br><button class="btn" style="width:100%;justify-content:center">প্রবেশ করুন</button><p style="text-align:center;margin-top:12px"><a href="#" id="fp" style="color:#64748b;font-size:.88rem">পাসওয়ার্ড ভুলে গেছেন?</a></p><p style="text-align:center;margin-top:8px"><a href="/" style="color:#64748b;font-size:.88rem">← সাইটে ফিরে যান</a></p></form></div></div>`;
  const f = $("#lf");
  f.onsubmit = async e => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, f.u.value.trim(), f.pw.value); }
    catch (x) { loginView("ইমেইল বা পাসওয়ার্ড ভুল।"); }
  };
  $("#fp").onclick = async e => {
    e.preventDefault();
    if (!f.u.value.trim()) return alert("আগে ইমেইল ঘরে আপনার ইমেইল লিখুন।");
    try { await sendPasswordResetEmail(auth, f.u.value.trim()); alert("পাসওয়ার্ড রিসেট লিংক ইমেইলে পাঠানো হয়েছে।"); } catch (x) { alert("পাঠানো যায়নি।"); }
  };
}

/* ---------- শেল ---------- */
const NAV = { dash: "ড্যাশবোর্ড", articles: "সব খবর", edit: "নতুন খবর", sections: "বিভাগ", settings: "সেটিংস" };
const TITLES = {
  dash: ["ড্যাশবোর্ড", "আপনার সাইটের সারসংক্ষেপ"], articles: ["সব খবর", "খবর খুঁজুন, সম্পাদনা ও প্রকাশ করুন"],
  edit: ["খবর", "শিরোনাম, ছবি ও বিস্তারিত লিখুন"], sections: ["বিভাগ", "ক্যাটাগরি ও মেনু পরিচালনা"], settings: ["সেটিংস", "সাইটের তথ্য ও নিরাপত্তা"]
};
function shell() {
  const em = user.email || "admin";
  root.innerHTML = `<aside class="sb"><div class="brand"><i>NB</i><div><b>${esc(SITE)}</b><small>অ্যাডমিন প্যানেল</small></div></div><nav class="nav"><div class="lbl">মেনু</div>${Object.entries(NAV).map(([k, v]) => `<a data-nav="${k}" href="#/${k}">${ic(k)}${v}</a>`).join("")}<div class="sp"></div><div class="lbl">অন্যান্য</div><a href="/" target="_blank">${ic("site")}সাইট দেখুন</a><a href="#" id="lo">${ic("out")}লগআউট</a></nav><div class="sbf">© ${bn(new Date().getFullYear())} ${esc(SITE)}</div></aside><div class="ov"></div>
<div class="mn"><div class="top"><button class="burger" aria-label="মেনু"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg></button><h1 id="ttl"></h1><a class="btn sm" href="#/edit">${ic("edit")} নতুন খবর</a><div class="me"><i>${esc(em[0].toUpperCase())}</i><span>${esc(em)}</span></div></div><div class="ct" id="ct"></div></div>`;
  $("#lo").onclick = e => { e.preventDefault(); signOut(auth); };
  document.body.classList.remove("menu-open");
}
const ct = () => $("#ct");
function setTitle(k, t) { const x = TITLES[k]; $("#ttl").innerHTML = `${esc(t || x[0])}<span class="sub">${esc(x[1])}</span>`; document.title = (t || x[0]) + " — অ্যাডমিন | " + SITE; document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("on", a.dataset.nav === k)); }
const done = () => { window.initAdminUI && window.initAdminUI(); window.scrollTo(0, 0); };

/* ---------- রাউটার ---------- */
let routing = 0;
async function route() {
  if (!user) return;
  const my = ++routing;
  const [p, arg] = (location.hash.replace(/^#\/?/, "") || "dash").split("/");
  const page = { dash, articles, edit, sections: sectionsPage, settings: settingsPage }[p] || dash;
  if (!$("#ttl")) shell();
  ct().innerHTML = '<p style="padding:30px;color:#64748b">লোড হচ্ছে…</p>';
  try { await page(decodeURIComponent(arg || ""), () => my === routing); } catch (e) { console.error(e); ct().innerHTML = `<div class="warn">⚠ ${esc(errMsg(e))}</div>`; }
}
window.addEventListener("hashchange", route);

/* ---------- ড্যাশবোর্ড ---------- */
async function dash(_, alive) {
  setTitle("dash");
  const since = now() - 14 * 86400;
  const [tot, pub, dr, vw, r14, topv, rec] = await Promise.all([
    getCountFromServer(A), getCountFromServer(query(A, where("status", "==", "published"))), getCountFromServer(query(A, where("status", "==", "draft"))),
    getAggregateFromServer(A, { v: sum("views") }),
    getDocs(query(A, where("published_at", ">=", since), orderBy("published_at", "desc"))),
    getDocs(query(A, orderBy("views", "desc"), limit(6))), getDocs(query(A, orderBy("published_at", "desc"), limit(6)))
  ]);
  const secCounts = await Promise.all(sections.map(s => getCountFromServer(query(A, where("section", "==", s.slug))).then(r => [s.name, r.data().count])));
  if (!alive()) return;
  // গত ১৪ দিন
  const days = [], idx = {};
  for (let i = 13; i >= 0; i--) { const p = dhaka(now() - i * 86400); const k = p.year + "-" + p.month + "-" + p.day; idx[k] = days.length; days.push([bn(p.day + "/" + p.month), 0]); }
  let week = 0;
  r14.docs.forEach(d => { const x = d.data(); const p = dhaka(x.published_at); const k = p.year + "-" + p.month + "-" + p.day; if (k in idx) days[idx[k]][1]++; if (x.published_at >= now() - 7 * 86400 && x.status === "published") week++; });
  const secs = secCounts.filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  const dsec = secs.slice(0, 6); const oth = secs.slice(6).reduce((a, b) => a + b[1], 0); if (oth) dsec.push(["অন্যান্য", oth]);
  window.ADMIN_DATA = { days, sections: dsec };
  const topA = topv.docs.map(d => ({ id: d.id, ...d.data() })); const mxv = Math.max(1, topA[0] ? topA[0].views || 0 : 1);
  const stats = [["মোট খবর", tot.data().count, "articles", "#e4262c"], ["প্রকাশিত", pub.data().count, "dash", "#10b981"], ["খসড়া", dr.data().count, "edit", "#f59e0b"], ["বিভাগ", sections.length, "sections", "#3b82f6"], ["মোট পাঠ", vw.data().v || 0, "site", "#8b5cf6"]];
  ct().innerHTML = `<div class="bx hero"><div style="position:relative;z-index:1"><h2>স্বাগতম 👋</h2><p>গত ৭ দিনে <b>${bn(week)}</b>টি খবর প্রকাশিত হয়েছে। আজ কোন খবর দিচ্ছেন?</p></div><a class="btn" href="#/edit">${ic("edit")} নতুন খবর লিখুন</a></div>
<div class="stats">${stats.map(c => `<div class="stat" style="--c:${c[3]}"><div class="ic" style="background:${c[3]}">${ic(c[2])}</div><b data-count="${c[1]}">${bn(c[1])}</b><span>${c[0]}</span></div>`).join("")}</div>
<div class="g2"><div class="bx"><h3>গত ১৪ দিনের প্রকাশনা <small>প্রতিদিন কয়টি খবর</small></h3><div class="chart" id="barChart"></div></div>
<div class="bx"><h3>বিভাগ অনুযায়ী খবর</h3>${dsec.length ? '<div class="donutw"><div id="donut"></div><div class="leg" id="donutLeg"></div></div>' : '<p style="color:#64748b">এখনো কোনো তথ্য নেই।</p>'}</div></div>
<div class="g2b"><div class="bx"><h3>সর্বাধিক পঠিত <small>পাঠ সংখ্যা</small></h3><div class="hb">${topA.map(a => `<div class="row"><a href="#/edit/${encodeURIComponent(a.id)}" title="${esc(a.headline)}">${esc(a.headline)}</a><b>${bn(a.views || 0)}</b><div class="tr"><i data-w="${Math.round((a.views || 0) / mxv * 100)}"></i></div></div>`).join("") || '<p style="color:#64748b">এখনো কোনো তথ্য নেই।</p>'}</div></div>
<div class="bx"><h3>সাম্প্রতিক খবর <small><a href="#/articles">সব দেখুন →</a></small></h3><table><tbody>${rec.docs.map(d => { const a = d.data(); return `<tr><td style="width:70px"><img class="thumb" src="${esc(img(a.image, 120))}" alt=""></td><td><a href="#/edit/${encodeURIComponent(d.id)}">${esc(a.headline)}</a><div style="color:#64748b;font-size:.8rem">${when(a.published_at)}</div></td><td>${badge(a.status)}</td></tr>`; }).join("")}</tbody></table></div></div>`;
  done();
}

/* ---------- সব খবর ---------- */
let cache = null; const F = { q: "", st: "", sec: "", page: 1 };
async function articles(_, alive) {
  setTitle("articles");
  if (!cache) { const s = await getDocs(query(A, orderBy("published_at", "desc"), limit(300))); cache = s.docs.map(d => ({ id: d.id, ...d.data() })); }
  if (!alive()) return;
  const k = F.q.trim().toLowerCase();
  const L = cache.filter(a => (!k || a.headline.toLowerCase().includes(k)) && (!F.st || a.status === F.st) && (!F.sec || a.section === F.sec));
  const pages = Math.max(1, Math.ceil(L.length / 20)); F.page = Math.min(F.page, pages);
  const rows = L.slice((F.page - 1) * 20, F.page * 20);
  ct().innerHTML = `<form class="bx filters" id="ff"><div><label>খুঁজুন</label><input name="q" value="${esc(F.q)}" placeholder="শিরোনাম লিখুন…"></div><div><label>অবস্থা</label><select name="st"><option value="">সব</option><option value="published"${F.st === "published" ? " selected" : ""}>প্রকাশিত</option><option value="draft"${F.st === "draft" ? " selected" : ""}>খসড়া</option></select></div><div><label>বিভাগ</label><select name="sec">${secOpts(F.sec)}</select></div><button class="btn">ফিল্টার</button></form>
<div class="bx"><h3>মোট ${bn(L.length)}টি খবর <small>সাম্প্রতিক ৩০০টির মধ্যে</small></h3><table><thead><tr><th></th><th>শিরোনাম</th><th>বিভাগ</th><th>তারিখ</th><th>অবস্থা</th><th>পাঠ</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td><img class="thumb" src="${esc(img(r.image, 120))}" alt=""></td><td style="min-width:240px"><a href="#/edit/${encodeURIComponent(r.id)}">${esc(r.headline)}</a></td><td>${esc(secName(r.section))}</td><td style="white-space:nowrap">${fdate(r.published_at)}</td><td>${badge(r.status)}</td><td>${bn(r.views || 0)}</td><td style="white-space:nowrap"><a class="btn g sm" href="#/edit/${encodeURIComponent(r.id)}">সম্পাদনা</a> <button class="btn g" style="padding:4px 10px" data-act="toggle" data-id="${esc(r.id)}">${r.status === "draft" ? "প্রকাশ" : "খসড়া"}</button> <button class="btn g" style="padding:4px 10px" data-act="del" data-id="${esc(r.id)}">মুছুন</button></td></tr>`).join("") || '<tr><td colspan="7" style="text-align:center;padding:30px;color:#64748b">কোনো খবর নেই।</td></tr>'}</tbody></table>
<div class="pg">${Array.from({ length: pages }, (_, i) => i + 1 === F.page ? `<b>${bn(i + 1)}</b>` : `<a href="#" data-pg="${i + 1}">${bn(i + 1)}</a>`).join("")}</div></div>`;
  $("#ff").onsubmit = e => { e.preventDefault(); const f = e.target; F.q = f.q.value; F.st = f.st.value; F.sec = f.sec.value; F.page = 1; articles(_, alive); };
  ct().querySelectorAll("[data-pg]").forEach(a => a.onclick = e => { e.preventDefault(); F.page = +a.dataset.pg; articles(_, alive); });
  ct().querySelectorAll("[data-act]").forEach(b => b.onclick = async () => {
    const id = b.dataset.id, a = cache.find(x => x.id === id);
    try {
      if (b.dataset.act === "del") { if (!confirm("এই খবর মুছে ফেলবেন?")) return; await deleteDoc(doc(db, "articles", id)); cache = cache.filter(x => x.id !== id); toast("খবর মুছে ফেলা হয়েছে।"); }
      else { const st = a.status === "draft" ? "published" : "draft"; await updateDoc(doc(db, "articles", id), { status: st }); a.status = st; }
      articles(_, alive);
    } catch (e) { toast(errMsg(e)); }
  });
  done();
}

/* ---------- নতুন / সম্পাদনা ---------- */
async function edit(id, alive) {
  let r = null;
  if (id) { const s = await getDoc(doc(db, "articles", id)); if (s.exists()) r = { id: s.id, ...s.data() }; }
  if (!alive()) return;
  r = r || { id: "", slug: "", headline: "", subheadline: "", author: "নিজস্ব প্রতিবেদক", section: "", image: "", content: "", source_url: "", published_at: now(), status: "published", views: 0 };
  setTitle("edit", r.id ? "খবর সম্পাদনা" : "নতুন খবর");
  ct().innerHTML = `<form id="af"><div class="ed"><div>
<div class="bx"><label style="margin-top:0">শিরোনাম *</label><input name="headline" value="${esc(r.headline)}" required data-max="120" placeholder="খবরের শিরোনাম"><label>উপশিরোনাম</label><input name="sub" value="${esc(r.subheadline)}"><label>বিস্তারিত <span class="cnt">HTML ব্যবহার করা যাবে</span></label><textarea name="content" rows="16">${esc(r.content)}</textarea></div>
<div class="bx"><h3>ছবি</h3><div class="r2"><div><label style="margin-top:0">ছবি আপলোড (JPG/PNG/WEBP, সর্বোচ্চ ৫MB)</label><input type="file" name="file" accept="image/*"></div><div><label style="margin-top:0">অথবা ছবির লিংক / বর্তমান ছবি</label><input name="image" value="${esc(r.image)}"></div></div><img id="imgPrev" class="prev" style="max-width:360px;${r.image ? "" : "display:none"}" src="${r.image ? esc(img(r.image, 500)) : ""}" alt=""></div></div>
<div><div class="bx"><h3>প্রকাশ</h3><label style="margin-top:0">অবস্থা</label><select name="status"><option value="published">প্রকাশিত</option><option value="draft"${r.status === "draft" ? " selected" : ""}>খসড়া</option></select><label>প্রকাশের সময় (বাংলাদেশ সময়)</label><input type="datetime-local" name="pub" value="${toDhakaInput(r.published_at)}"><br><button class="btn" id="sv" style="width:100%;justify-content:center">সংরক্ষণ করুন</button><br><a class="btn g" style="width:100%;justify-content:center;margin-top:8px" href="#/articles">বাতিল</a>${r.id ? `<br><a class="btn g" style="width:100%;justify-content:center;margin-top:8px" target="_blank" href="/article?slug=${encodeURIComponent(r.id)}">সাইটে দেখুন ↗</a>` : ""}</div>
<div class="bx"><h3>তথ্য</h3><label style="margin-top:0">বিভাগ</label><select name="sec">${secOpts(r.section)}</select><label>লেখক / প্রতিবেদক</label><input name="author" value="${esc(r.author)}"><label>স্লাগ (ইংরেজি, ফাঁকা রাখলে অটো)</label><input name="slug" value="${esc(r.id)}"><label>মূল সূত্রের লিংক</label><input name="src" value="${esc(r.source_url)}"></div></div></div></form>`;
  done();
  const f = $("#af");
  f.file.onchange = () => { if (f.file.files[0]) { const p = $("#imgPrev"); p.src = URL.createObjectURL(f.file.files[0]); p.style.display = "block"; } };
  f.onsubmit = async e => {
    e.preventDefault();
    const btn = $("#sv"); btn.disabled = true; btn.textContent = "সংরক্ষণ হচ্ছে…";
    try {
      let image = f.image.value.trim();
      const file = f.file.files[0];
      if (file) {
        if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) throw new Error("ছবি JPG/PNG/GIF/WEBP হতে হবে, সর্বোচ্চ ৫MB।");
        try {
          const ext = file.type.split("/")[1].replace("jpeg", "jpg");
          const r2 = sref(getStorage(fbApp), "uploads/" + rand(16) + "." + ext);
          await uploadBytes(r2, file); image = await getDownloadURL(r2);
        } catch (x) { throw new Error("ছবি আপলোড হয়নি (Firebase Storage চালু আছে কি?)। বিকল্প: ছবির লিংক ঘরে লিংক দিন। — " + (x.code || x.message)); }
      }
      let slug = ensureSlug(f.slug.value) || rand(10);
      if (slug !== r.id && (await getDoc(doc(db, "articles", slug))).exists()) slug += "-" + rand(4);
      const data = {
        headline: f.headline.value.trim(), subheadline: f.sub.value.trim(), author: f.author.value.trim(), section: f.sec.value || null,
        image, content: f.content.value, source_url: f.src.value.trim(), published_at: fromDhakaInput(f.pub.value),
        status: f.status.value === "draft" ? "draft" : "published", views: r.views || 0
      };
      await setDoc(doc(db, "articles", slug), data);
      if (r.id && r.id !== slug) await deleteDoc(doc(db, "articles", r.id));
      cache = null; toast("খবর সংরক্ষিত হয়েছে।"); location.hash = "#/articles";
    } catch (x) { toast(errMsg(x)); btn.disabled = false; btn.textContent = "সংরক্ষণ করুন"; }
  };
}

/* ---------- বিভাগ ---------- */
async function sectionsPage(eid, alive) {
  setTitle("sections");
  const r = sections.find(s => s.slug === eid) || { slug: "", name: "", parent: "", in_menu: true, sort: Math.max(0, ...sections.map(s => s.sort || 0)) + 1 };
  const counts = await Promise.all(sections.map(s => getCountFromServer(query(A, where("section", "==", s.slug))).then(x => x.data().count)));
  if (!alive()) return;
  ct().innerHTML = `<form class="bx" id="sf"><h3>${eid ? "বিভাগ সম্পাদনা" : "নতুন বিভাগ"}</h3><div class="r2"><div><label style="margin-top:0">নাম *</label><input name="name" value="${esc(r.name)}" required></div><div><label style="margin-top:0">স্লাগ (ইংরেজি) *${eid ? " — বদলানো যায় না" : ""}</label><input name="slug" value="${esc(r.slug)}" required ${eid ? "readonly" : ""}></div><div><label>প্যারেন্ট বিভাগ</label><select name="parent">${secOpts(r.parent, r.slug)}</select></div><div><label>ক্রম</label><input type="number" name="sort" value="${r.sort}"></div></div><label style="font-weight:400"><input type="checkbox" name="menu" ${r.in_menu ? "checked" : ""}> মেনুতে দেখান</label><br><button class="btn">সংরক্ষণ</button>${eid ? ' <a class="btn g" href="#/sections">বাতিল</a>' : ""}</form>
<div class="bx"><h3>সব বিভাগ</h3><table><thead><tr><th>নাম</th><th>স্লাগ</th><th>প্যারেন্ট</th><th>মেনু</th><th>ক্রম</th><th>খবর</th><th></th></tr></thead><tbody>${sections.map((s, i) => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.slug)}</td><td>${esc(secName(s.parent))}</td><td><span class="bd ${s.in_menu ? "" : "d"}">${s.in_menu ? "হ্যাঁ" : "না"}</span></td><td>${bn(s.sort)}</td><td>${bn(counts[i])}</td><td style="white-space:nowrap"><a class="btn g sm" href="#/sections/${encodeURIComponent(s.slug)}">সম্পাদনা</a> <button class="btn g" style="padding:4px 10px" data-del="${esc(s.slug)}">মুছুন</button></td></tr>`).join("")}</tbody></table></div>`;
  done();
  $("#sf").onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    const slug = ensureSlug(f.slug.value), name = f.name.value.trim();
    if (!slug || !name) return toast("নাম ও স্লাগ (ইংরেজিতে) দিন।");
    if (!eid && sections.some(s => s.slug === slug)) return toast("এই স্লাগ আগে থেকেই আছে।");
    let parent = f.parent.value || null; if (parent === slug) parent = null;
    try {
      await setDoc(doc(db, "sections", slug), { name, parent, in_menu: f.menu.checked, sort: parseInt(f.sort.value || "0", 10) || 0 });
      await loadMeta(); toast("বিভাগ সংরক্ষিত হয়েছে।"); location.hash = "#/sections"; route();
    } catch (x) { toast(errMsg(x)); }
  };
  ct().querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (!confirm("বিভাগটি মুছবেন? খবরগুলো বিভাগহীন হয়ে যাবে।")) return;
    const slug = b.dataset.del;
    try {
      const arts = await getDocs(query(A, where("section", "==", slug)));
      const batch = writeBatch(db);
      arts.docs.slice(0, 400).forEach(d => batch.update(d.ref, { section: null }));
      sections.filter(s => s.parent === slug).forEach(s => batch.update(doc(db, "sections", s.slug), { parent: null }));
      batch.delete(doc(db, "sections", slug)); await batch.commit();
      cache = null; await loadMeta(); toast("বিভাগ মুছে ফেলা হয়েছে।"); route();
    } catch (x) { toast(errMsg(x)); }
  });
}

/* ---------- সেটিংস ---------- */
async function settingsPage(_, alive) {
  setTitle("settings");
  const fields = { site_name: "সাইটের নাম", logo: "লোগো ইউআরএল", copyright: "কপিরাইট লেখা", per_page: "প্রতি পেজে খবর (কমপক্ষে ৫)", facebook: "ফেসবুক লিংক", twitter: "টুইটার লিংক", youtube: "ইউটিউব লিংক", instagram: "ইনস্টাগ্রাম লিংক" };
  ct().innerHTML = `<form class="bx" id="stf"><h3>সাইটের তথ্য</h3><div class="r2">${Object.entries(fields).map(([k, l]) => `<div><label>${l}</label><input name="${k}" value="${esc(settings[k] ?? "")}"></div>`).join("")}</div><br><button class="btn">সংরক্ষণ</button></form>
<form class="bx" id="pwf"><h3>পাসওয়ার্ড পরিবর্তন</h3><div class="r2"><div><label>বর্তমান পাসওয়ার্ড</label><input type="password" name="old" required autocomplete="current-password"></div><div></div><div><label>নতুন পাসওয়ার্ড</label><input type="password" name="new" required autocomplete="new-password"></div><div><label>নতুন পাসওয়ার্ড আবার</label><input type="password" name="new2" required autocomplete="new-password"></div></div><br><button class="btn">পরিবর্তন করুন</button></form>
<div class="bx"><h3>ডেমো ডাটা ইমপোর্ট</h3><p style="color:#64748b;margin-top:0">প্রথমবার সেটআপের পর এক ক্লিকে ১৮টি বিভাগ, ৩০টি নমুনা খবর ও ডিফল্ট সেটিংস Firestore-এ বসান। একই স্লাগের খবর/বিভাগ থাকলে ওভাররাইট হবে।</p><button class="btn" id="seed">ডেমো ডাটা ইমপোর্ট করুন</button></div>`;
  done();
  $("#stf").onsubmit = async e => {
    e.preventDefault(); const f = e.target; const d = {};
    Object.keys(fields).forEach(k => d[k] = f[k].value.trim());
    d.per_page = String(Math.max(5, parseInt(d.per_page || "20", 10) || 20));
    try { await setDoc(doc(db, "settings", "site"), d); await loadMeta(); toast("সেটিংস সংরক্ষিত হয়েছে।"); } catch (x) { toast(errMsg(x)); }
  };
  $("#pwf").onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    if (f.new.value.length < 6 || f.new.value !== f.new2.value) return toast("নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে এবং দুটি মিলতে হবে।");
    try { await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, f.old.value)); await updatePassword(user, f.new.value); f.reset(); toast("পাসওয়ার্ড পরিবর্তন হয়েছে।"); }
    catch (x) { toast("বর্তমান পাসওয়ার্ড ভুল অথবা পরিবর্তন করা যায়নি।"); }
  };
  $("#seed").onclick = async () => {
    if (!confirm("ডেমো ডাটা ইমপোর্ট করবেন?")) return;
    try {
      const D = await (await fetch("/admin/seed.json")).json();
      let batch = writeBatch(db), n = 0; const flush = async () => { await batch.commit(); batch = writeBatch(db); n = 0; };
      for (const [slug, s] of Object.entries(D.sections)) { batch.set(doc(db, "sections", slug), s); if (++n >= 400) await flush(); }
      for (const a of D.articles) { const { slug, ...rest } = a; batch.set(doc(db, "articles", slug), rest); if (++n >= 400) await flush(); }
      batch.set(doc(db, "settings", "site"), D.settings); await flush();
      cache = null; await loadMeta(); toast("ডেমো ডাটা ইমপোর্ট হয়েছে।"); route();
    } catch (x) { toast(errMsg(x)); }
  };
}

/* ---------- শুরু ---------- */
onAuthStateChanged(auth, async u => {
  user = u;
  if (!u) { root.innerHTML = ""; try { const s = await getDoc(doc(db, "settings", "site")); if (s.exists()) SITE = s.data().site_name || SITE; } catch (e) {} return loginView(); }
  try { await loadMeta(); } catch (e) { console.error(e); }
  shell(); route();
});
