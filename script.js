"use strict";
/* ========== DATA (edit sesuai kebutuhanmu) ========== */
const projects = [
  {name:"Website Portofolio", icon:"🌐", desc:"Website pribadi untuk profil dan pengumpulan tugas.", tech:["HTML","CSS","JavaScript"], link:"#home"},
  {name:"Aplikasi To-Do List", icon:"✅", desc:"Aplikasi pencatat tugas harian sederhana.", tech:["HTML","JavaScript"], link:"https://github.com/laur4zh-del"},
  {name:"Kalkulator Python", icon:"🧮", desc:"Kalkulator berbasis terminal untuk tugas pemrograman dasar.", tech:["Python"], link:"https://github.com/laur4zh-del"}
];
const courses = ["Trend Teknologi Informasi"];
const STATUSES = ["Draf","Terkumpul","Direvisi","Dinilai"];
const ALLOWED = ["pdf","doc","docx","ppt","pptx","xls","xlsx","zip","jpg","jpeg","png"];
const MAX_MB = 50;

const $ = id => document.getElementById(id);
let activeCourse = courses[0];

/* ========== NAVIGASI, TEMA, ANIMASI ========== */
$("menuBtn").onclick = () => $("menu").classList.toggle("open");
$("menu").onclick = e => { if (e.target.tagName === "A") $("menu").classList.remove("open"); };
$("year").textContent = new Date().getFullYear();

// Tema terang/gelap (disimpan di localStorage jika tersedia)
function setTheme(t){
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("theme", t); } catch(e) {}
}
let saved = null; try { saved = localStorage.getItem("theme"); } catch(e) {}
setTheme(saved || "light");
$("themeBtn").onclick = () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");

// Animasi muncul saat scroll + highlight menu aktif
const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (en.isIntersecting){
    en.target.classList.add("visible");
    document.querySelectorAll("nav a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
  }
}), {threshold:.25});
document.querySelectorAll(".reveal").forEach(s => io.observe(s));

function toast(msg){
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}
// Cegah HTML injection dari nama file
const esc = s => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* ========== PORTFOLIO ========== */
$("projectGrid").innerHTML = projects.map(p => `
  <article class="card">
    <div class="thumb">${p.icon}</div>
    <h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p>
    <div class="tags">${p.tech.map(t => `<span>${esc(t)}</span>`).join("")}</div>
    <a class="btn" href="${p.link}" ${p.link.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>Lihat Proyek</a>
  </article>`).join("");

/* ========== SUPABASE (isi 2 nilai ini, lihat panduan) ========== */
const SUPABASE_URL = "https://nnyiszwtrpjglljrhorv.supabase.co";   // Project URL
const SUPABASE_KEY = "sb_publishable_QRgFEksqS0iV82KjOAShzg_XClG5IHh";        // anon / publishable key
const BUCKET = "tugas";

