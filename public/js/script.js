/* =========================================================
   Helpers + DOM
========================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const hamburger = $(".hamburger");
const nav = $("nav");
const searchBtn = $(".search-btn");
const searchContainer = $(".search-container");

const slides = $$(".slide");
const dots = $$(".dot");
const nextBtn = $(".carousel-arrow.right") || document.getElementsByClassName("right")[0];
const prevBtn = $(".carousel-arrow.left") || document.getElementsByClassName("left")[0];

const cards = $$(".popular-section .card");
const heroes = $$(".hero-content");
const parentDivs = $$(".slide");

const searchInput = $(".search-input");
const searchIcon = $(".search-icon");
const searchResults = $("#search-results");

const authOverlay = $("#authOverlay");
const authClose = $("#authClose");
const loginTab = $("#loginTab");
const registerTab = $("#registerTab");
const loginForm = $("#loginForm");
const registerForm = $("#registerForm");

const openMyList = $("#openMyList");
const myListOverlay = $("#myListOverlay");
const myListClose = $("#myListClose");
const myListTable = $("#myListTable");

const profileAvatar = $("#profileAvatar"); // make sure your img has id="profileAvatar"

const msgOverlay = $("#msgOverlay");
const msgText = $("#msgText");
const msgOkBtn = $("#msgOkBtn");
const msgLoginBtn = $("#msgLoginBtn");

const genresBtn = $("#genresBtn");
const genresDropdown = $("#genresDropdown");
const genresList = $("#genresList");

const genreSection = $("#genreSection");
const genreTitle = $("#genreTitle");
const genreGrid = $("#genreGrid");
const genreCloseBtn = $("#genreCloseBtn");

/* =========================================================
   LocalStorage Cache
========================================================= */

function getCache(key, maxAgeMs) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const { time, data } = JSON.parse(raw);
    if (Date.now() - time > maxAgeMs) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function setCache(key, data) {
  localStorage.setItem(key, JSON.stringify({ time: Date.now(), data }));
}

/* =========================================================
   UI: Message Modal (replaces alert)
========================================================= */

function openMessage(text, { showLogin = true } = {}) {
  if (!msgOverlay) return alert(text);

  msgText.textContent = text;
  msgLoginBtn.style.display = showLogin ? "inline-flex" : "none";

  msgOverlay.classList.add("open");
  msgOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeMessage() {
  if (!msgOverlay) return;
  msgOverlay.classList.remove("open");
  msgOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

if (msgOkBtn) msgOkBtn.addEventListener("click", closeMessage);
if (msgOverlay) {
  msgOverlay.addEventListener("click", (e) => {
    if (e.target === msgOverlay) closeMessage();
  });
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMessage();
});

if (msgLoginBtn) {
  msgLoginBtn.addEventListener("click", () => {
    closeMessage();
    openAuth();
  });
}

/* =========================================================
   Hamburger + Mobile Header
========================================================= */

if (hamburger) {
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    nav?.classList.toggle("active");
    searchContainer?.classList.remove("active");
  });
}

if (searchBtn) {
  searchBtn.addEventListener("click", () => {
    searchContainer?.classList.toggle("active");
    hamburger?.classList.remove("active");
    nav?.classList.remove("active");
  });
}

$$("nav a").forEach((link) => {
  link.addEventListener("click", () => {
    hamburger?.classList.remove("active");
    nav?.classList.remove("active");
  });
});

/* =========================================================
   Slideshow
========================================================= */

let currentIndex = 0;

function showSlide(index) {
  slides.forEach((slide, i) => slide.classList.toggle("active", i === index));
  dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
  currentIndex = index;
}

if (nextBtn) nextBtn.addEventListener("click", () => showSlide((currentIndex + 1) % slides.length));
if (prevBtn) prevBtn.addEventListener("click", () => showSlide((currentIndex - 1 + slides.length) % slides.length));

setInterval(() => showSlide((currentIndex + 1) % slides.length), 4000);

/* =========================================================
   Anime API Helpers
========================================================= */

function shortText(text, maxLen) {
  if (!text) return "No description available.";
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  const sliced = cleaned.slice(0, maxLen);
  return sliced.slice(0, sliced.lastIndexOf(" ")) + "...";
}

