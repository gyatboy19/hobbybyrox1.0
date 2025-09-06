// --------- Defaults (images) ----------
// Global default image; Admin can override by saving "defaultImage" in localStorage via Admin Panel.
var DEFAULT_IMAGE = (function(){
  try { return localStorage.getItem('defaultImage') || "https://i.ibb.co/zTspn9QG/hobby.png"; } catch(e){ return "https://i.ibb.co/zTspn9QG/hobby.png"; }
})();
var DEFAULT_HERO_1 = DEFAULT_IMAGE;
var DEFAULT_HERO_2 = DEFAULT_IMAGE;
var DEFAULT_HERO_3 = DEFAULT_IMAGE;
var DEFAULT_PRODUCT_IMAGE = DEFAULT_IMAGE;
// --------- End Defaults ----------
// ---------- Helpers ----------
function $(id){ return document.getElementById(id); }
function on(id, evt, fn){ var el = $(id); if (el) el.addEventListener(evt, fn); }
function cartCount(){ return (JSON.parse(localStorage.getItem('cart')) || []).reduce((s,i)=>s+i.quantity,0); }
function getCart(){ return JSON.parse(localStorage.getItem('cart')) || []; }
function getCartQtyByName(name){
  var c=getCart(); var it=c.find(function(i){ return i.name===name; });
  return it ? it.quantity : 0;
}

// Device detection
function detectDevice(){
  var m=/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||window.innerWidth<=768;
  document.body.className=m?'mobile':'desktop';
}
detectDevice(); window.addEventListener('resize', detectDevice);

// Footer year
if ($('year')) $('year').textContent = new Date().getFullYear();

// Admin session helpers
function setAdminSession(hours){
  var exp=Date.now()+hours*60*60*1000;
  localStorage.setItem('isAdmin','1');
  localStorage.setItem('adminExpiresAt',String(exp));
}
function hasValidAdminSession(){
  var ok=localStorage.getItem('isAdmin')==='1',
      exp=parseInt(localStorage.getItem('adminExpiresAt')||'0',10);
  return ok&&Date.now()<exp;
}
function openAdminModal(){ var m=$('adminLoginModal'); if(m) m.style.display='block'; }

// Data (defaults; can be overridden by admin via localStorage)
var products = JSON.parse(localStorage.getItem('products')) || {
  1:{name:"Boeket Lente Zacht",description:"Fris pastel met tulp en ranonkel.",price:29.95,category:"seizoensboeketten",images:["https://i.ibb.co/zTspn9QG/hobby.png","https://i.ibb.co/zTspn9QG/hobby.png"],thumbnail:"https://i.ibb.co/zTspn9QG/hobby.png",extra:"Maat: S/M/L"},
  2:{name:"Tafelstuk Groen",description:"Eucalyptus, roos en seizoensgroen.",price:39.95,category:"tafelstuk",images:["https://i.ibb.co/zTspn9QG/hobby.png","https://i.ibb.co/zTspn9QG/hobby.png"],thumbnail:"https://i.ibb.co/zTspn9QG/hobby.png",extra:"Levertijd: 1-2 dagen"},
  3:{name:"Bruiloftsboeket Klassiek",description:"Witte roos met zachte accenten.",price:89.00,category:"bruiloft",images:["https://i.ibb.co/zTspn9QG/hobby.png","https://i.ibb.co/zTspn9QG/hobby.png"],thumbnail:"https://i.ibb.co/zTspn9QG/hobby.png",extra:"Op maat"},
  4:{name:"Seizoensboeket Vrolijk",description:"Kleurige mix, elke week anders.",price:24.50,category:"seizoensboeketten",images:["https://i.ibb.co/zTspn9QG/hobby.png","https://i.ibb.co/zTspn9QG/hobby.png"],thumbnail:"https://i.ibb.co/zTspn9QG/hobby.png",extra:"Abonnement"},
  5:{name:"Rouwstuk Eerbetoon",description:"Met liefde samengesteld, volledig naar wens.",price:50.00,category:"rouw",images:["https://i.ibb.co/zTspn9QG/hobby.png","https://i.ibb.co/zTspn9QG/hobby.png"],thumbnail:"https://i.ibb.co/zTspn9QG/hobby.png",extra:"Persoonlijk"},
  6:{name:"Droogboeket Aards",description:"Aardse tinten en lange houdbaarheid.",price:34.95,category:"seizoensboeketten",images:["https://i.ibb.co/zTspn9QG/hobby.png","https://i.ibb.co/zTspn9QG/hobby.png"],thumbnail:"https://i.ibb.co/zTspn9QG/hobby.png",extra:"Limited"}
};

