// --- CONFIGURATION ---
const LOGO_BASE_PATH = "data/logos/";
// CHANGE: Die Reihenfolge ist jetzt entscheidend und wird respektiert.
// Längere, spezifischere Varianten kommen zuerst.
const LOGO_VARIANTS = [
  "original",
  "plain",
  "line",
  "original-wordmark",
  "plain-wordmark",
  "line-wordmark",
];
const FALLBACK_LOGO = "data/logos/missing.svg";
const VISIBLE_SLOTS = 42,
  ANGLE_PER_SLOT = 360 / VISIBLE_SLOTS,
  TARGET_SLOT_INDEX = Math.floor(VISIBLE_SLOTS / 2);
const WHEEL_RADIUS = 320,
  SPIN_ROUNDS = 6,
  SPIN_DURATION_MS = 4000,
  LOGO_CYCLE_INTERVAL_MS = 75;
const TARGET_POSITION_ANGLE = 270;
const CONTENT_WEIGHTS = { quote: 50, image: 50 };

// --- DOM Elements ---
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

// --- State ---
let languages = [],
  quotesPool = [],
  imagesPool = [],
  logoManifest = {};
let currentRotation = 0,
  isSpinning = false,
  logoUpdateInterval = null,
  carouselDisplayIndex = 0,
  logoSlots = [];

// --- HILFSFUNKTIONEN ---

/**
 * CHANGE: Die Logik wurde auf einen exakten Abgleich umgestellt.
 */
function setLogo(imgElement, lang) {
  if (lang.logoOverride) {
    imgElement.src = `${LOGO_BASE_PATH}${lang.id}/${lang.logoOverride}`;
    return;
  }

  const availableLogos = logoManifest[lang.id];
  if (!availableLogos || availableLogos.length === 0) {
    imgElement.src = FALLBACK_LOGO;
    return;
  }

  // Finde das beste verfügbare Logo basierend auf der exakten Prioritätenliste.
  for (const variant of LOGO_VARIANTS) {
    // Finde eine Datei, deren Variante exakt unserer Priorität entspricht.
    const foundLogo = availableLogos.find((logoFile) => {
      const fileNameWithoutExt = logoFile.slice(0, -4); // Entferne '.svg'
      const fileVariant = fileNameWithoutExt.replace(`${lang.id}-`, ""); // Entferne 'ID-'
      return fileVariant === variant; // Exakter Abgleich!
    });

    if (foundLogo) {
      imgElement.src = `${LOGO_BASE_PATH}${lang.id}/${foundLogo}`;
      return;
    }
  }

  // Fallback: Wenn keine der bevorzugten Varianten gefunden wurde, nimm das erste verfügbare Logo.
  imgElement.src = `${LOGO_BASE_PATH}${lang.id}/${availableLogos[0]}`;
}

// ... (Rest der Hilfsfunktionen bis zum Ende bleibt exakt identisch)
function getRandomContentType() {
  const totalWeight = Object.values(CONTENT_WEIGHTS).reduce(
    (sum, weight) => sum + weight,
    0
  );
  let randomNum = Math.random() * totalWeight;
  for (const type in CONTENT_WEIGHTS) {
    if (randomNum < CONTENT_WEIGHTS[type]) {
      return type;
    }
    randomNum -= CONTENT_WEIGHTS[type];
  }
  return "quote";
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
    setLogo(slotImg, lang);
  }
}
function updateMainContent(lang) {
  langNameEl.textContent = lang.name;
  setLogo(langLogoEl, lang);
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
async function safeJsonParse(response) {
  if (!response.ok) {
    return [];
  }
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}
function showPlaceholder() {
  const contentType = getRandomContentType();
  const container = placeholderCard.children[0];
  container.innerHTML = "";
  let item;
  if (contentType === "quote" && quotesPool.length > 0) {
    item = quotesPool[Math.floor(Math.random() * quotesPool.length)];
    container.innerHTML = `<p class="text-xl italic" style="color: var(--text-secondary);">“${item.text}”</p><p class="mt-2" style="color: var(--text-primary);">– ${item.author}</p>`;
  } else if (contentType === "image" && imagesPool.length > 0) {
    item = imagesPool[Math.floor(Math.random() * imagesPool.length)];
    const imgSrc = `data/images/${item.src}`;
    const altText = item.alt || "Randomly selected image";
    let imageHTML = `<img src="${imgSrc}" alt="${altText}" class="max-w-xs mx-auto rounded-lg shadow-lg">`;
    if (item.href) {
      imageHTML = `<a href="${item.href}" target="_blank" rel="noopener noreferrer">${imageHTML}</a>`;
    }
    let buttonHTML = "";
    if (item.button_text && item.href) {
      buttonHTML = `<a href="${item.href}" target="_blank" rel="noopener noreferrer" class="inline-block mt-4 text-white font-bold py-2 px-4 rounded" style="background-color: var(--button-bg);">${item.button_text}</a>`;
    }
    container.innerHTML = imageHTML + buttonHTML;
  } else {
    if (quotesPool.length > 0) {
      item = quotesPool[Math.floor(Math.random() * quotesPool.length)];
      container.innerHTML = `<p class="text-xl italic" style="color: var(--text-secondary);">“${item.text}”</p><p class="mt-2" style="color: var(--text-primary);">– ${item.author}</p>`;
    } else {
      return;
    }
  }
  placeholderCard.classList.remove("hidden");
}
async function initialize() {
  try {
    const [langResponse, quotesResponse, imagesResponse, logoManifestResponse] =
      await Promise.all([
        fetch("data/languages.json"),
        fetch("data/quotes.json"),
        fetch("data/image_manifest.json"),
        fetch("data/logo_manifest.json"),
      ]);
    if (!langResponse.ok || !logoManifestResponse.ok)
      throw new Error("Could not load essential data.");
    languages = await langResponse.json();
    logoManifest = await logoManifestResponse.json();
    quotesPool = await safeJsonParse(quotesResponse);
    imagesPool = await safeJsonParse(imagesResponse);
    setupTheme();
    logoWheel.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.33, 1, 0.68, 1)`;
    createCarouselSlots();
    updateCarouselContent(0);
    card.classList.add("content-hidden");
    spinAndSelect(true);
  } catch (error) {
    console.error("Initialization failed:", error);
    document.body.innerHTML = `<div class="text-center text-red-500 p-8">Failed to initialize. Please check console for errors.</div>`;
  }
}
function spinAndSelect(isInitialLoad = false) {
  if (isSpinning || languages.length < 2) return;
  isSpinning = true;
  randomButton.disabled = true;
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
    randomButton.classList.remove("opacity-0", "pointer-events-none");
  }, SPIN_DURATION_MS);
}
randomButton.addEventListener("click", () => spinAndSelect(false));
initialize();
