/* ================= CONFIG =================
 * ตั้งค่า owner/repo/branch และโฟลเดอร์ที่ต้องการ auto-index
 * โค้ดจะพยายาม auto-detect จาก URL GitHub Pages ให้อัตโนมัติ
 * แต่ควรเติมให้ชัดเจนไว้ก่อน
 */
const CONFIG = {
  owner: "muaxzinn",               // ใส่เช่น "mangdev"
  repo:  "ROVPBMO",               // ใส่เช่น "media-hub"
  branch:"main",           // หรือ "gh-pages"
  basePaths: [
    "assets/img",
    "assets/video",
    "assets/audio",
    "assets/docs",
    "projects"
  ],
  social: {
    facebookHandle: "firman development",
    instagramHandle: "mang_agm",
    email: "firman.awea@gmail.com",
    phone: "0917257551"
  }
};

/* ===== Auto-detect owner/repo จาก GitHub Pages URL (ถ้ายังไม่ตั้ง) ===== */
(function autoDetect(){
  try{
    const host = location.host;      // ex: user.github.io
    const path = location.pathname;  // ex: /repo/
    if ((!CONFIG.owner || !CONFIG.repo) && host.endsWith("github.io")){
      const owner = host.split(".")[0];
      const repo = (path || "/").split("/").filter(Boolean)[0] || ""; // อาจว่างถ้าใช้ user site
      if (!CONFIG.owner) CONFIG.owner = owner;
      if (!CONFIG.repo && repo) CONFIG.repo = repo;
    }
    // อนุญาต override ผ่าน query เช่น ?owner=x&repo=y&branch=z
    const params = new URLSearchParams(location.search);
    if (params.get("owner")) CONFIG.owner = params.get("owner");
    if (params.get("repo")) CONFIG.repo = params.get("repo");
    if (params.get("branch")) CONFIG.branch = params.get("branch");
  }catch(_){}
})();

const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
$("#year").textContent = new Date().getFullYear();