// Cart
var cart = getCart();
function persistCart(){ localStorage.setItem('cart', JSON.stringify(cart)); }
function badgeUpdate(){
  var count = cart.reduce(function(s,i){ return s+i.quantity; },0);
  var header = $('cartCount'); if (header) header.textContent = count;
  var chipBadge = $('cartChipBadge'); if (chipBadge){ chipBadge.textContent = count; chipBadge.style.display = count? 'grid' : 'none'; }
}
function updateCart(){
  var wrap=$('cartItems'), totalEl=$('cartTotal');
  if (wrap) wrap.innerHTML='';
  var total=0;
  cart.forEach(function(item){
    total += item.price*item.quantity;
    var product = Object.values(products).find(function(p){ return p.name===item.name; });
    var product = Object.values(products).find(function(p){ return p.name===item.name; });
        var thumb = (product && (product.thumbnail || (product.images && product.images[0]))) || DEFAULT_PRODUCT_IMAGE;
    if (wrap){
      var el=document.createElement('div');
      el.className='cart-item-container';
      el.innerHTML = '<img class="cart-item-image" src="'+thumb+'" alt="'+item.name+'" loading="lazy" decoding="async" />'
                   + '<div class="cart-item-details"><p>'+item.name+'</p><p class="price">€ '+(item.price*item.quantity).toFixed(2)+' ('+item.quantity+' × € '+item.price.toFixed(2)+')</p></div>'
                   + '<div class="cart-item-actions"><div class="cart-quantity">'
                   + '<button class="btn primary quantity-btn quantity-decrement" data-name="'+item.name+'">−</button>'
                   + '<span>'+item.quantity+'</span>'
                   + '<button class="btn primary quantity-btn quantity-increment" data-name="'+item.name+'">+</button>'
                   + '</div><button class="btn ghost remove-item" data-name="'+item.name+'">Verwijderen</button></div>';
      wrap.appendChild(el);
    }
  });
  if (totalEl) totalEl.textContent='Totaal: € '+total.toFixed(2);

  // wire qty buttons
  if (wrap){
    wrap.querySelectorAll('.quantity-increment').forEach(function(b){ b.addEventListener('click',function(){
      var it=cart.find(function(i){ return i.name===b.dataset.name; }); if(it){ it.quantity++; persistCart(); updateCart(); badgeUpdate(); refreshProductBadges(); }
    });});
    wrap.querySelectorAll('.quantity-decrement').forEach(function(b){ b.addEventListener('click',function(){
      var it=cart.find(function(i){ return i.name===b.dataset.name; }); if(it&&it.quantity>1){ it.quantity--; persistCart(); updateCart(); badgeUpdate(); refreshProductBadges(); }
    });});
    wrap.querySelectorAll('.remove-item').forEach(function(b){ b.addEventListener('click',function(){
      cart = cart.filter(function(i){ return i.name!==b.dataset.name; }); persistCart(); updateCart(); badgeUpdate(); refreshProductBadges();
    });});
  }

  badgeUpdate();
}
function addToCart(name, price){
  var found = cart.find(function(i){ return i.name===name; });
  if(found){ found.quantity+=1; } else { cart.push({name: name, price: price, quantity: 1}); }
  persistCart(); updateCart(); badgeUpdate(); refreshProductBadges();
  var n=$('notification'); if(n){ n.classList.add('show'); setTimeout(function(){ n.classList.remove('show'); },2000); }
}

// Filtering
var currentFilter='all';
function setActiveChip(f){
  document.querySelectorAll('.filters .chip').forEach(function(c){
    var a=c.getAttribute('data-filter')===f;
    c.classList.toggle('active',a);
    c.setAttribute('aria-selected',a?'true':'false');
  });
}
function applyFilter(f){
  currentFilter=f||'all';
  document.querySelectorAll('#productGrid .card').forEach(function(card){
    var m=(currentFilter==='all')||(card.dataset.category===currentFilter);
    card.style.display=m?'':'none';
  });
  setActiveChip(currentFilter);
}

