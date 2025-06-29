// --- CONFIGURATION (unverändert) ---
const LOGO_BASE_PATH = "logos/";
const LOGO_VARIANTS = ["original", "plain", "line", "wordmark"];
const FALLBACK_LOGO = "images/generic-logo.svg";
const VISIBLE_SLOTS = 15,
  ANGLE_PER_SLOT = 360 / VISIBLE_SLOTS,
  TARGET_SLOT_INDEX = Math.floor(VISIBLE_SLOTS / 2);
const WHEEL_RADIUS = 400,
  SPIN_ROUNDS = 4,
  SPIN_DURATION_MS = 4000,
  LOGO_CYCLE_INTERVAL_MS = 75;
const TARGET_POSITION_ANGLE = 270;

// --- DOM Elements (unverändert) ---
const themeToggle = document.getElementById("theme-toggle");
const card = document.getElementById("card");
const langNameEl = document.getElementById("language-name");
const langLogoEl = document.getElementById("language-logo");
const codeBlockEl = document.getElementById("code-block");
const outputTypeEl = document.getElementById("output-type");
const outputTextEl = document.getElementById("output-text");
const commentsContentEl = document.getElementById("comments-content");
const placeholderCard = document.getElementById("placeholder-card");
const randomButton = document.getElementById("random-button");
const logoWheel = document.getElementById("logo-wheel");
const hljsThemeDark = document.getElementById("hljs-theme-dark");
const hljsThemeLight = document.getElementById("hljs-theme-light");

// --- State (unverändert) ---
let languages = [],
  placeholderContent = [],
  logoSlots = [];
let currentRotation = 0,
  isSpinning = false,
  logoUpdateInterval = null,
  carouselDisplayIndex = 0;

