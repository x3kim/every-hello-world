// Globaler Speicher für alle Daten
let allLanguages = [];
let currentLanguageId = null;

// DOM-Elemente
const langListEl = document.getElementById("language-list");
const searchInput = document.getElementById("search-input");
const editorForm = document.getElementById("editor-form");
const welcomeMessage = document.getElementById("welcome-message");
const saveButton = document.getElementById("save-button");
const deleteButton = document.getElementById("delete-button");
const addNewButton = document.getElementById("add-new-button");
const saveStatusEl = document.getElementById("save-status");
const formLogoPreview = document.getElementById("form-logo-preview");
const formLogoUpload = document.getElementById("form-logo-upload");

// Formular-Felder
const formFields = {
  name: document.getElementById("form-name"),
  id: document.getElementById("form-id"),
  fileExtension: document.getElementById("form-fileExtension"),
  highlightLang: document.getElementById("form-highlightLang"),
  source: document.getElementById("form-source"),
  code: document.getElementById("form-code"),
  linkOfficial: document.getElementById("form-link-official"),
  linkWikipedia: document.getElementById("form-link-wikipedia"),
  outputType: document.getElementById("form-output-type"),
  outputText: document.getElementById("form-output-text"),
  commentSingle: document.getElementById("form-comment-single"),
  commentMulti: document.getElementById("form-comment-multi"),
};

// INITIALISIERUNG
async function initialize() {
  try {
    const response = await fetch("/api/languages");
    allLanguages = await response.json();
    renderLanguageList();
  } catch (error) {
    console.error("Failed to load languages:", error);
    alert("Could not load language data. Check console.");
  }
}

// ANZEIGE-FUNKTIONEN
function renderLanguageList(filter = "") {
  langListEl.innerHTML = "";
  const filtered = allLanguages
    .filter((lang) => lang.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  filtered.forEach((lang) => {
    const item = document.createElement("div");
    item.textContent = lang.name;
    item.dataset.id = lang.id;
    if (lang.id === currentLanguageId) {
      item.classList.add("selected");
    }
    item.addEventListener("click", () => displayLanguage(lang.id));
    langListEl.appendChild(item);
  });
}

function displayLanguage(id) {
  welcomeMessage.classList.add("hidden");
  editorForm.classList.remove("hidden");

  currentLanguageId = id;
  const lang = allLanguages.find((l) => l.id === id);
  if (!lang) return;

  // Logo-Vorschau aktualisieren
  setLogoWithFallback(formLogoPreview, lang);

  formFields.name.value = lang.name || "";
  formFields.id.value = lang.id || "";
  formFields.fileExtension.value = lang.fileExtension || "";
  formFields.highlightLang.value = lang.highlightLang || lang.id || "";
  formFields.source.value = lang.source || "N/A";
  formFields.code.value = lang.code || "";
  formFields.linkOfficial.value = lang.links?.official || "";
  formFields.linkWikipedia.value = lang.links?.wikipedia || "";
  formFields.outputType.value = lang.output?.type || "";
  formFields.outputText.value = lang.output?.text || "";
  formFields.commentSingle.value = lang.comments?.single || "";
  formFields.commentMulti.value = lang.comments?.multi || "";

  formFields.id.readOnly = true;
  renderLanguageList(searchInput.value);
}

// AKTIONEN
async function saveData() {
  if (!currentLanguageId) {
    // Neuer Eintrag
    const newId = formFields.id.value.trim();
    if (!newId) {
      alert("ID is required for a new entry.");
      return;
    }
    if (allLanguages.some((l) => l.id === newId)) {
      alert("This ID already exists. Please choose a unique one.");
      return;
    }
    currentLanguageId = newId;
  }

  const originalLang =
    allLanguages.find((l) => l.id === currentLanguageId) || {};

  const updatedLang = {
    ...originalLang,
    name: formFields.name.value,
    id: currentLanguageId,
    fileExtension: formFields.fileExtension.value,
    highlightLang: formFields.highlightLang.value,
    code: formFields.code.value,
    links: {
      ...originalLang.links,
      official: formFields.linkOfficial.value,
      wikipedia: formFields.linkWikipedia.value,
    },
    output: {
      type: formFields.outputType.value,
      text: formFields.outputText.value,
    },
    comments: {
      single: formFields.commentSingle.value,
      multi: formFields.commentMulti.value,
    },
  };

  const index = allLanguages.findIndex((l) => l.id === currentLanguageId);
  if (index > -1) {
    allLanguages[index] = updatedLang;
  } else {
    allLanguages.push(updatedLang);
  }

  showSaveStatus("Saving...", "text-yellow-400");

  try {
    const response = await fetch("/api/languages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(allLanguages),
    });
    if (!response.ok) throw new Error("Server responded with an error.");

    const result = await response.json();
    showSaveStatus(result.message, "text-green-400");
    renderLanguageList(searchInput.value);
  } catch (error) {
    showSaveStatus("Failed to save!", "text-red-400");
    console.error("Save error:", error);
  }
}