// Product grid
function updateProductGrid(){
  var grid=$('productGrid'); if(!grid) return;
  grid.innerHTML='';
  Object.keys(products).forEach(function(id){
    var p=products[id];
    var qty=getCartQtyByName(p.name);
    var card=document.createElement('article');
    card.className='card'; card.dataset.category=p.category; card.dataset.productId=id; card.tabIndex=0;
    card.setAttribute('aria-label','Bekijk '+p.name);
    card.innerHTML =
        '<img loading="lazy" decoding="async" src="' + ((p.thumbnail || (p.images && p.images[0])) || DEFAULT_PRODUCT_IMAGE) + '" alt="'+p.name+'" />'
      + '<div class="card-body"><h3>'+p.name+'</h3><p class="lead">'+p.description+'</p><p class="price">€ '+p.price.toFixed(2)+'</p></div>'
      + '<div class="add"><span>'+p.extra+'</span>'
      +   '<button class="btn primary add-to-cart icon-btn" data-name="'+p.name+'" data-price="'+p.price+'">🛒'
      +     '<span class="qty-badge" style="'+(qty? 'display:grid' : 'display:none')+'">'+qty+'</span>'
      +   '</button>'
      + '</div>';

    if(currentFilter!=='all'&&p.category!==currentFilter) card.style.display='none';
    grid.appendChild(card);
  });

  // card click opens modal, except when add button clicked
  grid.querySelectorAll('.card').forEach(function(card){
    card.addEventListener('click',function(e){
      if (e.target && e.target.closest && e.target.closest('.add-to-cart')) return;
      card.classList.add('clicked'); setTimeout(function(){ card.classList.remove('clicked'); },400);
      showProductModal(card.dataset.productId);
    });
    card.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){
        e.preventDefault();
        card.classList.add('clicked'); setTimeout(function(){ card.classList.remove('clicked'); },400);
        showProductModal(card.dataset.productId);
      }
    });
  });

  // wire add-to-cart buttons
  grid.querySelectorAll('.add-to-cart').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var name = this.getAttribute('data-name');
      var price = parseFloat(this.getAttribute('data-price'));
      addToCart(name, price);
    });
  });
}

// Update only per-product badges
function refreshProductBadges(){
  document.querySelectorAll('#productGrid .add-to-cart').forEach(function(btn){
    var name = btn.getAttribute('data-name');
    var qty  = getCartQtyByName(name);
    var badge = btn.querySelector('.qty-badge');
    if(!badge){
      badge = document.createElement('span');
      badge.className='qty-badge';
      btn.appendChild(badge);
    }
    badge.textContent = qty;
    badge.style.display = qty ? 'grid' : 'none';
  });
}

function updateInspirationImages(){
  var i1=localStorage.getItem('inspirationImage1')||'https://i.ibb.co/zTspn9QG/hobby.png';
  var i2=localStorage.getItem('inspirationImage2')||'https://i.ibb.co/zTspn9QG/hobby.png';
  var i3=localStorage.getItem('inspirationImage3')||'https://i.ibb.co/zTspn9QG/hobby.png';
  if($('inspirationImage1')) $('inspirationImage1').src=i1;
  if($('inspirationImage2')) $('inspirationImage2').src=i2;
  if($('inspirationImage3')) $('inspirationImage3').src=i3;
}