let sb = null, isOwner = false;
if (SUPABASE_URL.includes("XXXX")) {
  $("note").textContent = "⚠️ Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_KEY di script.js.";
} else {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Tampilkan pesan error asli supaya mudah dilacak
const fail = (msg, err) => { console.error(err); toast(msg + (err && err.message ? ": " + err.message : "")); };

/* ========== LOGIN PEMILIK ========== */
function applyAuth(){
  $("uploadBtn").hidden = !isOwner;
  $("loginBtn").textContent = isOwner ? "🔓 Logout" : "🔒 Login Pemilik";
  renderFiles();
}
$("loginBtn").onclick = async () => {
  if (!sb) return toast("Supabase belum dikonfigurasi");
  if (isOwner) { await sb.auth.signOut(); isOwner = false; applyAuth(); }
  else $("loginForm").hidden = !$("loginForm").hidden;
};
$("loginForm").onsubmit = async e => {
  e.preventDefault();
  const { error } = await sb.auth.signInWithPassword({ email: $("lEmail").value, password: $("lPass").value });
  if (error) return fail("Login gagal", error);
  isOwner = true; $("loginForm").hidden = true; $("lPass").value = ""; applyAuth(); toast("Login berhasil");
};

/* ========== DAFTAR MATA KULIAH & FILE ========== */
function renderCourses(){
  $("courseList").innerHTML = courses.map(c =>
    `<li data-c="${esc(c)}" class="${c === activeCourse ? "active" : ""}">📁 ${esc(c)}</li>`).join("");
}
$("courseList").onclick = e => {
  const li = e.target.closest("li"); if (!li) return;
  activeCourse = li.dataset.c; renderCourses(); renderFiles();
};

async function renderFiles(){
  if (!sb) return;
  const { data, error } = await sb.from("tugas").select("*").order("created_at", { ascending: false });
  if (error) return fail("Gagal memuat daftar tugas", error);
  const q = $("search").value.trim().toLowerCase();
  const list = data.filter(f => (activeCourse === "Semua" || f.course === activeCourse) && f.name.toLowerCase().includes(q));
  $("courseTitle").textContent = "📂 " + activeCourse + " (" + list.length + " file)";
  $("empty").hidden = list.length > 0;
  $("fileBody").innerHTML = list.map(f => `
    <tr>
      <td>📄 ${esc(f.name)}</td><td>${esc(f.course)}</td>
      <td>${new Date(f.created_at).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"})}</td>
      <td><select class="st" data-id="${f.id}" ${isOwner ? "" : "disabled"}>${STATUSES.map(s => `<option ${s === f.status ? "selected" : ""}>${s}</option>`).join("")}</select></td>
      <td><button class="btn sm" data-act="dl" data-id="${f.id}" data-path="${esc(f.path)}" data-name="${esc(f.name)}">Unduh</button>
          ${isOwner ? `<button class="btn sm" data-act="rm" data-id="${f.id}" data-path="${esc(f.path)}" data-name="${esc(f.name)}">Hapus</button>` : ""}</td>
    </tr>`).join("");
}
$("search").oninput = renderFiles;
$("uploadBtn").onclick = () => $("fileInput").click();

/* ========== UPLOAD (hanya pemilik) ========== */
$("fileInput").onchange = async e => {
  const course = activeCourse === "Semua" ? "Lainnya" : activeCourse;
  let ok = 0;
  for (const file of e.target.files){
    const ext = file.name.split(".").pop().toLowerCase();
    if (!ALLOWED.includes(ext)) { toast("Format ." + ext + " tidak didukung"); continue; }
    if (file.size > MAX_MB * 1048576) { toast(file.name + " melebihi " + MAX_MB + " MB"); continue; }
    // Nama di storage dibuat aman (tanpa spasi/simbol); nama asli disimpan di tabel
    const path = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    toast("Mengunggah " + file.name + "…");
    const up = await sb.storage.from(BUCKET).upload(path, file);
    if (up.error) { fail("Upload gagal", up.error); continue; }
    const ins = await sb.from("tugas").insert({ name: file.name, course, path, status: "Terkumpul" });
    if (ins.error) { await sb.storage.from(BUCKET).remove([path]); fail("Gagal menyimpan data", ins.error); continue; }
    ok++;
  }
  e.target.value = "";
  if (ok) toast(ok + " file berhasil diunggah");
  renderFiles();
};

/* ========== UNDUH & HAPUS ========== */
$("fileBody").onclick = async e => {
  const b = e.target.closest("button"); if (!b) return;
  const { id, path, name } = b.dataset;
  if (b.dataset.act === "dl"){
    const { data, error } = await sb.storage.from(BUCKET).download(path);
    if (error) return fail("Unduh gagal", error);
    const url = URL.createObjectURL(data), a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else if (isOwner && confirm('Hapus "' + name + '"?')){
    const r1 = await sb.storage.from(BUCKET).remove([path]);
    if (r1.error) return fail("Hapus file gagal", r1.error);
    const r2 = await sb.from("tugas").delete().eq("id", id);
    if (r2.error) return fail("Hapus data gagal", r2.error);
    toast("File dihapus"); renderFiles();
  }
};
// Ubah status (hanya pemilik)
$("fileBody").onchange = async e => {
  if (!e.target.classList.contains("st") || !isOwner) return;
  const { error } = await sb.from("tugas").update({ status: e.target.value }).eq("id", e.target.dataset.id);
  if (error) fail("Gagal ubah status", error); else toast("Status diperbarui");
};

/* ========== KONTAK (membuka aplikasi email) ========== */
$("contactForm").onsubmit = e => {
  e.preventDefault();
  const body = $("cMsg").value + "\n\nDari: " + $("cName").value + " (" + $("cEmail").value + ")";
  location.href = "mailto:laur4.z.h@gmail.com?subject=" + encodeURIComponent("Pesan dari " + $("cName").value) + "&body=" + encodeURIComponent(body);
  toast("Membuka aplikasi email…");
};

/* ========== MULAI ========== */
renderCourses();
if (sb) {
  sb.auth.getSession().then(({ data }) => { isOwner = !!data.session; applyAuth(); });
}