// --- Unveränderte Hilfsfunktionen ---
function setLogoWithFallback(imgElement, lang, variantIndex = 0) {
  if (variantIndex >= LOGO_VARIANTS.length) {
    imgElement.src = FALLBACK_LOGO;
    imgElement.onerror = null;
    return;
  }
  const variant = LOGO_VARIANTS[variantIndex];
  const path = `${LOGO_BASE_PATH}${lang.id}/${lang.id}-${variant}.svg`;
  imgElement.onerror = () =>
    setLogoWithFallback(imgElement, lang, variantIndex + 1);
  imgElement.onload = () => {
    imgElement.onerror = null;
  };
  imgElement.src = path;
}
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  themeToggle.checked = theme === "light";
  hljsThemeDark.media = theme === "dark" ? "all" : "none";
  hljsThemeLight.media = theme === "light" ? "all" : "none";
}
function setupTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme || (prefersDark ? "dark" : "light"));
  themeToggle.addEventListener("change", (e) => {
    applyTheme(e.target.checked ? "light" : "dark");
  });
}
function createCarouselSlots() {
  logoWheel.innerHTML = "";
  for (let i = 0; i < VISIBLE_SLOTS; i++) {
    const angle = i * ANGLE_PER_SLOT;
    const slot = document.createElement("div");
    slot.className = "logo-slot";
    slot.style.transform = `rotate(${angle}deg) translateY(-${WHEEL_RADIUS}px) rotate(-${angle}deg)`;
    const img = document.createElement("img");
    slot.appendChild(img);
    logoWheel.appendChild(slot);
    logoSlots.push(img);
  }
}
function updateCarouselContent(centerIndex) {
  if (languages.length === 0) return;
  const half = Math.floor(VISIBLE_SLOTS / 2);
  for (let i = 0; i < VISIBLE_SLOTS; i++) {
    const langIndexOffset = i - half;
    let langIndex =
      (centerIndex + langIndexOffset + languages.length) % languages.length;
    const slotImg = logoSlots[i];
    const lang = languages[langIndex];
    setLogoWithFallback(slotImg, lang);
  }
}
function showPlaceholder() {
  if (placeholderContent.length === 0) return;
  const container = placeholderCard.children[0];
  const randomContent =
    placeholderContent[Math.floor(Math.random() * placeholderContent.length)];
  container.innerHTML = "";
  if (randomContent.author) {
    container.innerHTML = `<p class="text-xl italic" style="color: var(--text-secondary);">“${randomContent.text}”</p><p class="mt-2" style="color: var(--text-primary);">– ${randomContent.author}</p>`;
  } else if (randomContent.src) {
    container.innerHTML = `<a href="${randomContent.href}" target="_blank" rel="noopener noreferrer"><img src="${randomContent.src}" alt="${randomContent.alt}" class="max-w-xs mx-auto rounded-lg shadow-lg"></a>`;
  } else if (randomContent.button_text) {
    container.innerHTML = `<p class="text-xl font-semibold" style="color: var(--text-primary);">${randomContent.text}</p><a href="${randomContent.href}" target="_blank" rel="noopener noreferrer" class="inline-block mt-4 text-white font-bold py-2 px-4 rounded" style="background-color: var(--button-bg);">${randomContent.button_text}</a>`;
  }
  placeholderCard.classList.remove("hidden");
}
async function safeJsonParse(response) {
  if (!response.ok) {
    return [];
  }
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}
function updateMainContent(lang) {
  langNameEl.textContent = lang.name;
  setLogoWithFallback(langLogoEl, lang);
  codeBlockEl.textContent = lang.code;
  codeBlockEl.className = `language-${lang.highlightLang}`;
  codeBlockEl.removeAttribute("data-highlighted");
  hljs.highlightElement(codeBlockEl);
  outputTypeEl.textContent = lang.output.type;
  outputTextEl.textContent = lang.output.text;
  commentsContentEl.innerHTML = "";
  if (lang.comments.single) {
    const pre = document.createElement("pre");
    pre.className = "font-mono whitespace-pre-wrap p-2 rounded";
    pre.style =
      "background-color: var(--bg-primary); color: var(--text-secondary);";
    pre.textContent = lang.comments.single;
    commentsContentEl.appendChild(pre);
  }
  if (lang.comments.multi) {
    const pre = document.createElement("pre");
    pre.className = "font-mono whitespace-pre-wrap p-2 rounded";
    pre.style =
      "background-color: var(--bg-primary); color: var(--text-secondary);";
    pre.textContent = lang.comments.multi;
    commentsContentEl.appendChild(pre);
  }
}
async function initialize() {
  try {
    const [langResponse, quotesResponse, imagesResponse, adsResponse] =
      await Promise.all([
        fetch("data/languages.json"),
        fetch("data/quotes.json"),
        fetch("data/images.json"),
        fetch("data/ads.json"),
      ]);
    if (!langResponse.ok)
      throw new Error("Could not load essential language data.");
    languages = await langResponse.json();
    const quotes = await safeJsonParse(quotesResponse);
    const images = await safeJsonParse(imagesResponse);
    const ads = await safeJsonParse(adsResponse);
    placeholderContent = [...quotes, ...images, ...ads];
    setupTheme();
    logoWheel.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.33, 1, 0.68, 1)`;
    createCarouselSlots();
    updateCarouselContent(0);
    card.classList.add("content-hidden");
    spinAndSelect(true);
  } catch (error) {
    console.error("Initialization failed:", error);
    document.body.innerHTML = `<div class="text-center text-red-500 p-8">Failed to initialize. Please check console for errors and ensure 'data/languages.json' exists.</div>`;
  }
}

/**
 * CHANGE: Die Spin-Funktion blendet jetzt den Button aus und ein.
 */
function spinAndSelect(isInitialLoad = false) {
  if (isSpinning || languages.length < 2) return;
  isSpinning = true;
  randomButton.disabled = true;
  // CHANGE: Button unsichtbar und nicht klickbar machen
  randomButton.classList.add("opacity-0", "pointer-events-none");

  if (!isInitialLoad) {
    card.classList.add("content-hidden");
    showPlaceholder();
  }

  const winnerIndex = Math.floor(Math.random() * languages.length);
  const winner = languages[winnerIndex];

  const cleanBaseRotation = Math.ceil(currentRotation / 360) * 360;
  const targetSlotAngle = TARGET_SLOT_INDEX * ANGLE_PER_SLOT;
  const finalRotation =
    cleanBaseRotation +
    SPIN_ROUNDS * 360 +
    TARGET_POSITION_ANGLE -
    targetSlotAngle;

  logoWheel.style.transform = `rotate(${finalRotation}deg)`;
  currentRotation = finalRotation;

  logoUpdateInterval = setInterval(() => {
    carouselDisplayIndex = (carouselDisplayIndex + 1) % languages.length;
    updateCarouselContent(carouselDisplayIndex);
  }, LOGO_CYCLE_INTERVAL_MS);

  setTimeout(() => {
    clearInterval(logoUpdateInterval);
    carouselDisplayIndex = winnerIndex;
    updateCarouselContent(carouselDisplayIndex);
    updateMainContent(winner);

    placeholderCard.classList.add("hidden");
    card.classList.remove("content-hidden");

    isSpinning = false;
    randomButton.disabled = false;
    // CHANGE: Button wieder sichtbar machen
    randomButton.classList.remove("opacity-0", "pointer-events-none");
  }, SPIN_DURATION_MS);
}

// --- Event Listeners & Initialization ---
randomButton.addEventListener("click", () => spinAndSelect(false));
initialize();