// สร้างลิงก์สังคมและ repo
(function initLinks(){
  const GH_REPO_URL = `https://github.com/${CONFIG.owner}/${CONFIG.repo}`;
  const fb = encodeURIComponent(CONFIG.social.facebookHandle.trim());
  $("#repoLink").href = GH_REPO_URL;
  $("#fbLink").href   = `https://facebook.com/${fb}`;
  $("#igLink").href   = `https://instagram.com/${encodeURIComponent(CONFIG.social.instagramHandle.trim())}`;
  $("#mailLink").href = `mailto:${CONFIG.social.email}`;
  $("#telLink").href  = `tel:${CONFIG.social.phone}`;

  // การ์ดโฟลเดอร์หลัก
  const folderCards = $("#folderCards");
  CONFIG.basePaths.forEach(bp => {
    const a = document.createElement("a");
    a.className = "group rounded-2xl p-5 bg-card/60 border border-white/10 hover:border-brand/40 hover:bg-card transition shadow-glow";
    const icon = bp.includes("img") ? "🖼️" : bp.includes("video") ? "🎬" : bp.includes("audio") ? "🎧" : bp.includes("doc") ? "📄" : "🗂️";
    a.href = `${GH_REPO_URL}/tree/${CONFIG.branch}/${bp}`;
    a.target = "_blank";
    a.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-brand/15 flex items-center justify-center">${icon}</div>
        <div>
          <div class="font-semibold">${bp}</div>
          <div class="text-xs text-muted group-hover:text-text/80">ดูใน GitHub</div>
        </div>
      </div>`;
    folderCards.appendChild(a);
  });
})();

/* ===== GitHub API ===== */
const API_TREE = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/git/trees/${CONFIG.branch}?recursive=1`;
const RAW_BASE = `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/${CONFIG.branch}/`;

const IMAGE_EXT = ["png","jpg","jpeg","gif","webp","avif","svg","bmp","tiff","heic","ico","jfif","pjpeg","pjp","apng"];
const VIDEO_EXT = ["mp4","webm","mov","mkv","m4v","avi","flv","wmv","mpeg","mpg","3gp","3g2","ogv","ts"];
const AUDIO_EXT = ["mp3","wav","ogg","m4a","flac","aac","wma","alac","opus","amr"];
const DOC_EXT   = ["pdf","txt","md","csv","xls","xlsx","doc","docx","ppt","pptx","odt","ods","odp","rtf","epub"];

function extOf(path){ const m = path.toLowerCase().match(/\.([a-z0-9]+)$/); return m?m[1]:""; }
function typeOf(path){
  const e = extOf(path);
  if (IMAGE_EXT.includes(e)) return "image";
  if (VIDEO_EXT.includes(e)) return "video";
  if (AUDIO_EXT.includes(e)) return "audio";
  if (DOC_EXT.includes(e))   return "doc";
  return "other";
}
function isUnderBase(path){
  return CONFIG.basePaths.some(bp => path.startsWith(bp.replace(/\/+$/,"") + "/"));
}
function fileName(path){ return decodeURIComponent(path.split("/").pop() || path); }
function rawURL(path){ return RAW_BASE + path; }

let TREE = null;
let MEDIA = [];
let FILTER = "all";
let QUERY  = "";
let VIEW_IDX = -1;

async function loadTree(){
  const res = await fetch(API_TREE, { headers: { "Accept": "application/vnd.github+json" }});
  if (!res.ok){
    const t = await res.text().catch(()=> "");
    throw new Error(`GitHub API ${res.status}: ${t.slice(0,200)}`);
  }
  const data = await res.json();
  if (data.truncated) $("#truncatedNote").classList.remove("hidden");
  return data;
}
function buildMedia(tree){
  const files = tree.tree.filter(n => n.type === "blob" && isUnderBase(n.path));
  MEDIA = files.map(n => ({ type: typeOf(n.path), path: n.path, url: rawURL(n.path), title: fileName(n.path) }))
               .filter(it => it.type !== "other");
}

/* ===== Render grid ===== */
function matchFilter(it){
  const ok = (FILTER === "all") || (it.type === FILTER);
  if (!ok) return false;
  if (!QUERY) return true;
  const q = QUERY.toLowerCase();
  return it.title.toLowerCase().includes(q) || it.path.toLowerCase().includes(q);
}

function renderGrid(){
  const grid = $("#mediaGrid");
  grid.innerHTML = "";
  const data = MEDIA.filter(matchFilter);
  if (data.length === 0){ $("#emptyState").classList.remove("hidden"); return; }
  $("#emptyState").classList.add("hidden");

  data.forEach((it, idx) => {
    const isImg = it.type === "image";
    const icon = it.type === "video" ? "🎬" : it.type === "audio" ? "🎧" : it.type === "doc" ? "📄" : "🖼️";
    const card = document.createElement("div");
    card.className = "group rounded-2xl overflow-hidden bg-card/70 border border-white/10 hover:border-brand/40 hover:bg-card transition shadow-glow";
    card.innerHTML = `
      <div class="relative">
        ${isImg
          ? `<img src="${it.url}" alt="${it.title}" class="w-full aspect-[4/3] object-cover group-hover:opacity-95 transition" loading="lazy">`
          : `<div class="w-full aspect-[4/3] flex items-center justify-center text-5xl">${icon}</div>`
        }
        <div class="absolute right-2 top-2 flex gap-1">
          <button class="copy-link px-2 py-1 rounded-lg bg-card/80 border border-white/10 text-[11px] hover:border-brand/50" data-url="${it.url}">คัดลอกลิงก์</button>
        </div>
      </div>
      <div class="p-3">
        <div class="font-semibold text-sm line-clamp-1" title="${it.title}">${it.title}</div>
        <div class="mt-1 text-xs text-muted line-clamp-1">${it.path}</div>
        <div class="mt-3 flex gap-2">
          ${isImg
            ? `<button class="view-btn btn-secondary text-sm" data-idx="${idx}">ดูรูป</button>`
            : `<a class="btn-secondary text-sm" href="https://github.com/${CONFIG.owner}/${CONFIG.repo}/blob/${CONFIG.branch}/${it.path}" target="_blank" rel="noopener">เปิดไฟล์</a>`
          }
          <a class="btn-secondary text-sm" href="${it.url}" download>ดาวน์โหลด</a>
        </div>
      </div>`;
    grid.appendChild(card);
  });

  $$(".copy-link").forEach(btn => btn.addEventListener("click", () => {
    const url = btn.getAttribute("data-url");
    navigator.clipboard.writeText(url).then(()=>{
      btn.textContent = "คัดลอกแล้ว!";
      setTimeout(()=> btn.textContent = "คัดลอกลิงก์", 1200);
    });
  }));
  $$(".view-btn").forEach(btn => btn.addEventListener("click", () => {
    VIEW_IDX = Number(btn.getAttribute("data-idx"));
    openViewer(VIEW_IDX);
  }));
}

/* ===== Lightbox ===== */
const dialog = $("#viewer");
const viewerImg = $("#viewerImg");
const viewerCaption = $("#viewerCaption");

function openViewer(idx){
  const list = MEDIA.filter(matchFilter);
  const it = list[idx];
  if (!it) return;
  viewerImg.src = it.url;
  viewerImg.alt = it.title || "";
  viewerCaption.textContent = it.title || "";
  if (!dialog.open) dialog.showModal();
}
$("#prevBtn").addEventListener("click", () => {
  const list = MEDIA.filter(matchFilter);
  if (!list.length) return;
  VIEW_IDX = (VIEW_IDX - 1 + list.length) % list.length;
  openViewer(VIEW_IDX);
});
$("#nextBtn").addEventListener("click", () => {
  const list = MEDIA.filter(matchFilter);
  if (!list.length) return;
  VIEW_IDX = (VIEW_IDX + 1) % list.length;
  openViewer(VIEW_IDX);
});
document.addEventListener("keydown", e => {
  if (!dialog.open) return;
  if (e.key === "ArrowLeft")  $("#prevBtn").click();
  if (e.key === "ArrowRight") $("#nextBtn").click();
  if (e.key === "Escape")     dialog.close();
});

/* ===== Filters & Search ===== */
$$(".filter-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    $$(".filter-chip").forEach(c => c.classList.remove("ring","ring-brand/40"));
    chip.classList.add("ring","ring-brand/40");
    FILTER = chip.getAttribute("data-filter");
    renderGrid();
  });
});
$("#searchBox").addEventListener("input", e => { QUERY = e.target.value.trim(); renderGrid(); });

/* ===== Init ===== */
(async function init(){
  try{
    const tree = await loadTree();
    TREE = tree;
    buildMedia(tree);
    renderGrid();
  }catch(err){
    const grid = $("#mediaGrid");
    grid.innerHTML = `<div class="col-span-full text-red-300 text-sm p-4 rounded-xl bg-red-950/30 border border-red-500/30">
      โหลดรายการไฟล์จาก GitHub API ไม่ได้.<br/>
      <code>${(err && err.message) ? err.message : err}</code><br/>
      ตรวจสอบว่า repo เป็น Public และตั้งค่า CONFIG.owner/repo/branch ถูกต้อง
    </div>`;
  }
})();