function showSaveStatus(message, colorClass) {
  saveStatusEl.textContent = message;
  saveStatusEl.className = `text-sm transition-opacity opacity-100 ${colorClass}`;
  setTimeout(() => {
    saveStatusEl.classList.replace("opacity-100", "opacity-0");
  }, 3000);
}

function deleteData() {
  if (
    !currentLanguageId ||
    !confirm(
      `Are you sure you want to delete "${formFields.name.value}"? This cannot be undone.`
    )
  ) {
    return;
  }
  allLanguages = allLanguages.filter((l) => l.id !== currentLanguageId);

  // Wir müssen nicht das komplette saveData aufrufen, ein einfacher POST reicht
  fetch("/api/languages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(allLanguages),
  }).then((res) => {
    if (res.ok) {
      alert("Entry deleted successfully.");
      currentLanguageId = null;
      editorForm.classList.add("hidden");
      welcomeMessage.classList.remove("hidden");
      renderLanguageList();
    } else {
      alert("Failed to delete entry.");
    }
  });
}

function prepareNewEntry() {
  editorForm.reset();
  formLogoPreview.src = "images/generic-logo.svg"; // Zeige generisches Logo
  currentLanguageId = null;
  formFields.id.readOnly = false;
  welcomeMessage.classList.add("hidden");
  editorForm.classList.remove("hidden");
  formFields.name.focus();
  const selected = langListEl.querySelector(".selected");
  if (selected) selected.classList.remove("selected");
}

// LOGO-FUNKTIONEN
const LOGO_BASE_PATH = "logos/";
const LOGO_VARIANTS = ["original", "plain", "line", "wordmark"];
const FALLBACK_LOGO = "images/generic-logo.svg";

function setLogoWithFallback(imgElement, lang, variantIndex = 0) {
  if (!lang || !lang.id) {
    imgElement.src = FALLBACK_LOGO;
    return;
  }
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

async function uploadLogo() {
  const file = formLogoUpload.files[0];
  if (!file) {
    alert("Please select a file first.");
    return;
  }
  if (!currentLanguageId) {
    alert(
      "Please save the new entry first to create an ID before uploading a logo."
    );
    return;
  }

  const formData = new FormData();
  formData.append("logoFile", file);
  formData.append("id", currentLanguageId);

  showSaveStatus("Uploading logo...", "text-yellow-400");

  try {
    const response = await fetch("/api/upload-logo", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Upload failed on server.");

    const result = await response.json();
    showSaveStatus(result.message, "text-green-400");

    // Aktualisiere die Vorschau mit einem Cache-Buster, um das neue Bild zu erzwingen
    // Wir konstruieren den Pfad neu, da wir wissen, dass er jetzt als -original.svg existiert
    formLogoPreview.src = `${LOGO_BASE_PATH}${currentLanguageId}/${currentLanguageId}-original.svg?t=${new Date().getTime()}`;
  } catch (error) {
    showSaveStatus("Upload failed!", "text-red-400");
    console.error("Upload error:", error);
  }
}

// EVENT LISTENERS
searchInput.addEventListener("input", () =>
  renderLanguageList(searchInput.value)
);
saveButton.addEventListener("click", saveData);
deleteButton.addEventListener("click", deleteData);
addNewButton.addEventListener("click", prepareNewEntry);
formLogoUpload.addEventListener("change", uploadLogo);

// START
initialize();
