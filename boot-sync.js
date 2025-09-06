// boot-sync.js
// Pull shared JSON from /data and write into localStorage, then reload once.
(function () {
  const GUARD_KEY = "repoSyncDone";
  const guard = sessionStorage.getItem(GUARD_KEY);

  async function get(url) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }

  (async () => {
    const [products, heroSlides, inspirationItems] = await Promise.all([
      get("data/products.json"),
      get("data/hero.json"),
      get("data/inspiration.json"),
    ]);

    let changed = false;
    if (products) {
      localStorage.setItem("products", JSON.stringify(products));
      changed = true;
    }
    if (heroSlides) {
      localStorage.setItem("heroSlides", JSON.stringify(heroSlides));
      changed = true;
    }
    if (inspirationItems) {
      localStorage.setItem("inspirationItems", JSON.stringify(inspirationItems));
      changed = true;
    }

    // Reload once so your existing code renders with the shared data
    if (changed && !guard) {
      sessionStorage.setItem(GUARD_KEY, "1");
      location.reload();
    }
  })();
})();