// ---------- HERO SLIDESHOW ----------
function updateHeroImages(){
  // Get sources: heroImages[] > heroImage > defaults
  var arr = null;
  try { arr = JSON.parse(localStorage.getItem('heroImages') || 'null'); } catch(e){ arr = null; }
  if (!Array.isArray(arr) || !arr.length) {
    var single = localStorage.getItem('heroImage');
    if (single) arr = [single];
  }
  if (!arr || !arr.length) {
    arr = [DEFAULT_HERO_1];
  }

  // host inside .hero-card
  var host = document.querySelector('.hero-card');
  if (!host) {
    var main = $('heroImage1') || $('heroImage');
    if (main) main.src = arr[0];
    return;
  }

  // build slider
  host.innerHTML =
    '<div id="heroSlider" class="hero-slider" aria-label="Hero slideshow"></div>'+
    '<div id="heroDots" class="hero-dots" role="tablist" aria-label="Hero navigatie"></div>';

  var slider = document.getElementById('heroSlider');
  var dots   = document.getElementById('heroDots');

  arr.forEach(function(src, i){
    var img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = 'Hero '+(i+1);
    img.src = src;
    img.className = 'hero-slide'+(i===0?' active':'');
    slider.appendChild(img);

    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'hero-dot'+(i===0?' active':'');
    dot.setAttribute('role','tab');
    dot.setAttribute('aria-selected', i===0 ? 'true' : 'false');
    dot.setAttribute('aria-label', 'Ga naar slide '+(i+1));
    dot.addEventListener('click', function(){ go(i); });
    dots.appendChild(dot);
  });

  var idx = 0, N = arr.length, timer = null, touchX = 0;

  function setActive(n){
    var slides = slider.querySelectorAll('.hero-slide');
    var dotEls = dots.querySelectorAll('.hero-dot');
    slides.forEach(function(el, k){ el.classList.toggle('active', k===n); });
    dotEls.forEach(function(el, k){
      var on = k===n;
      el.classList.toggle('active', on);
      el.setAttribute('aria-selected', on?'true':'false');
    });
  }
  function go(n){
    idx = (n+N)%N;
    setActive(idx);
    restart();
  }
  function next(){ go(idx+1); }
  function restart(){
    if (timer) clearInterval(timer);
    if (N>1) timer = setInterval(next, 5000);
  }

  // swipe
  slider.addEventListener('touchstart', function(e){ touchX = e.changedTouches[0].clientX; }, {passive:true});
  slider.addEventListener('touchend', function(e){
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) { go(idx + (dx < 0 ? 1 : -1)); }
  }, {passive:true});

  setActive(0);
  restart();
}

// Product modal
function showProductModal(id){
  var p = products[id]; if(!p) return;
  var modal = $('productModal'), slider = $('productSlider'), thumbs = $('productThumbnails'), details = $('productDetails');
  if(!modal||!slider||!thumbs||!details) return;

  // Build source list (force default image if none, and replace blanks)
  var srcs = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  if (!srcs.length) srcs = [DEFAULT_PRODUCT_IMAGE];
  srcs = srcs.map(function(s){ return s || DEFAULT_PRODUCT_IMAGE; });

  // Thumbnails
  thumbs.innerHTML = srcs.map(function(src,i){
    return '<img src="'+src+'" alt="'+p.name+' mini '+(i+1)+'" data-index="'+i+'">';
  }).join('');

  // Slider images
  slider.innerHTML = srcs.map(function(src,i){
    return '<img src="'+src+'" alt="'+p.name+' '+(i+1)+'" class="'+(i===0?'active':'')+'">';
  }).join('');

  // Controls only if more than 1 image
  if (srcs.length > 1) {
    slider.insertAdjacentHTML('beforeend',
      '<div class="slider-controls"><button class="slider-btn prev" aria-label="Vorige">‹</button><button class="slider-btn next" aria-label="Volgende">›</button></div>'
    );
  }

  // Details
  details.innerHTML = '<h3>'+p.name+'</h3><p class="lead">'+p.description+'</p><p class="price">€ '+p.price.toFixed(2)+'</p>'
    + '<div class="add"><span>'+p.extra+'</span>'
    + '  <button class="btn primary add-to-cart" data-name="'+p.name+'" data-price="'+p.price+'">'
    + '    <span class="icon">🛒</span><span>Toevoegen</span>'
    + '  </button>'
    + '</div>';

  // Open modal
  modal.style.display='block';

  // Interactions
  var images = slider.querySelectorAll('img'); // ONLY slider images (controls added later)
  images = Array.prototype.slice.call(images); // convert to array
  var timgs  = thumbs.querySelectorAll('img');
  var current = 0;

  function setActive(i){
    images.forEach(function(im,ix){ im.classList.toggle('active', ix===i); });
    Array.prototype.forEach.call(timgs, function(im,ix){ im.classList.toggle('active', ix===i); });
  }

  function show(i){
    if (!images.length) return;
    current = (i + images.length) % images.length;
    setActive(current);
  }

  if (timgs[0]) timgs[0].classList.add('active');
  Array.prototype.forEach.call(timgs, function(im){
    im.addEventListener('click', function(){
      var idx = parseInt(im.getAttribute('data-index'), 10) || 0;
      show(idx);
    });
  });

  var prevBtn = slider.querySelector('.prev');
  var nextBtn = slider.querySelector('.next');
  if (prevBtn) prevBtn.addEventListener('click', function(){ show(current-1); });
  if (nextBtn) nextBtn.addEventListener('click', function(){ show(current+1); });

  // Touch swipe
  var sx=0; slider.addEventListener('touchstart',function(e){ if(!e.changedTouches||!e.changedTouches[0]) return; sx=e.changedTouches[0].screenX; }, {passive:true});
  slider.addEventListener('touchend',function(e){
    if(!e.changedTouches||!e.changedTouches[0]) return;
    var ex=e.changedTouches[0].screenX;
    if(sx-ex>50){ show(current+1); } else if(ex-sx>50){ show(current-1); }
  }, {passive:true});

  // Add to cart
  var btn = details.querySelector('.add-to-cart');
  if (btn) btn.addEventListener('click', function(){ addToCart(p.name, p.price); });

  badgeUpdate();
}