async function fetchJson(url, tries = 4) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    const res = await fetch(url);

    if (res.ok) return res.json();

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After"));
      const waitMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : 800 * attempt;
      console.warn(`429 for ${url}. Waiting ${waitMs}ms (attempt ${attempt}/${tries})`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} for ${url}\n${text}`);
  }

  throw new Error(`429 Too Many Requests (gave up) for ${url}`);
}

async function fetchJsonCached(url, cacheKey, maxAgeMs = 1000 * 60 * 30) {
  const cached = getCache(cacheKey, maxAgeMs);
  if (cached) return cached;

  const fresh = await fetchJson(url);
  setCache(cacheKey, fresh);
  return fresh;
}

/* =========================================================
   Populate Cards + Heroes
========================================================= */

function fillCards(cardSlice, animeArray) {
  cardSlice.forEach((card, index) => {
    const anime = animeArray[index];
    if (!anime) return;

    card.dataset.url = anime.url;
    card.dataset.malId = anime.mal_id;
    card.dataset.title = anime.title;
    card.dataset.image = anime.images?.jpg?.image_url || "";

    const img = card.querySelector("img");
    if (img) {
      img.src = anime.images?.jpg?.image_url || "";
      img.alt = anime.title || "Anime";
    }

    const h3 = card.querySelector("h3");
    if (!h3) return;

    const heart = h3.querySelector(".heart") || document.createElement("span");
    heart.className = "heart";
    heart.textContent = "❤︎";

    h3.innerHTML = `<span class="title-text">${anime.title || "Untitled"}</span>`;
    h3.appendChild(heart);
  });
}

function fillHeroes(heroAnimes) {
  heroAnimes.forEach((anime, i) => {
    if (!anime || !heroes[i] || !parentDivs[i]) return;

    heroes[i].querySelector("h1").textContent = anime.title_english || anime.title || "Untitled";
    heroes[i].querySelector("p").textContent = shortText(anime.synopsis, 90);

    const img = parentDivs[i].querySelector(".hero-bg");
    const blur = parentDivs[i].querySelector(".hero-bg-blur");
    const heroImg = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || "";

    if (img) img.src = heroImg;
    if (blur) blur.src = heroImg;

    parentDivs[i].dataset.url = anime.url || "";
    parentDivs[i].dataset.malId = anime.mal_id;
    parentDivs[i].dataset.title = anime.title || "";
    parentDivs[i].dataset.image = anime.images?.jpg?.image_url || "";
  });
}

async function initAnime() {
  try {
    const [popularJson, trendingJson, topRatedJson] = await Promise.all([
      fetchJsonCached("https://api.jikan.moe/v4/top/anime?filter=bypopularity", "cache_popular", 1000 * 60 * 60),
      fetchJsonCached("https://api.jikan.moe/v4/seasons/now?limit=10", "cache_trending", 1000 * 60 * 30),
      fetchJsonCached("https://api.jikan.moe/v4/top/anime?limit=5", "cache_toprated", 1000 * 60 * 60),
    ]);

    const popular15 = (popularJson.data || []).slice(0, 15);
    const trending10 = trendingJson.data || [];
    const topRated5 = topRatedJson.data || [];

    fillCards(cards.slice(0, 15), popular15);
    fillCards(cards.slice(15, 25), trending10);
    fillCards(cards.slice(25, 30), topRated5);

    const heroAnimes = [popular15[0], trending10[0], topRated5[2]].filter(Boolean);
    fillHeroes(heroAnimes);
  } catch (err) {
    console.error("initAnime failed:", err);
  }
}

/* =========================================================
   Search
========================================================= */

function debounce(fn, delay = 350) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function hideResults() {
  if (!searchResults) return;
  searchResults.hidden = true;
  searchResults.innerHTML = "";
}

function showResults(html) {
  if (!searchResults) return;
  searchResults.innerHTML = html;
  searchResults.hidden = false;
}

async function searchAnime(q) {
  const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&sfw=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

/* =========================================================
   Auth + Session state + Avatar
========================================================= */

let isLoggedIn = false;
let currentUser = null;
let likedIds = new Set();

const DEFAULT_AVATAR_SVG =
  `data:image/svg+xml;utf8,` +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
    <path opacity=".25" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.33 0-6 2.01-6 4.5V20h12v-1.5c0-2.49-2.67-4.5-6-4.5z"/>
  </svg>
`);

