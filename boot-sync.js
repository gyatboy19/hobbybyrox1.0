<script>
/**
 * Hydrate localStorage from the repo so other devices see the same data.
 * Expects:
 *   /data/products.json
 *   /data/hero.json            -> ["url1","url2",...]
 *   /data/inspiration.json     -> ["img1","img2","img3"]
 */
(function(){
  // Handles GitHub Pages subfolder (e.g. /hobbybyrox1.0)
  var base = '';
  if (location.hostname.endsWith('github.io')) {
    var parts = location.pathname.split('/').filter(Boolean);
    if (parts.length) base = '/' + parts[0]; // repo name
  }

  function bust(u){ return u + (u.indexOf('?')>-1 ? '&' : '?') + 'v=' + Date.now(); }

  function setLS(k, v){ try { localStorage.setItem(k, v); } catch(e){} }

  Promise.all([
    fetch(bust(base + '/data/products.json')).then(r => r.ok ? r.json() : null).catch(()=>null),
    fetch(bust(base + '/data/hero.json')).then(r => r.ok ? r.json() : null).catch(()=>null),
    fetch(bust(base + '/data/inspiration.json')).then(r => r.ok ? r.json() : null).catch(()=>null)
  ]).then(function([products, hero, insp]){
    if (products && typeof products === 'object') {
      setLS('products', JSON.stringify(products));
    }
    if (Array.isArray(hero)) {
      setLS('heroImages', JSON.stringify(hero.filter(Boolean)));
    }
    if (Array.isArray(insp)) {
      if (insp[0]) setLS('inspirationImage1', insp[0]);
      if (insp[1]) setLS('inspirationImage2', insp[1]);
      if (insp[2]) setLS('inspirationImage3', insp[2]);
    }
  }).catch(function(){ /* offline ok */ });
})();
</script>
