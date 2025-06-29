// --- CONFIGURATION ---
const LOGO_BASE_PATH = "logos/";
const LOGO_VARIANT = "original";
const VISIBLE_SLOTS = 15;
const ANGLE_PER_SLOT = 360 / VISIBLE_SLOTS;
const TARGET_SLOT_INDEX = Math.floor(VISIBLE_SLOTS / 2);
const WHEEL_RADIUS = 400,
  SPIN_ROUNDS = 4,
  SPIN_DURATION_MS = 4000,
  LOGO_CYCLE_INTERVAL_MS = 75;
const TARGET_POSITION_ANGLE = 270;
const QUOTES = [
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  {
    text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
    author: "Martin Fowler",
  },
  {
    text: "First, solve the problem. Then, write the code.",
    author: "John Johnson",
  },
  {
    text: "Measuring programming progress by lines of code is like measuring aircraft building progress by weight.",
    author: "Bill Gates",
  },
  {
    text: "There are only two hard things in Computer Science: cache invalidation and naming things.",
    author: "Phil Karlton",
  },
  {
    text: "Hello, World! – because sometimes that’s all you need.",
    author: "Someone who hates config files",
  },
  {
    text: "No frameworks. No build tools. Just Hello.",
    author: "The Bare Metal Club",
  },
  {
    text: "The 'Hello, World!' program is the software equivalent of a baby’s first words.",
    author: "Unknown",
  },
  {
    text: "Before you build the next unicorn startup, make sure you can say 'Hello, World!' first.",
    author: "Every CS Professor Ever",
  },
  {
    text: "‘Hello, World!’ is not just a greeting. It’s a declaration of intent.",
    author: "Anonymous Hacker",
  },
  {
    text: "Hello, World! – the first step in a lifelong debugging session.",
    author: "Stack Overflow Commenter",
  },
  {
    text: "If you can’t say Hello, World!, you probably shouldn’t be writing a compiler.",
    author: "Linus Torvalds (probably not)",
  },
];

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
const quoteTextEl = document.getElementById("quote-text");
const quoteAuthorEl = document.getElementById("quote-author");
const randomButton = document.getElementById("random-button");
const logoWheel = document.getElementById("logo-wheel");
const hljsThemeDark = document.getElementById("hljs-theme-dark");
const hljsThemeLight = document.getElementById("hljs-theme-light");

// --- State ---
let languages = [],
  logoSlots = [],
  currentRotation = 0,
  isSpinning = false,
  logoUpdateInterval = null,
  carouselDisplayIndex = 0;

// --- Helper Functions ---
function getLogoPath(langId) {
  if (langId === "rust" && LOGO_VARIANT === "original") {
    return `${LOGO_BASE_PATH}${langId}/${langId}-plain.svg`;
  }
  return `${LOGO_BASE_PATH}${langId}/${langId}-${LOGO_VARIANT}.svg`;
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
  const half = Math.floor(VISIBLE_SLOTS / 2);
  for (let i = 0; i < VISIBLE_SLOTS; i++) {
    const langIndexOffset = i - half;
    let langIndex =
      (centerIndex + langIndexOffset + languages.length) % languages.length;
    const slotImg = logoSlots[i];
    const lang = languages[langIndex];
    const newSrc = getLogoPath(lang.id);
    if (slotImg.src !== newSrc) {
      slotImg.src = newSrc;
      slotImg.alt = lang.name;
    }
  }
}
function showPlaceholder() {
  const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  quoteTextEl.textContent = `“${randomQuote.text}”`;
  quoteAuthorEl.textContent = `– ${randomQuote.author}`;
  placeholderCard.classList.remove("hidden");
}
function updateMainContent(lang) {
  langNameEl.textContent = lang.name;
  langLogoEl.src = getLogoPath(lang.id);
  codeBlockEl.textContent = lang.code;
  codeBlockEl.className = `language-${lang.highlightLang}`;
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

// --- Main Logic ---

async function initialize() {
  try {
    const response = await fetch("data/data.json");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    languages = await response.json();

    setupTheme();
    logoWheel.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.33, 1, 0.68, 1)`;
    createCarouselSlots();
    updateCarouselContent(0);

    card.classList.add("content-hidden");
    spinAndSelect(true);
  } catch (error) {
    console.error("Could not load language data:", error);
    codeBlockEl.textContent =
      "Error: Could not load 'data/data.json'. Please check the file and console.";
  }
}

/**
 * CHANGE: THE CORE LOGIC FOR CALCULATING ROTATION IS NOW FULLY ROBUST
 */
function spinAndSelect(isInitialLoad = false) {
  if (isSpinning || languages.length < 2) return;
  isSpinning = true;
  randomButton.disabled = true;

  if (!isInitialLoad) {
    card.classList.add("content-hidden");
    showPlaceholder();
  }

  const winnerIndex = Math.floor(Math.random() * languages.length);
  const winner = languages[winnerIndex];

  // --- THE FINAL, ROBUST FIX ---
  // 1. Calculate the "clean" base rotation by rounding up to the next full 360-degree spin.
  //    This removes any leftover correctional angles from the previous spin.
  const cleanBaseRotation = Math.ceil(currentRotation / 360) * 360;

  // 2. Define the angle of the target slot.
  const targetSlotAngle = TARGET_SLOT_INDEX * ANGLE_PER_SLOT;

  // 3. Calculate the new final rotation from this clean base.
  const finalRotation =
    cleanBaseRotation + // Start from a clean slate
    SPIN_ROUNDS * 360 + // Add the show-off spins
    TARGET_POSITION_ANGLE - // Move to the target position (e.g., left side)
    targetSlotAngle; // Correct for the specific slot

  // 4. Apply the rotation and update the state for the *next* spin.
  logoWheel.style.transform = `rotate(${finalRotation}deg)`;
  currentRotation = finalRotation;
  // --- END OF FIX ---

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
  }, SPIN_DURATION_MS);
}

// --- Event Listeners & Initialization ---
randomButton.addEventListener("click", () => spinAndSelect(false));
initialize();
