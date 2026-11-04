(() => {
"use strict";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const r1 = n => Math.round((+n || 0) * 10) / 10;
const ymd = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const DEFAULT_GOALS = {kcal:2200, p:150, c:220, f:70};
const OFF = "https://world.openfoodfacts.org";
const FIELDS = "code,product_name,brands,serving_size,nutriments";

let day = new Date(); day.setHours(12,0,0,0);
let entries = [], goals = {...DEFAULT_GOALS};

/* ---------- storage (this device) ---------- */
const store = {
  read(k,d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d }catch{ return d } },
  write(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true }catch{ return false } },
  all(){ return this.read("ms-entries", []) },
  list(date){ return this.all().filter(e => e.date === date) },
  add(e){ const a = this.all(); e.id = Date.now().toString(36)+Math.random().toString(36).slice(2,6); a.push(e); return this.write("ms-entries", a) },
  remove(id){ this.write("ms-entries", this.all().filter(e => e.id !== id)) },
  recent(){ const seen = new Set(), out = [];
    for (const e of this.all().sort((a,b)=>(b.ts||0)-(a.ts||0))){ const k = e.name.toLowerCase(); if (!seen.has(k)){ seen.add(k); out.push(e) } if (out.length >= 12) break }
    return out },
};
try{ navigator.storage?.persist?.() }catch{}

/* ---------- render ---------- */
function totals(){ return entries.reduce((t,e)=>{ const s=+e.servings||1; t.kcal+=e.kcal*s; t.p+=e.p*s; t.c+=e.c*s; t.f+=e.f*s; return t }, {kcal:0,p:0,c:0,f:0}) }
function render(){
  const isToday = ymd(day) === ymd(new Date());
  $("#dayTitle").innerHTML = (isToday ? "Today" : day.toLocaleDateString(undefined,{weekday:"long"})) +
    `<small>${day.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</small>`;
  $("#nextDay").disabled = isToday;
  const t = totals();
  $("#calNum").textContent = Math.round(t.kcal).toLocaleString();
  $("#calGoal").textContent = (+goals.kcal||0).toLocaleString();
  $("#itemCount").textContent = entries.length + (entries.length===1 ? " item logged" : " items logged");
  $("#macros").innerHTML = [["Protein","p","--pro"],["Total Carbohydrate","c","--carb"],["Total Fat","f","--fat"]].map(([label,k,col])=>{
    const g = +goals[k]||0, v = t[k], pct = g ? Math.round(v/g*100) : 0;
    return `<div class="macro ${pct>100?"over":""}"><div><b>${label}</b> <span class="g">${r1(v)}g <small>/ ${g}g</small></span></div>
      <div class="pct">${pct}%</div><div class="bar"><i style="width:${Math.min(pct,100)}%;background:var(${col})"></i></div></div>`;
  }).join("");
  const left = (+goals.kcal||0) - t.kcal;
  $("#leftLine").textContent = left >= 0
    ? `${Math.round(left).toLocaleString()} calories left · ${Math.max(0,Math.round((goals.p||0)-t.p))}g protein to go`
    : `${Math.round(-left).toLocaleString()} calories over goal`;
  $("#log").innerHTML = entries.sort((a,b)=>(a.ts||0)-(b.ts||0)).map(e=>{
    const s = +e.servings||1;
    const when = e.ts ? new Date(e.ts).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"}) : "";
    return `<li><div class="nm">${esc(e.name)}<small>${s===1?"1 serving":r1(s)+" servings"}${e.serving?" · "+esc(e.serving):""}${when?" · "+when:""}</small></div>
      <div class="kc">${Math.round(e.kcal*s)}<small> kcal</small></div>
      <div class="chips"><span class="p">P ${r1(e.p*s)}g</span><span class="c">C ${r1(e.c*s)}g</span><span class="f">F ${r1(e.f*s)}g</span></div>
      <button class="del" data-id="${esc(e.id)}">Remove</button></li>`;
  }).join("");
  $("#empty").hidden = entries.length > 0;
  $("#empty").innerHTML = isToday ? "<b>Nothing logged yet</b>Scan a barcode below to add your first food." : "<b>Nothing logged this day</b>";
  $("#logHint").hidden = !entries.length;
}
function load(){ entries = store.list(ymd(day)); render() }

