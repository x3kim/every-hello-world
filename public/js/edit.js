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

// Formular-Felder
const formFields = {
  name: document.getElementById("form-name"),
  id: document.getElementById("form-id"),
  fileExtension: document.getElementById("form-fileExtension"),
  highlightLang: document.getElementById("form-highlightLang"),
  code: document.getElementById("form-code"),
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

  formFields.name.value = lang.name || "";
  formFields.id.value = lang.id || "";
  formFields.fileExtension.value = lang.fileExtension || "";
  formFields.highlightLang.value = lang.highlightLang || lang.id || "";
  formFields.code.value = lang.code || "";
  formFields.outputType.value = lang.output?.type || "";
  formFields.outputText.value = lang.output?.text || "";
  formFields.commentSingle.value = lang.comments?.single || "";
  formFields.commentMulti.value = lang.comments?.multi || "";

  // ID-Feld schreibschützen, wenn ein Eintrag bearbeitet wird
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

  const updatedLang = {
    name: formFields.name.value,
    id: currentLanguageId,
    fileExtension: formFields.fileExtension.value,
    highlightLang: formFields.highlightLang.value,
    code: formFields.code.value,
    output: {
      type: formFields.outputType.value,
      text: formFields.outputText.value,
    },
    comments: {
      single: formFields.commentSingle.value,
      multi: formFields.commentMulti.value,
    },
    // Behalte bestehende Felder wie 'source' oder 'links' bei
    ...allLanguages.find((l) => l.id === currentLanguageId),
  };

  const index = allLanguages.findIndex((l) => l.id === currentLanguageId);
  if (index > -1) {
    allLanguages[index] = updatedLang;
  } else {
    allLanguages.push(updatedLang);
  }

  try {
    const response = await fetch("/api/languages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(allLanguages),
    });
    const result = await response.json();
    alert(result.message);
    renderLanguageList(searchInput.value);
  } catch (error) {
    alert("Failed to save data. See console for details.");
    console.error("Save error:", error);
  }
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

  saveData().then(() => {
    currentLanguageId = null;
    editorForm.classList.add("hidden");
    welcomeMessage.classList.remove("hidden");
    renderLanguageList();
  });
}

function prepareNewEntry() {
  editorForm.reset();
  currentLanguageId = null;
  formFields.id.readOnly = false;
  welcomeMessage.classList.add("hidden");
  editorForm.classList.remove("hidden");
  formFields.name.focus();
  renderLanguageList(searchInput.value);
}

// EVENT LISTENERS
searchInput.addEventListener("input", () =>
  renderLanguageList(searchInput.value)
);
saveButton.addEventListener("click", saveData);
deleteButton.addEventListener("click", deleteData);
addNewButton.addEventListener("click", prepareNewEntry);

// START
initialize();