// DOM READY
document.addEventListener('DOMContentLoaded', function(){
  updateProductGrid();
  updateInspirationImages();
  updateHeroImages();
  updateCart();
  badgeUpdate();
  refreshProductBadges();

  // Filter chips
  document.querySelectorAll('.filters .chip').forEach(function(chip){
    var f=chip.getAttribute('data-filter');
    chip.addEventListener('click', function(){ applyFilter(f); refreshProductBadges(); });
    chip.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); applyFilter(f); refreshProductBadges(); } });
  });
  setActiveChip(currentFilter);

  // Open/close modals via UI buttons
  on('cartBtn','click',function(){ var m=$('cartModal'); if(m) m.style.display='block'; });
  on('cartModalClose','click',function(){ var m=$('cartModal'); if(m) m.style.display='none'; });
  on('productModalClose','click',function(){ var m=$('productModal'); if(m) m.style.display='none'; });
  on('modalClose','click',function(){ var m=$('modal'); if(m) m.style.display='none'; });

  // Checkout
  on('checkoutBtn','click',function(){
    if(!cart.length){ alert('Winkelwagen is leeg!'); return; }
    var msg=cart.map(function(i){ return i.name+' x'+i.quantity; }).join(', ');
    var m=$('message'); if(m) m.value='Bestelling: '+msg;
    var cm=$('cartModal'); if(cm) cm.style.display='none';
    var c=$('contact'); if(c) c.scrollIntoView({behavior:'smooth'});
  });

  // Contact form
  var form=$('contactForm');
  if(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var m=$('modal');
      if(m){ m.style.display='block'; setTimeout(function(){ m.style.display='none'; },2000); }
      form.reset();
    });
  }

  // Admin popup
  var loginModal=$('adminLoginModal');
  var loginClose=$('adminLoginClose');
  if(loginClose) loginClose.addEventListener('click',function(){ if(loginModal) loginModal.style.display='none'; });
  window.addEventListener('click',function(e){ if(e.target===loginModal){ loginModal.style.display='none'; } });
  var adminLoginBtn=$('adminLoginBtn');
  if(adminLoginBtn){
    adminLoginBtn.addEventListener('click',function(){
      var u=$('adminLoginUser').value.trim(),
          p=$('adminLoginPass').value.trim(),
          err=$('adminLoginError');
      if(u==='admin'&&p==='bloem123'){
        setAdminSession(2);
        if(loginModal) loginModal.style.display='none';
        window.location.href='admin.html';
      } else {
        if(err) err.textContent='Onjuiste inloggegevens';
      }
    });
  }

  if(window.location.hash==='#admin' && hasValidAdminSession()){
    window.location.replace('admin.html');
  }
});

// --- Close modals when clicking outside the box (overlay) + on Escape
(function(){
  var modalIds = ['cartModal','productModal','modal','adminLoginModal'];
  modalIds.forEach(function(id){
    var m = $(id);
    if(!m) return;
    m.addEventListener('click', function(e){
      if (e.target === m) { m.style.display = 'none'; }
    }, { passive: true });
  });
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Escape') return;
    modalIds.forEach(function(id){
      var m = $(id);
      if (m && getComputedStyle(m).display !== 'none') { m.style.display = 'none'; }
    });
  });
})();