$("#prevDay").onclick = () => { day.setDate(day.getDate()-1); load() };
$("#nextDay").onclick = () => { day.setDate(day.getDate()+1); load() };
$("#log").addEventListener("click", ev => {
  const b = ev.target.closest(".del"); if (!b) return;
  if (!b.classList.contains("armed")){ b.classList.add("armed"); b.textContent = "Tap to confirm"; setTimeout(()=>{ b.classList.remove("armed"); b.textContent="Remove" }, 3000); return }
  store.remove(b.dataset.id); load();
});

/* ---------- goals + backup ---------- */
function fillGoals(){ $("#gKcal").value=goals.kcal; $("#gP").value=goals.p; $("#gC").value=goals.c; $("#gF").value=goals.f }
["#gKcal","#gP","#gC","#gF"].forEach(id => $(id).addEventListener("input", () => {
  goals = {kcal:+$("#gKcal").value||0, p:+$("#gP").value||0, c:+$("#gC").value||0, f:+$("#gF").value||0};
  store.write("ms-goals", goals); render();
}));
function download(name, text, type){
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text],{type})); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove() }, 1000);
}
$("#exportJson").onclick = () => download(`macro-scan-backup-${ymd(new Date())}.json`, JSON.stringify({version:1, goals, entries:store.all()}, null, 1), "application/json");
$("#exportCsv").onclick = () => {
  const rows = [["date","time","food","serving","servings","calories","protein_g","carbs_g","fat_g","barcode"]];
  for (const e of store.all().sort((a,b)=>(a.ts||0)-(b.ts||0))){ const s=+e.servings||1;
    rows.push([e.date, e.ts?new Date(e.ts).toLocaleTimeString():"", e.name, e.serving||"", s, Math.round(e.kcal*s), r1(e.p*s), r1(e.c*s), r1(e.f*s), e.code||""]) }
  download(`macro-scan-${ymd(new Date())}.csv`, rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n"), "text/csv");
};
$("#importFile").addEventListener("change", async ev => {
  const f = ev.target.files[0]; ev.target.value = ""; if (!f) return;
  try{
    const j = JSON.parse(await f.text()); if (!Array.isArray(j.entries)) throw 0;
    const have = new Set(store.all().map(e=>e.id)); const merged = store.all().concat(j.entries.filter(e=>!have.has(e.id)));
    store.write("ms-entries", merged); if (j.goals){ goals = {...DEFAULT_GOALS, ...j.goals}; store.write("ms-goals", goals); fillGoals() }
    $("#toolMsg").textContent = `Restored. ${merged.length} entries on this phone now.`; load();
  }catch{ $("#toolMsg").textContent = "That file isn't a Macro Scan backup." }
});

/* ---------- sheet ---------- */
const veil = $("#veil"), sheet = $("#sheet");
const actions = { close: () => closeSheet() };
function openSheet(html){ sheet.innerHTML = html; veil.hidden = false; sheet.scrollTop = 0 }
function closeSheet(){ veil.hidden = true; sheet.innerHTML = "" }
veil.addEventListener("click", e => { if (e.target === veil) closeSheet() });
document.addEventListener("keydown", e => { if (e.key === "Escape"){ if (!$("#cam").hidden) stopCam(); else if (!veil.hidden) closeSheet() } });
sheet.addEventListener("click", e => { const a = e.target.closest("[data-act]"); if (a) actions[a.dataset.act]?.(a) });
const busy = (title, msg) => openSheet(`<h4>${esc(title)}</h4><div class="status"><span class="spin"></span>${esc(msg)}</div>`);

function addSheet(code, why, query){
  const recent = store.recent();
  openSheet(`<h4>${code ? `Barcode <span class="code">${esc(code)}</span>` : "Add food"}</h4>
    ${why ? `<div class="status err">${esc(why)}</div>` : ""}
    <form class="searchrow" id="searchForm"><input id="q" type="search" placeholder="Search foods, e.g. Chobani vanilla" value="${esc(query||"")}" autocomplete="off"><button>Search</button></form>
    <ul class="results" id="results"></ul>
    ${recent.length ? `<div><p class="note" style="margin:0 0 6px">Log again</p><div class="recent">${recent.map((e,i)=>`<button data-act="again" data-i="${i}">${esc(e.name)}</button>`).join("")}</div></div>` : ""}
    <button class="opt" data-act="manual"><b>Enter the numbers myself</b><span>Type calories, protein, carbs and fat from the label.</span></button>
    <button class="link" data-act="close">Cancel</button>`);
  actions.again = b => { const e = recent[+b.dataset.i]; confirmSheet({...e, src:"Logged before"}) };
  actions.manual = () => confirmSheet({name:$("#q")?.value.trim()||"", code, kcal:0,p:0,c:0,f:0, src:"Manual"});
  $("#searchForm").addEventListener("submit", ev => { ev.preventDefault(); search($("#q").value.trim(), code) });
  if (query) search(query, code);
}

function fromOFF(p, code){
  const n = p.nutriments || {};
  const hasServing = n["energy-kcal_serving"] != null;
  const per = hasServing ? "_serving" : "_100g";
  return { name:[p.brands?.split(",")[0]?.trim(), p.product_name].filter(Boolean).join(" ") || "Unnamed product",
    serving: hasServing ? (p.serving_size || "1 serving") : "100 g",
    kcal:+n["energy-kcal"+per] || (+n["energy"+per] ? n["energy"+per]/4.184 : 0),
    p:+n["proteins"+per]||0, c:+n["carbohydrates"+per]||0, f:+n["fat"+per]||0,
    code: p.code || code || "", src:"Open Food Facts" };
}
async function getJSON(url, ms=8000){
  const ctl = new AbortController(); const t = setTimeout(()=>ctl.abort(), ms);
  try{ const r = await fetch(url, {signal:ctl.signal}); if (!r.ok) throw new Error(r.status); return await r.json() }
  finally{ clearTimeout(t) }
}
async function search(q, code){
  const box = $("#results"); if (!q){ $("#q").focus(); return }
  box.innerHTML = `<li class="status"><span class="spin"></span>Searching…</li>`;
  try{
    const j = await getJSON(`${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=${FIELDS}`, 12000);
    const items = (j.products||[]).map(p=>fromOFF(p)).filter(x => x.kcal || x.p || x.c || x.f);
    if (!items.length){ box.innerHTML = `<li class="note">No matches with nutrition info. Try fewer words, or enter it yourself.</li>`; return }
    box.innerHTML = items.map((x,i)=>`<li><button data-act="pick" data-i="${i}"><b>${esc(x.name)}</b><span>${esc(x.serving)} · P ${r1(x.p)} C ${r1(x.c)} F ${r1(x.f)}</span><em>${Math.round(x.kcal)} kcal</em></button></li>`).join("");
    actions.pick = b => confirmSheet({...items[+b.dataset.i], code: code || items[+b.dataset.i].code});
  }catch{ box.innerHTML = `<li class="status err">Search didn't respond. Check your connection and try again.</li>` }
}

function confirmSheet(food){
  let servings = 1;
  openSheet(`<div><span class="badge ok">${esc(food.src||"Found")}</span></div>
    <h4>${esc(food.name||"New food")}</h4>
    <label class="f">Food name<input id="cName" value="${esc(food.name)}"></label>
    <p class="note" style="margin:0">Per serving${food.serving?` (${esc(food.serving)})`:""}. Fix anything that doesn't match your label.</p>
    <div class="ggrid" style="margin:0">
      <label class="f">Calories<input id="cK" type="number" inputmode="decimal" value="${r1(food.kcal)}"></label>
      <label class="f">Protein (g)<input id="cP" type="number" inputmode="decimal" value="${r1(food.p)}"></label>
      <label class="f">Carbs (g)<input id="cC" type="number" inputmode="decimal" value="${r1(food.c)}"></label>
      <label class="f">Fat (g)<input id="cF" type="number" inputmode="decimal" value="${r1(food.f)}"></label>
    </div>
    <div class="row" style="align-items:center"><span style="font-weight:700;flex:0 0 auto">Servings</span>
      <div class="stepper" style="justify-content:flex-end"><button data-act="minus" aria-label="Fewer servings">−</button><output id="sv">1</output><button data-act="plus" aria-label="More servings">+</button></div></div>
    <div class="tot" id="tot"></div>
    <button class="primary" data-act="log">Log to ${ymd(day)===ymd(new Date())?"today":day.toLocaleDateString(undefined,{month:"short",day:"numeric"})}</button>
    <button class="link" data-act="close">Cancel</button>`);
  const val = id => +$(id).value || 0;
  const upd = () => { $("#tot").textContent = `Adds ${Math.round(val("#cK")*servings)} kcal · P ${r1(val("#cP")*servings)}g · C ${r1(val("#cC")*servings)}g · F ${r1(val("#cF")*servings)}g` };
  sheet.querySelectorAll("input").forEach(i => i.addEventListener("input", upd)); upd();
  actions.minus = () => { servings = Math.max(.5, servings-.5); $("#sv").textContent = servings; upd() };
  actions.plus  = () => { servings += .5; $("#sv").textContent = servings; upd() };
  actions.log = b => {
    const ok = store.add({ date:ymd(day), ts:Date.now(), name:$("#cName").value.trim()||"Food", serving:food.serving||"", code:food.code||"",
      kcal:val("#cK"), p:val("#cP"), c:val("#cC"), f:val("#cF"), servings });
    if (!ok){ b.textContent = "Phone storage is full or blocked"; return }
    closeSheet(); load();
  };
}

/* ---------- barcode lookup ---------- */
async function findByCode(code){
  busy("Barcode "+code, "Looking up the product…");
  try{
    const j = await getJSON(`${OFF}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
    if (j.status === 1 && j.product){
      const food = fromOFF(j.product, code);
      if (food.kcal || food.p || food.c || food.f) return confirmSheet(food);
      return addSheet(code, "Found the product, but it has no nutrition info yet. Search by name or enter it from the label.", food.name !== "Unnamed product" ? food.name : "");
    }
    addSheet(code, "This barcode isn't in the food database. Search by name or enter it from the label.");
  }catch{ addSheet(code, "Couldn't reach the food database. Check your connection, or enter it from the label.") }
}

/* ---------- camera scanning ---------- */
const FORMATS = ["ean_13","ean_8","upc_a","upc_e","code_128"];
let stream = null, raf = 0, zx = null, done = false;
function onCode(code){
  if (done) return; done = true;
  try{ navigator.vibrate?.(60) }catch{}
  stopCam(); findByCode(code);
}
async function startCam(){
  done = false; $("#cam").hidden = false; $("#camMsg").textContent = "Starting camera…";
  const video = $("#video");
  const constraints = {video:{facingMode:{ideal:"environment"}, width:{ideal:1280}, height:{ideal:720}}, audio:false};
  try{
    let native = null;
    if ("BarcodeDetector" in window){
      try{ const sup = await BarcodeDetector.getSupportedFormats(); const f = FORMATS.filter(x=>sup.includes(x)); if (f.length) native = new BarcodeDetector({formats:f}) }catch{}
    }
    if (native){
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream; await video.play();
      $("#camMsg").textContent = "Line up the barcode inside the box";
      const tick = async () => {
        if (done || !stream) return;
        try{ const r = await native.detect(video); if (r[0]?.rawValue) return onCode(r[0].rawValue) }catch{}
        raf = requestAnimationFrame(tick);
      };
      tick();
    } else if (window.ZXing){
      const hints = new Map(); hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS,
        [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E, ZXing.BarcodeFormat.CODE_128]);
      zx = new ZXing.BrowserMultiFormatReader(hints, 250);
      await zx.decodeFromConstraints(constraints, video, res => { if (res) onCode(res.getText()) });
      stream = video.srcObject;
      $("#camMsg").textContent = "Line up the barcode inside the box";
    } else throw new Error("no decoder");
  }catch(e){
    stopCam();
    const denied = e && (e.name === "NotAllowedError" || e.name === "SecurityError");
    addSheet("", denied ? "Camera access is off. Allow it for this site in your browser settings, or use a photo." : "The camera couldn't start. Try a photo of the barcode instead.");
  }
}
function stopCam(){
  cancelAnimationFrame(raf);
  try{ zx?.reset() }catch{} zx = null;
  try{ stream?.getTracks().forEach(t=>t.stop()) }catch{} stream = null;
  $("#video").srcObject = null; $("#cam").hidden = true;
}
$("#scanBtn").onclick = () => navigator.mediaDevices?.getUserMedia ? startCam() : $("#barcodeFile").click();
$("#manualBtn").onclick = () => addSheet("", "");
$("#camClose").onclick = stopCam;
$("#camPhoto").onclick = () => { stopCam(); $("#barcodeFile").click() };
$("#camType").onclick = () => { stopCam(); typeSheet() };
document.addEventListener("visibilitychange", () => { if (document.hidden && !$("#cam").hidden) stopCam() });

function typeSheet(msg){
  openSheet(`<h4>${msg ? "Couldn't read a barcode" : "Type the barcode"}</h4>${msg ? `<p class="note">${esc(msg)}</p>` : ""}
    <form class="searchrow" id="typeForm"><input id="typed" inputmode="numeric" placeholder="Number under the bars"><button>Look up</button></form>
    ${msg ? `<button class="opt" data-act="retryPhoto"><b>Try another photo</b></button>` : ""}
    <button class="link" data-act="close">Cancel</button>`);
  $("#typed").focus();
  actions.retryPhoto = () => $("#barcodeFile").click();
  $("#typeForm").addEventListener("submit", ev => { ev.preventDefault(); const v = $("#typed").value.replace(/\D/g,""); if (v.length >= 6) findByCode(v); else $("#typed").focus() });
}
async function decodeFile(file){
  if ("BarcodeDetector" in window){
    try{ const r = await new BarcodeDetector({formats:FORMATS}).detect(await createImageBitmap(file)); if (r[0]?.rawValue) return r[0].rawValue }catch{}
  }
  if (window.ZXing){
    const url = URL.createObjectURL(file);
    try{ const h = new Map(); h.set(ZXing.DecodeHintType.TRY_HARDER, true); return (await new ZXing.BrowserMultiFormatReader(h).decodeFromImageUrl(url)).getText() }
    catch{ return null } finally{ URL.revokeObjectURL(url) }
  }
  return null;
}
$("#barcodeFile").addEventListener("change", async ev => {
  const file = ev.target.files[0]; ev.target.value = ""; if (!file) return;
  busy("Reading barcode", "Finding the barcode in your photo…");
  const code = await decodeFile(file);
  code ? findByCode(code) : typeSheet("Get closer so the bars fill most of the photo, with good light and no glare. Or type the number.");
});

/* ---------- boot ---------- */
goals = {...DEFAULT_GOALS, ...(store.read("ms-goals", null) || {})};
fillGoals(); load();
let lastDay = ymd(new Date());
setInterval(() => { const t = ymd(new Date()); if (t !== lastDay){ if (ymd(day) === lastDay){ day = new Date(); day.setHours(12,0,0,0) } lastDay = t; load() } }, 60000);
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(()=>{});
})();
