// ======================= Session Gate =======================
(function () {
  var ok = localStorage.getItem("isAdmin") === "1";
  var exp = parseInt(localStorage.getItem("adminExpiresAt") || "0", 10);
  if (!(ok && Date.now() < exp)) {
    window.location.replace("index.html#admin");
  }
})();

// ======================= Helpers ============================
function $(id) { return document.getElementById(id); }

function toast(msg) {
  var t = $("toast"); if (!t) return;
  t.textContent = msg; t.classList.add("show");
  setTimeout(function(){ t.classList.remove("show"); }, 1500);
}

function readTextFile(f){
  return new Promise((res, rej) => {
    if (!f) return rej(new Error("No file"));
    var r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsText(f);
  });
}

function currency(v){ var n = isFinite(v) ? Number(v) : 0; return n.toFixed(2); }

// -------- image url extraction/validation ----------
function extractImageUrlFromEmbed(input){
  if(!input) return "";
  var s = String(input).trim();

  // <img src="...">
  var m = s.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m) return m[1];

  // [img]...[/img]
  m = s.match(/\[img\]([^\[]+?)\[\/img\]/i);
  if (m) return m[1];

  // <a href="..."><img ...></a>  (use href if direct image)
  m = s.match(/<a[^>]+href=["']([^"']+)["']/i);
  if (m && /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(m[1])) return m[1];

  // [url=...]
  m = s.match(/\[url=([^\]]+)\]/i);
  if (m) s = m[1];

  var urls = s.match(/https?:\/\/[^\s"'<>]+/g);
  if (urls && urls.length) {
    var direct = urls.find(function(u){ return /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(u); });
    return direct || urls[0];
  }
  return "";
}
function normalizeImageInput(v){ return extractImageUrlFromEmbed(v); }

function validateImageUrl(url, cb){
  if(!url){ cb(false); return; }
  var img = new Image(), done = false;
  img.onload = function(){ if(!done){ done = true; cb(true); } };
  img.onerror = function(){ if(!done){ done = true; cb(false); } };
  img.src = url + (url.indexOf("?")>-1 ? "&" : "?") + "cb=" + Date.now();
}
function attachStatusBadge(imgEl){
  if(!imgEl) return null;
  var badge = document.createElement("div");
  badge.style.cssText = "margin-top:4px;font-size:12px;";
  imgEl.insertAdjacentElement("afterend", badge);
  return badge;
}

// Paths returned from the upload server might be:
//   "/uploads/foo.webp", "uploads/foo.webp", or "public/uploads/foo.webp"
// This makes them project-relative so they work on GitHub Pages project sites.
function normalizeRepoPath(u){
  if(!u) return "";
  u = String(u).trim();

  // Collapse absolute URL to its path (if a server ever returned full URL)
  var absMatch = u.match(/^https?:\/\/[^/]+\/([^?#]+).*$/i);
  if (absMatch) u = absMatch[1];

  u = u.replace(/^\/+/, "");      // strip leading slashes
  u = u.replace(/^public\//, ""); // strip public/
  return u; // e.g. "uploads/foo.webp"
}

// ============== Compression (fallback, data URL) ==============
function readImageCompressedLocal(file, maxSide, quality, cb){
  if(!file){ cb(null); return; }
  var reader = new FileReader();
  reader.onload = function(e){
    var img = new Image();
    img.onload = function(){
      var w = img.width, h = img.height, max = maxSide || 1600;
      var scale = Math.min(1, max / Math.max(w,h));
      var nw = Math.round(w * scale), nh = Math.round(h * scale);
      var c = document.createElement("canvas"); c.width = nw; c.height = nh;
      var ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0, nw, nh);
      try { cb(c.toDataURL("image/jpeg", quality || 0.8)); }
      catch(err){ cb(null); }
    };
    img.onerror = function(){ cb(null); };
    img.src = e.target.result;
  };
  reader.onerror = function(){ cb(null); };
  reader.readAsDataURL(file);
}

// Quota-safe localStorage writes
function safeSetItem(key, value){
  try { localStorage.setItem(key, value); return true; }
  catch(e){ toast("Opslaglimiet bereikt — gebruik kleinere bestanden of URLs."); return false; }
}

// Create or reuse a small preview <img> under a given input
function ensurePreviewBelow(inputEl, id){
  if (!inputEl) return null;
  var existing = document.getElementById(id);
  if (existing) return existing;
  var img = document.createElement("img");
  img.id = id; img.alt = "Voorbeeld";
  img.style.cssText = "margin-top:8px;width:140px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--border)";
  inputEl.parentElement.appendChild(img);
  return img;
}

// ==================== Persistent Upload Helper (Git-backed) ===================
const UPLOAD_BASE = "https://hobbybyrox1-0.onrender.com";

async function uploadViaApi(file){
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(UPLOAD_BASE + "/api/upload-image", { method: "POST", body: fd });
  let json = null;
  try { json = await res.json(); } catch(e){}
  if (!res.ok || !json || !json.ok || !json.url) {
    throw new Error((json && (json.error || json.details)) || "Upload failed");
  }
  // Normalize so GitHub Pages can find it
  return normalizeRepoPath(json.url);
}

// Wrap original compression: prefer server upload; fall back to local compression
function readImageCompressed(file, maxSide, quality, cb){
  if(!file){ cb(null); return; }
  uploadViaApi(file)
    .then((url)=> cb(url))
    .catch(()=> { readImageCompressedLocal(file, maxSide, quality, cb); });
}

// ======================= Defaults ===========================
var DEFAULT_HEROES = ["https://i.ibb.co/zTspn9QG/hobby.png"];
var DEFAULT_INSP1 = "https://i.ibb.co/zTspn9QG/hobby.png";
var DEFAULT_INSP2 = "https://i.ibb.co/zTspn9QG/hobby.png";
var DEFAULT_INSP3 = "https://i.ibb.co/zTspn9QG/hobby.png";

var DEFAULT_PRODUCTS = {
  1:{name:"Boeket Lente Zacht",description:"Fris pastel met tulp en ranonkel.",price:29.95,category:"seizoensboeketten",images:["https://i.ibb.co/zTspn9QG/hobby.png","https://i.ibb.co/zTspn9QG/hobby.png"],thumbnail:"https://i.ibb.co/zTspn9QG/hobby.png",extra:"Maat: S/M/L"},
  2:{name:"Tafelstuk Groen",description:"Eucalyptus, roos en seizoensgroen.",price:39.95,category:"tafelstuk",images:["https://i.ibb.co/zTspn9QG/hobby.png","https://i.ibb.co/zTspn9QG/hobby.png"],thumbnail:"https://i.ibb.co/zTspn9QG/hobby.png",extra:"Levertijd: 1-2 dagen"},
  3:{name:"Bruiloftsboeket Klassiek",description:"Witte roos met zachte accenten.",price:89.00,category:"bruiloft",images:["https://i.ibb.co/zTspn9QG/hobby.png","https://i.ibb.co/zTspn9QG/hobby.png"],thumbnail:"https://i.ibb.co/zTspn9QG/hobby.png",extra:"Op maat"},
  4:{name:"Seizoensboeket Vrolijk",description:"Kleurige mix, elke week anders.",price:24.50,category:"seizoensboeketten",images:["https://i.ibb.co/zTspn9QG/hobby.png","https://i.ibb.co/zTspn9QG/hobby.png"],thumbnail:"https://i.ibb.co/zTspn9QG/hobby.png",extra:"Abonnement"},
  5:{name:"Rouwstuk Eerbetoon",description:"Met liefde samengesteld, volledig naar wens.",price:50.00,category:"rouw",images:["https://i.ibb.co/zTspn9QG/hobby.png","https://i.ibb.co/zTspn9QG/hobby.png"],thumbnail:"https://i.ibb.co/zTspn9QG/hobby.png",extra:"Persoonlijk"},
  6:{name:"Droogboeket Aards",description:"Aardse tinten en lange houdbaarheid.",price:34.95,category:"seizoensboeketten",images:["https://i.ibb.co/zTspn9QG/hobby.png","https://i.ibb.co/zTspn9QG/hobby.png"],thumbnail:"https://i.ibb.co/zTspn9QG/hobby.png",extra:"Limited"}
};

// Seed products once
if (!localStorage.getItem("products")) {
  localStorage.setItem("products", JSON.stringify(DEFAULT_PRODUCTS));
}
var products = JSON.parse(localStorage.getItem("products"));
function saveProducts(){ safeSetItem("products", JSON.stringify(products)); }

// =================== HERO SLIDESHOW (URL or Upload) ===================
function loadHeroSlides(){
  var arr=[]; try{ arr=JSON.parse(localStorage.getItem("heroSlides")||"[]"); }catch(e){ arr=[]; }
  if(!arr.length) arr = DEFAULT_HEROES.slice();
  renderHeroSlides(arr);
}
function renderHeroSlides(arr){
  var list=$("heroSlidesList"); if(!list) return;
  list.innerHTML="";
  arr.forEach(function(src,i){
    var item=document.createElement("div"); item.className="item";
    item.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;justify-content:space-between">' +
        '<img src="'+src+'" style="width:140px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">' +
        '<button class="btn danger" data-remove="'+i+'">Verwijderen</button>' +
      "</div>";
    list.appendChild(item);
  });
  list.querySelectorAll("[data-remove]").forEach(function(btn){
    btn.addEventListener("click", function(){
      var idx=parseInt(this.getAttribute("data-remove"),10);
      arr.splice(idx,1);
      if(!safeSetItem("heroSlides", JSON.stringify(arr))) return;
      renderHeroSlides(arr); toast("Afbeelding verwijderd");
    });
  });
}
$("heroAddBtn") && $("heroAddBtn").addEventListener("click", function(){
  var raw = ($("heroNewUrl") && $("heroNewUrl").value || "").trim();
  var url = normalizeImageInput(raw);
  var file = $("heroNewImage") && $("heroNewImage").files[0];

  function commit(src){
    var arr=[]; try{ arr=JSON.parse(localStorage.getItem("heroSlides")||"[]"); }catch(e){ arr=[]; }
    arr.push(src);
    if(!safeSetItem("heroSlides", JSON.stringify(arr))) return;
    if ($("heroNewUrl")) $("heroNewUrl").value="";
    if ($("heroNewImage")) $("heroNewImage").value="";
    renderHeroSlides(arr); toast("Hero-afbeelding toegevoegd");
  }

  if(url){ commit(url); return; }
  if(!file){ toast("Kies een bestand of plak een embed/URL"); return; }

  readImageCompressed(file, 1600, 0.8, function(data){
    if(!data){ toast("Kon afbeelding niet verwerken"); return; }
    commit(data);
  });
});
$("heroResetBtn") && $("heroResetBtn").addEventListener("click", function(){
  localStorage.removeItem("heroSlides");
  renderHeroSlides(DEFAULT_HEROES.slice());
  toast("Hero gereset naar standaard");
});

// Live preview for hero URL field
(function(){
  var urlEl = $("heroNewUrl"); if(!urlEl) return;
  var prev = ensurePreviewBelow(urlEl, "heroUrlPreview");
  urlEl.addEventListener("input", function(){
    var u = normalizeImageInput(urlEl.value);
    if(prev) prev.src = u || "";
  });
})();

// =================== Inspiration (3 slots with URL/upload) ===
function loadInspiration(){
  if($("inspPrev1")) $("inspPrev1").src = localStorage.getItem("inspirationImage1") || DEFAULT_INSP1;
  if($("inspPrev2")) $("inspPrev2").src = localStorage.getItem("inspirationImage2") || DEFAULT_INSP2;
  if($("inspPrev3")) $("inspPrev3").src = localStorage.getItem("inspirationImage3") || DEFAULT_INSP3;

  if($("inspUrlPrev1")) $("inspUrlPrev1").src = "";
  if($("inspUrlPrev2")) $("inspUrlPrev2").src = "";
  if($("inspUrlPrev3")) $("inspUrlPrev3").src = "";
}
["1","2","3"].forEach(function(id){
  var urlEl = $("inspUrl"+id), prevEl = $("inspUrlPrev"+id);
  if(urlEl && prevEl){
    urlEl.addEventListener("input", function(){
      var u = normalizeImageInput(urlEl.value);
      prevEl.src = u || "";
    });
  }
});
document.querySelectorAll("[data-save-insp]").forEach(function(btn){
  btn.addEventListener("click", function(){
    var id = this.getAttribute("data-save-insp");
    var raw = ($("inspUrl"+id)?.value || "").trim();
    var url = normalizeImageInput(raw);
    var fileEl = $("inspFile"+id);
    var file = fileEl && fileEl.files ? fileEl.files[0] : null;

    function commit(src){
      if(!safeSetItem("inspirationImage"+id, src)) return;
      if(fileEl) fileEl.value = "";
      if($("inspUrl"+id)) $("inspUrl"+id).value = "";
      if($("inspUrlPrev"+id)) $("inspUrlPrev"+id).src = "";
      loadInspiration();
      toast("Opgeslagen");
    }

    if(url){ commit(url); return; }
    if(file){
      readImageCompressed(file, 1400, 0.8, function(data){
        if(!data){ toast("Kon afbeelding niet verwerken"); return; }
        commit(data);
      });
      return;
    }
    toast("Plak een URL/Embed of kies een bestand");
  });
});
document.querySelectorAll("[data-reset-insp]").forEach(function(btn){
  btn.addEventListener("click", function(){
    var id = this.getAttribute("data-reset-insp");
    var def = id==="1" ? DEFAULT_INSP1 : id==="2" ? DEFAULT_INSP2 : DEFAULT_INSP3;
    if(!safeSetItem("inspirationImage"+id, def)) return;
    if($("inspFile"+id)) $("inspFile"+id).value = "";
    if($("inspUrl"+id))  $("inspUrl"+id).value  = "";
    if($("inspUrlPrev"+id)) $("inspUrlPrev"+id).src = "";
    loadInspiration(); toast("Gereset");
  });
});

// =================== New Product (URL first, else upload) ===
function resetNewForm(){
  ["npName","npDesc","npPrice","npExtra","npImg1","npImg2","npUrl1","npUrl2"].forEach(function(id){
    var el=$(id); if(!el) return; if(el.type==="file"){ el.value=""; } else { el.value=""; }
  });
  if($("npCat")) $("npCat").value = "seizoensboeketten";
}
$("resetNewFormBtn") && $("resetNewFormBtn").addEventListener("click", resetNewForm);

(function(){
  var u1=$("npUrl1"), u2=$("npUrl2"), u3=$("npUrl3");
  if(u1){ var p1=ensurePreviewBelow(u1,"npPreview1"); u1.addEventListener("input", function(){ var u=normalizeImageInput(u1.value); if(p1) p1.src=u||""; }); }
  if(u2){ var p2=ensurePreviewBelow(u2,"npPreview2"); u2.addEventListener("input", function(){ var u=normalizeImageInput(u2.value); if(p2) p2.src=u||""; }); }
  if(u3){ var p3=ensurePreviewBelow(u3,"npPreview3"); u3.addEventListener("input", function(){ var u=normalizeImageInput(u3.value); if(p3) p3.src=u||""; }); }
})();

$("addProductBtn") && $("addProductBtn").addEventListener("click", function(){
  var nm=$("npName").value.trim(), ds=$("npDesc").value.trim(), pr=parseFloat($("npPrice").value), ct=$("npCat").value, ex=$("npExtra").value.trim();
  var url1=normalizeImageInput(($("npUrl1").value||"").trim()), url2=normalizeImageInput(($("npUrl2").value||"").trim());
  var f1=$("npImg1").files[0], f2=$("npImg2").files[0];
  if(!nm || !ds || isNaN(pr)){ toast("Vul naam/beschrijving/prijs in"); return; }

  function finish(img1, img2){
    var imgs=[]; if(url1) imgs.push(url1); else if(img1) imgs.push(img1);
                 if(url2) imgs.push(url2); else if(img2) imgs.push(img2);
    var thumb = imgs[0] || DEFAULT_HEROES[0];
    var id=String(Date.now());
    products[id]={name:nm, description:ds, price:pr, category:ct, images:imgs.length?imgs:[thumb], thumbnail:thumb, extra:ex};
    saveProducts(); renderProducts(); resetNewForm(); toast("Toegevoegd");
  }

  if(url1 && url2){ finish(null,null); return; }
  if(url1 && !url2){ readImageCompressed(f2, 1400, .8, function(img2){ finish(null,img2); }); return; }
  if(!url1 && url2){ readImageCompressed(f1, 1400, .8, function(img1){ finish(img1,null); }); return; }

  readImageCompressed(f1, 1400, .8, function(img1){
    readImageCompressed(f2, 1400, .8, function(img2){ finish(img1,img2); });
  });
});

// =================== List / Edit / Delete ===================
function renderProducts(){
  var list=$("productList"); if(!list) return;
  list.innerHTML="";
  var keys=Object.keys(products);
  if(!keys.length){ list.innerHTML='<div class="item"><em>Geen producten… Voeg er hierboven één toe.</em></div>'; return; }

  keys.forEach(function(id){
    var p=products[id];
    var div=document.createElement("div"); div.className="item";
    div.innerHTML =
      '<div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap">'
    +   '<div style="display:flex;gap:10px;align-items:center">'
    +     '<img src="'+(p.thumbnail||"")+'" alt="'+p.name+'" style="width:64px;height:48px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"/>'
    +     '<div><strong>'+p.name+'</strong> — € '+currency(p.price)+' <span class="pill">'+p.category+'</span><br><small>'+(p.extra||"")+'</small></div>'
    +   '</div>'
    +   '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    +     '<button class="btn" data-edit="'+id+'">Bewerken</button>'
    +     '<button class="btn danger" data-del="'+id+'">Verwijderen</button>'
    +   '</div>'
    + "</div>";
    list.appendChild(div);
  });

  list.querySelectorAll("[data-del]").forEach(function(btn){
    btn.addEventListener("click", function(){
      var id=this.getAttribute("data-del"); var p=products[id];
      if(confirm('Verwijder "'+(p?p.name:"product")+'"?')){ delete products[id]; saveProducts(); renderProducts(); toast("Verwijderd"); }
    });
  });
  list.querySelectorAll("[data-edit]").forEach(function(btn){
    btn.addEventListener("click", function(){ openEditModal(this.getAttribute("data-edit")); });
  });
}

var editingId=null;
function openEditModal(id){
  var p=products[id]; if(!p) return;
  editingId=id;
  $("epName").value=p.name||""; $("epDesc").value=p.description||"";
  $("epPrice").value=typeof p.price==="number"?p.price:""; $("epCat").value=p.category||"seizoensboeketten";
  $("epExtra").value=p.extra||"";
  $("epPrev1") && ($("epPrev1").src=(p.images&&p.images[0])?p.images[0]:(p.thumbnail||""));
  $("epPrev2") && ($("epPrev2").src=(p.images&&p.images[1])?p.images[1]:"");
  ["epImg1","epImg2","epUrl1","epUrl2"].forEach(function(i){ var el=$(i); if(el) el.value=""; });
  var m=$("editProductModal"); if(m) m.style.display="block";
}

$("epResetImagesBtn") && $("epResetImagesBtn").addEventListener("click", function(){
  if(!editingId) return;
  var p=products[editingId];
  $("epPrev1") && ($("epPrev1").src=(p.images&&p.images[0])?p.images[0]:(p.thumbnail||""));
  $("epPrev2") && ($("epPrev2").src=(p.images&&p.images[1])?p.images[1]:"");
  ["epImg1","epImg2","epUrl1","epUrl2"].forEach(function(i){ var el=$(i); if(el) el.value=""; });
  toast("Afbeeldingen gereset");
});

(function(){
  var u1=$("epUrl1"), u2=$("epUrl2");
  if(u1) u1.addEventListener("input", function(){ var u=normalizeImageInput(u1.value); $("epPrev1") && ($("epPrev1").src = u || $("epPrev1").src); });
  if(u2) u2.addEventListener("input", function(){ var u=normalizeImageInput(u2.value); $("epPrev2") && ($("epPrev2").src = u || $("epPrev2").src); });
})();

$("epImg1") && $("epImg1").addEventListener("change", function(){
  var f=this.files[0]; readImageCompressed(f, 1400, .8, function(data){ if(data && $("epPrev1")) $("epPrev1").src=data; });
});
$("epImg2") && $("epImg2").addEventListener("change", function(){
  var f=this.files[0]; readImageCompressed(f, 1400, .8, function(data){ if(data && $("epPrev2")) $("epPrev2").src=data; });
});

$("epDeleteBtn") && $("epDeleteBtn").addEventListener("click", function(){
  if(!editingId) return;
  var p=products[editingId];
  if(confirm('Verwijder "'+(p?p.name:"product")+'"?')){
    delete products[editingId]; saveProducts(); renderProducts();
    var m=$("editProductModal"); if(m) m.style.display="none"; toast("Verwijderd");
  }
});

$("epSaveBtn") && $("epSaveBtn").addEventListener("click", function(){
  if(!editingId) return;
  var p=products[editingId]; if(!p) return;

  var nm=$("epName").value.trim(), ds=$("epDesc").value.trim(), pr=parseFloat($("epPrice").value),
      ct=$("epCat").value, ex=$("epExtra").value.trim();
  if(!nm || !ds || isNaN(pr)){ toast("Vul naam/beschrijving/prijs in"); return; }

  var url1=normalizeImageInput(($("epUrl1").value||"").trim()), url2=normalizeImageInput(($("epUrl2").value||"").trim());
  var f1=$("epImg1").files[0], f2=$("epImg2").files[0];

  function finish(img1,img2){
    var imgs = Array.isArray(p.images)? p.images.slice() : [];
    if(url1) imgs[0]=url1; else if(img1) imgs[0]=img1;
    if(url2) imgs[1]=url2; else if(img2) imgs[1]=img2 || imgs[1];
    imgs = imgs.filter(Boolean);
    if(!imgs.length && p.thumbnail) imgs=[p.thumbnail];

    p.name=nm; p.description=ds; p.price=pr; p.category=ct; p.extra=ex;
    p.images=imgs; p.thumbnail=imgs[0] || p.thumbnail;

    saveProducts(); renderProducts(); toast("Opgeslagen");
    var m=$("editProductModal"); if(m) m.style.display="none";
  }

  if(url1 && url2){ finish(null,null); return; }
  if(url1 && !url2){ readImageCompressed(f2, 1400, .8, function(img2){ finish(null,img2); }); return; }
  if(!url1 && url2){ readImageCompressed(f1, 1400, .8, function(img1){ finish(img1,null); }); return; }

  readImageCompressed(f1, 1400, .8, function(img1){
    readImageCompressed(f2, 1400, .8, function(img2){ finish(img1,img2); });
  });
});

// =================== Import / Export ========================
function exportProducts(){
  var data = JSON.stringify(products, null, 2);
  var blob = new Blob([data], {type:"application/json"});
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = "catalog-export-" + new Date().toISOString().slice(0,10) + ".json";
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  toast("Export aangemaakt");
}
function validateCatalog(obj){
  if(typeof obj!=="object" || obj===null) return "Root is geen object.";
  var keys=Object.keys(obj); if(!keys.length) return "Lege catalogus.";
  for (var k of keys){
    var p=obj[k];
    if(typeof p!=="object" || p===null) return "Product "+k+" is ongeldig.";
    if(typeof p.name!=="string" || !p.name.trim()) return "Product "+k+" mist naam.";
    if(typeof p.description!=="string") return "Product "+k+" mist beschrijving.";
    if(typeof p.price!=="number" || !isFinite(p.price)) return "Product "+k+" heeft ongeldige prijs.";
    if(typeof p.category!=="string") return "Product "+k+" mist categorie.";
    if(!Array.isArray(p.images)) p.images=[];
    if(typeof p.thumbnail!=="string" && p.images[0]) p.thumbnail=p.images[0];
    if(typeof p.extra!=="string") p.extra="";
  }
  return null;
}
async function importFromFile(){
  var f=$("importFile").files[0];
  if(!f){ toast("Kies eerst een JSON-bestand"); return; }
  try{
    var txt=await readTextFile(f), obj=JSON.parse(txt), err=validateCatalog(obj);
    if(err){ alert("Import fout: "+err); return; }
    if(!confirm("Deze import vervangt ALLE producten. Doorgaan?")) return;
    products=obj; saveProducts(); renderProducts(); toast("Catalogus geïmporteerd");
  }catch(e){ alert("Kon JSON niet lezen: "+e.message); }
}
function importFromTextarea(){
  var txt=$("importText").value.trim(); if(!txt){ toast("Plak eerst JSON"); return; }
  try{
    var obj=JSON.parse(txt), err=validateCatalog(obj);
    if(err){ alert("Import fout: "+err); return; }
    if(!confirm("Deze import vervangt ALLE producten. Doorgaan?")) return;
    products=obj; saveProducts(); renderProducts(); toast("Catalogus geïmporteerd");
  }catch(e){ alert("Ongeldige JSON: "+e.message); }
}
function downloadTemplate(){
  var sample={"1234567890":{"name":"Voorbeeld Boeket","description":"Korte beschrijving…","price":29.95,"category":"seizoensboeketten","images":["https://i.ibb.co/zTspn9QG/hobby.png","https://i.ibb.co/zTspn9QG/hobby.png"],"thumbnail":"https://i.ibb.co/zTspn9QG/hobby.png","extra":"Maat: S/M/L"}};
  var data=JSON.stringify(sample,null,2), blob=new Blob([data],{type:"application/json"}), url=URL.createObjectURL(blob);
  var a=document.createElement("a"); a.href=url; a.download="catalog-template.json"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  toast("Template gedownload");
}

// =================== Logout & Init ==========================
$("logoutBtn") && $("logoutBtn").addEventListener("click", function(){
  localStorage.removeItem("isAdmin"); localStorage.removeItem("adminExpiresAt"); window.location.replace("index.html");
});

// Wire import/export
$("exportBtn") && $("exportBtn").addEventListener("click", exportProducts);
$("importReplaceBtn") && $("importReplaceBtn").addEventListener("click", importFromFile);
$("importApplyBtn") && $("importApplyBtn").addEventListener("click", importFromTextarea);
$("downloadTemplateBtn") && $("downloadTemplateBtn").addEventListener("click", downloadTemplate);

// Init
loadHeroSlides();
loadInspiration();
renderProducts();

// ====== Edit modal close handlers (X, outside click, Escape) ======
(function(){
  var modal = $("editProductModal");
  var x = $("editClose");
  function close(){ if(modal) modal.style.display="none"; }
  x && x.addEventListener("click", close);
  if (modal) {
    modal.addEventListener("click", function(e){ if (e.target === modal) close(); }, { passive: true });
  }
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape" && modal && getComputedStyle(modal).display !== "none") { close(); }
  });
})();

/* ===== Global Default Image (Admin) ===== */
(function(){
  function loadDefault() {
    try {
      var url = localStorage.getItem("defaultImage") || "https://i.ibb.co/zTspn9QG/hobby.png";
      var input = $("defaultImageUrl");
      var img = $("defaultImagePreview");
      if (input) input.value = url;
      if (img) { img.src = url; img.style.display = "block"; }
    } catch(e){}
  }
  function saveDefault() {
    var _proceed = function(url){
      try { localStorage.setItem("defaultImage", url); loadDefault(); alert("Saved default image."); }
      catch(e){ alert("Could not save default image: " + e); }
    };
    var input = $("defaultImageUrl"); if (!input) return;
    var url = (input.value || "").trim();
    if (!url) { alert("Please enter a URL for the default image."); return; }
    validateImageUrl(url, function(ok){
      if(!ok){ if(!confirm("Deze link lijkt geen directe afbeelding te zijn. Toch opslaan als fallback?")) return; }
      _proceed(url);
    });
  }
  document.addEventListener("DOMContentLoaded", function(){
    var btn = $("saveDefaultImageBtn");
    btn && btn.addEventListener("click", saveDefault);
    loadDefault();
  });
})();
/* ===== End Global Default Image (Admin) ===== */

// Live validators/badges (hero + inspiration + new/edit forms)
(function setupLiveValidators(){
  function wire(idInput, idPrev){
    var urlEl = $(idInput), prevEl = $(idPrev);
    if(!urlEl || !prevEl) return;
    var badge = attachStatusBadge(prevEl);
    function run(){
      var u = normalizeImageInput(urlEl.value);
      prevEl.src = u || "";
      if(!u){ if(badge) badge.textContent=""; return; }
      validateImageUrl(u, function(ok){
        if(badge) badge.textContent = ok ? "✅ Lijkt een geldige afbeeldings-URL" : "❌ Dit is geen directe afbeeldings-URL";
      });
    }
    urlEl.addEventListener("input", run); run();
  }
  wire("heroNewUrl", "heroUrlPreview");
  wire("inspUrl1", "inspUrlPrev1");
  wire("inspUrl2", "inspUrlPrev2");
  wire("inspUrl3", "inspUrlPrev3");
  wire("npUrl1", "npPreview1");
  wire("npUrl2", "npPreview2");
  wire("npUrl3", "npPreview3");
  wire("epUrl1", "epPrev1");
  wire("epUrl2", "epPrev2");
})();

// ==================== Repo Sync Button (updated payload) ====================
// Read JSON helpers
function _readJSON(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch(_) { return fallback; }
}

// Prefer the admin's "heroSlides"; if someone ever stored under "heroImages", include those too.
function _getHeroArray() {
  const slides = _readJSON("heroSlides", []);
  const images = _readJSON("heroImages", []);
  const merged = [...slides, ...images].filter(Boolean);
  return Array.from(new Set(merged));
}

// Only send inspiration that actually exists
function _getInspirationArray() {
  const a = localStorage.getItem("inspirationImage1") || "";
  const b = localStorage.getItem("inspirationImage2") || "";
  const c = localStorage.getItem("inspirationImage3") || "";
  return [a, b, c].filter(Boolean);
}

async function syncAllToRepo() {
  const btn = document.getElementById("syncToRepoBtn");
  const setBusy = (b) => {
    if (!btn) return;
    btn.disabled = b;
    btn.style.opacity = b ? "0.7" : "1";
    btn.textContent = b ? "Syncing…" : "Sync to Repo";
  };

  try {
    setBusy(true);

    const products = _readJSON("products", {});   // object keyed by id
    const hero = _getHeroArray();                 // ["uploads/…", "https://…", …]
    const insp = _getInspirationArray();          // up to 3 strings

    // Send both new and legacy keys so the server route stays compatible.
    const payload = {
      products,
      heroImages: hero,        // new/preferred
      heroSlides: hero,        // legacy
      inspiration: insp,       // new/preferred
      inspirationItems: insp   // legacy
    };

    const res = await fetch((UPLOAD_BASE || "") + "/api/save-products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    let j = {};
    try { j = await res.json(); } catch(_) {}

    if (!res.ok || !j || j.ok !== true) {
      throw new Error(j?.error || j?.details || "Sync failed");
    }

    alert("Synced to repo! Commit: " + String(j.commit || "").slice(0, 7));
  } catch (e) {
    console.error("[syncAllToRepo] error:", e);
    alert("Sync to repo failed: " + (e?.message || e));
  } finally {
    setBusy(false);
  }
}

// Create/attach the floating button (idempotent)
document.addEventListener("DOMContentLoaded", () => {
  let btn = document.getElementById("syncToRepoBtn");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "syncToRepoBtn";
    btn.type = "button";
    btn.textContent = "Sync to Repo";
    btn.style.position = "fixed";
    btn.style.right = "16px";
    btn.style.bottom = "16px";
    btn.style.zIndex = "9999";
    btn.style.padding = "10px 14px";
    btn.style.borderRadius = "10px";
    btn.style.border = "none";
    btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
    btn.style.cursor = "pointer";
    btn.style.background = "#111";
    btn.style.color = "#fff";
    btn.title = "Write products & images metadata to /data/*.json in the repo";
    document.body.appendChild(btn);
  }
  btn.onclick = syncAllToRepo;
});