function setAvatar(src) {
  if (!profileAvatar) return;
  profileAvatar.style.opacity = "0";
  setTimeout(() => {
    profileAvatar.src = src;
    profileAvatar.style.opacity = "1";
  }, 120);
}

function setLoggedIn(user) {
  isLoggedIn = true;
  currentUser = user;
  $("#profile_name").textContent = user.username;
  setAvatar("/public/img/profile_picture.jpg");
}

function setLoggedOut() {
  isLoggedIn = false;
  currentUser = null;
  $("#profile_name").textContent = "Sign in";
  setAvatar(DEFAULT_AVATAR_SVG);
}

function openAuth() {
  authOverlay?.classList.add("open");
  authOverlay?.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeAuth() {
  authOverlay?.classList.remove("open");
  authOverlay?.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  authOverlay?.querySelectorAll("input").forEach((input) => (input.value = ""));
  switchToLogin();
}

function switchToLogin() {
  loginTab?.classList.add("active");
  registerTab?.classList.remove("active");

  registerForm?.classList.add("slide-right");
  registerForm?.classList.add("hidden");

  loginForm?.classList.remove("hidden");
  setTimeout(() => registerForm?.classList.remove("slide-right"), 250);
}

function switchToRegister() {
  registerTab?.classList.add("active");
  loginTab?.classList.remove("active");

  loginForm?.classList.add("slide-left");
  loginForm?.classList.add("hidden");

  registerForm?.classList.remove("hidden");
  setTimeout(() => loginForm?.classList.remove("slide-left"), 250);
}

authClose?.addEventListener("click", closeAuth);
loginTab?.addEventListener("click", switchToLogin);
registerTab?.addEventListener("click", switchToRegister);

$("#openAuthBtn")?.addEventListener("click", async () => {
  if (!isLoggedIn) return openAuth();

  const ok = confirm(`Logged in as ${currentUser.username}. Log out?`);
  if (!ok) return;

  await fetch("/logout", { method: "POST" });
  setLoggedOut();
});

authOverlay?.addEventListener("click", (e) => e.stopPropagation());

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = $("#loginEmail").value;
  const password = $("#loginPassword").value;

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return openMessage(data.message || "Login failed", { showLogin: false });

  setLoggedIn({ username: data.username, email });
  closeAuth();

  markLikedHearts().catch((err) => {
    console.error("markLikedHearts failed:", err);
  })
});

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = $("#regUsername").value;
  const email = $("#regEmail").value;
  const p1 = $("#regPassword").value;
  const p2 = $("#regPassword2").value;

  if (p1 !== p2) return openMessage("Passwords do not match!", { showLogin: false });

  const name = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
  const res = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: name, email, password: p1 }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return openMessage(data.message || "Register failed", { showLogin: false });

  openMessage("Account created! You can log in now.", { showLogin: false });
  switchToLogin();
});

async function checkLogin() {
  const res = await fetch("/me");
  if (!res.ok) return setLoggedOut();

  const data = await res.json().catch(() => ({}));
  if (data.ok) {
    setLoggedIn(data.user);
    await markLikedHearts();
  } else {
    setLoggedOut();
  }
}

/* =========================================================
   My List API
========================================================= */

async function addToMyList(payload) {
  const res = await fetch("/api/my-list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed");
  return data;
}

async function removeFromMyList(malId) {
  const res = await fetch(`/api/my-list/${malId}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed");
  return data;
}

/* =========================================================
   Hearts Sync (cards + hero + search)
========================================================= */

function markSearchHearts() {
  $$(".search-result-card").forEach((card) => {
    const btn = $(".search-heart", card);
    if (!btn) return;

    const id = card.getAttribute("data-mal-id");
    btn.classList.toggle("liked", likedIds.has(String(id)));
  });
}

async function markLikedHearts() {
  if (!isLoggedIn) return;

  const res = await fetch("/api/my-list");
  if (!res.ok) return;

  const data = await res.json().catch(() => ({}));
  likedIds = new Set((data.items || []).map((x) => String(x.malId)));

  // Cards
  $$(".card").forEach((card) => {
    const heart = $(".heart", card);
    if (!heart) return;
    heart.classList.toggle("liked", likedIds.has(String(card.dataset.malId)));
  });

  // Hero buttons
  $$(".slide").forEach((slide) => {
    const btn = $(".hero-like-btn", slide);
    if (!btn) return;

    const isLiked = likedIds.has(String(slide.dataset.malId));
    btn.classList.toggle("liked", isLiked);
    btn.textContent = isLiked ? "❤︎ Added" : "❤︎ Add to My List";
  });

  // Search panel
  markSearchHearts();
}

/* =========================================================
   Search Render + Click Handling
========================================================= */

function renderResults(items) {
  if (!items.length) {
    showResults(`<div class="search-results-empty">No results.</div>`);
    return;
  }

  const html = items.slice(0, 12).map((a) => {
    const img = a.images?.jpg?.image_url || "";
    const year = a.year || (a.aired?.prop?.from?.year ?? "");
    const type = a.type || "";
    const title = a.title || "Untitled";

    return `
      <div class="search-result-card"
          data-url="${a.url || ""}"
          data-mal-id="${a.mal_id}"
          data-title="${title.replaceAll('"', "&quot;")}"
          data-image="${img.replaceAll('"', "&quot;")}">
        <img src="${img}" alt="${title.replaceAll('"', "&quot;")}">
        <div class="search-result-info">
          <div class="search-result-title">${title}</div>
          <div class="search-result-meta">${type}${year ? " • " + year : ""}</div>
        </div>
        <button class="search-heart" type="button" aria-label="Add to My List">❤︎</button>
      </div>
    `;
  }).join("");

  showResults(`<div class="search-results-grid">${html}</div>`);
  markSearchHearts();
}

const runSearch = debounce(async () => {
  const q = searchInput?.value.trim() || "";
  if (q.length < 2) return hideResults();

  try {
    const items = await searchAnime(q);
    renderResults(items);
  } catch (err) {
    console.error(err);
    showResults(`<div class="search-results-empty">Error loading results. Try again.</div>`);
  }
}, 350);

searchInput?.addEventListener("input", runSearch);
searchIcon?.addEventListener("click", () => runSearch());

// close search on outside click
document.addEventListener("click", (e) => {
  const inside = e.target.closest(".search-container") || e.target.closest("#search-results");
  if (!inside) hideResults();
});

/* =========================================================
   Global Click Delegation (cards, slides, hearts)
========================================================= */

// Open MAL when clicking a card (not the heart)
document.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (!card) return;
  if (e.target.closest(".heart")) return;
  const url = card.dataset.url;
  if (url) window.open(url, "_blank");
});

// Open MAL when clicking a hero slide (ignore buttons)
document.addEventListener("click", (e) => {
  const slide = e.target.closest(".slide");
  if (!slide) return;

  if (e.target.closest(".buttons")) return;
  if (e.target.closest("button")) return;

  const url = slide.dataset.url;
  if (url) window.open(url, "_blank");
});

// Toggle card heart
document.addEventListener("click", async (e) => {
  const heart = e.target.closest(".heart");
  if (!heart) return;

  e.preventDefault();
  e.stopPropagation();

  if (!isLoggedIn) return openMessage("You must log in first to use My List.");

  const card = heart.closest(".card");
  if (!card) return;

  const malId = Number(card.dataset.malId);
  const payload = {
    malId,
    title: card.dataset.title,
    image: card.dataset.image,
    url: card.dataset.url,
  };

  const willLike = !heart.classList.contains("liked");

  try {
    if (willLike) {
      await addToMyList(payload);
      likedIds.add(String(malId));
      heart.classList.add("liked");
    } else {
      await removeFromMyList(malId);
      likedIds.delete(String(malId));
      heart.classList.remove("liked");
    }
    markLikedHearts();
  } catch (err) {
    console.error(err);
    openMessage("Could not update My List.", { showLogin: false });
  }
});

// Toggle hero button
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".hero-like-btn");
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  if (!isLoggedIn) return openMessage("You must log in first to use My List.");

  const slide = btn.closest(".slide");
  if (!slide) return;

  const malId = Number(slide.dataset.malId);
  const payload = {
    malId,
    title: slide.dataset.title,
    image: slide.dataset.image,
    url: slide.dataset.url,
  };

  const willLike = !btn.classList.contains("liked");

  try {
    if (willLike) {
      await addToMyList(payload);
      likedIds.add(String(malId));
      btn.classList.add("liked");
      btn.textContent = "❤︎ Added";
    } else {
      await removeFromMyList(malId);
      likedIds.delete(String(malId));
      btn.classList.remove("liked");
      btn.textContent = "❤︎ Add to My List";
    }
    markLikedHearts();
  } catch (err) {
    console.error(err);
    openMessage("Could not update My List.", { showLogin: false });
  }
});

// Toggle search heart + block card open
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".search-heart");
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  if (!isLoggedIn) return openMessage("You must log in first to use My List.");

  const card = btn.closest(".search-result-card");
  if (!card) return;

  const malId = Number(card.getAttribute("data-mal-id"));
  const payload = {
    malId,
    title: card.getAttribute("data-title"),
    image: card.getAttribute("data-image"),
    url: card.getAttribute("data-url"),
  };

  const willLike = !btn.classList.contains("liked");

  try {
    if (willLike) {
      await addToMyList(payload);
      likedIds.add(String(malId));
      btn.classList.add("liked");
    } else {
      await removeFromMyList(malId);
      likedIds.delete(String(malId));
      btn.classList.remove("liked");
    }
    markLikedHearts();
  } catch (err) {
    console.error(err);
    openMessage("Could not update My List.", { showLogin: false });
  }
});

// Search card open (not when heart)
document.addEventListener("click", (e) => {
  const el = e.target.closest(".search-result-card");
  if (!el) return;
  if (e.target.closest(".search-heart")) return;

  const url = el.getAttribute("data-url");
  if (url) window.open(url, "_blank");
});

/* =========================================================
   My List Modal
========================================================= */

function openMyListPanel() {
  myListOverlay?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeMyListPanel() {
  myListOverlay?.classList.remove("open");
  document.body.style.overflow = "";
}

myListClose?.addEventListener("click", closeMyListPanel);
myListOverlay?.addEventListener("click", (e) => {
  if (e.target === myListOverlay) closeMyListPanel();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMyListPanel();
});

async function loadMyList() {
  const res = await fetch("/api/my-list");
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    openMessage(data.message || "Please log in first.");
    return;
  }

  const items = data.items || [];
  myListTable.innerHTML =
    items
      .map((a, idx) => `
        <div class="mylist-row" data-url="${a.url}">
          <div>${idx + 1}</div>
          <div><img src="${a.image}" alt=""></div>
          <div>${a.title}</div>
        </div>
      `)
      .join("") ||
    `<div style="padding:10px;color:rgba(255,255,255,0.7)">No items yet.</div>`;

  $$(".mylist-row", myListTable).forEach((row) => {
    row.addEventListener("click", () => {
      const url = row.dataset.url;
      if (url) window.open(url, "_blank");
    });
  });
}

openMyList?.addEventListener("click", async (e) => {
  e.preventDefault();
  if (!isLoggedIn) return openMessage("You must log in first to use My List.");

  openMyListPanel();
  await loadMyList();
});

/* =========================================================
   Genres (same behavior, cleaner)
========================================================= */

const GENRES_CACHE_MS = 1000 * 60 * 60 * 24; // 24h
const GENRE_ANIME_CACHE_MS = 1000 * 60 * 15; // 15 min

function openGenresDropdown() {
  if (!genresDropdown) return;
  genresDropdown.hidden = false;
}

function closeGenresDropdown() {
  if (!genresDropdown) return;
  genresDropdown.hidden = true;
}

genresBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  if (!genresDropdown) return;
  genresDropdown.hidden ? openGenresDropdown() : closeGenresDropdown();
});

document.addEventListener("click", (e) => {
  // only close if click is outside the genres container
  if (!e.target.closest(".genres-wrap")) closeGenresDropdown();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeGenresDropdown();
});

genreCloseBtn?.addEventListener("click", () => {
  if (!genreSection || !genreGrid) return;
  genreSection.hidden = true;
  genreGrid.innerHTML = "";
});

async function loadGenres() {
  if (!genresList) return;

  try {
    const url = "https://api.jikan.moe/v4/genres/anime";
    const json = await fetchJsonCached(url, "cache_genres_list", GENRES_CACHE_MS);

    const items = (json.data || []).slice().sort((a, b) => a.name.localeCompare(b.name));

    genresList.innerHTML = items
      .map((g) => `<div class="genres-item" data-id="${g.mal_id}" data-name="${g.name}">${g.name}</div>`)
      .join("");

    $$(".genres-item", genresList).forEach((el) => {
      el.addEventListener("click", async () => {
        const id = el.getAttribute("data-id");
        const name = el.getAttribute("data-name");
        closeGenresDropdown();
        await loadGenreAnime(id, name);
      });
    });
  } catch (err) {
    console.error(err);
    genresList.innerHTML = `<div class="genres-loading">Could not load genres.</div>`;
  }
}

function renderGenreAnime(animes) {
  if (!genreGrid) return;

  if (!animes.length) {
    genreGrid.innerHTML = `<div style="padding:10px;color:rgba(255,255,255,0.7)">No results.</div>`;
    return;
  }

  genreGrid.innerHTML = animes.slice(0, 24).map((a) => {
    const img = a.images?.jpg?.image_url || "";
    const title = a.title || "Untitled";
    const url = a.url || "";
    const malId = a.mal_id;

    const liked = likedIds.has(String(malId)) ? "liked" : "";

    return `
      <div class="genre-card"
          data-url="${url}"
          data-mal-id="${malId}"
          data-title="${title.replaceAll('"', "&quot;")}"
          data-image="${img.replaceAll('"', "&quot;")}">

        <img src="${img}" alt="${title.replaceAll('"', "&quot;")}">

        <div class="genre-info">
          <div class="genre-title-row">
            <div class="genre-title-text">${title}</div>
            <button class="genre-heart ${liked}" type="button" aria-label="Add to My List">❤</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

async function loadGenreAnime(genreId, genreName) {
  if (!genreSection || !genreTitle || !genreGrid) return;

  genreSection.hidden = false;
  genreTitle.textContent = genreName;
  genreGrid.innerHTML = `<div style="padding:10px;color:rgba(255,255,255,0.7)">Loading...</div>`;

  try {
    const url = `https://api.jikan.moe/v4/anime?genres=${encodeURIComponent(genreId)}&sfw=true&order_by=score&sort=desc&limit=24`;
    const json = await fetchJsonCached(url, `cache_genre_${genreId}`, GENRE_ANIME_CACHE_MS);
    renderGenreAnime(json.data || []);
  } catch (err) {
    console.error(err);
    genreGrid.innerHTML = `<div style="padding:10px;color:rgba(255,255,255,0.7)">Could not load this genre. Try again.</div>`;
  }
}

// Open MAL from genre card (not heart)
document.addEventListener("click", (e) => {
  const card = e.target.closest(".genre-card");
  if (!card) return;
  if (e.target.closest(".genre-heart")) return;

  const url = card.getAttribute("data-url");
  if (url) window.open(url, "_blank");
});

// Toggle genre heart
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".genre-heart");
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  if (!isLoggedIn) return openMessage("Please log in first.");

  const card = btn.closest(".genre-card");
  if (!card) return;

  const malId = Number(card.getAttribute("data-mal-id"));
  const payload = {
    malId,
    title: card.getAttribute("data-title"),
    image: card.getAttribute("data-image"),
    url: card.getAttribute("data-url"),
  };

  const willLike = !btn.classList.contains("liked");

  try {
    if (willLike) {
      await addToMyList(payload);
      likedIds.add(String(malId));
      btn.classList.add("liked");
    } else {
      await removeFromMyList(malId);
      likedIds.delete(String(malId));
      btn.classList.remove("liked");
    }
    markLikedHearts();
  } catch (err) {
    console.error(err);
    openMessage("Could not update My List.", { showLogin: false });
  }
});

/* =========================================================
   Boot
========================================================= */

(async () => {
  await initAnime();
  await checkLogin();
  loadGenres();
})();
