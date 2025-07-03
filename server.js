const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = 3000;
const LANGUAGES_PATH = path.join(__dirname, "public", "data", "languages.json");
const LOGOS_BASE_PATH = path.join(__dirname, "public", "logos");

// --- Multer Konfiguration für Logo-Uploads ---
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Wir nehmen die ID aus dem Formular, um den Zielordner zu erstellen
    const langId = req.body.id;
    if (!langId) {
      // Wenn keine ID mitgesendet wird, kann kein Ordner erstellt werden.
      return cb(
        new Error("Language ID is missing in the upload request!"),
        null
      );
    }
    const dir = path.join(LOGOS_BASE_PATH, langId);

    try {
      // Erstelle den Ordner, falls er nicht existiert. `recursive: true` verhindert Fehler, wenn der Ordner schon da ist.
      await fs.mkdir(dir, { recursive: true });
      cb(null, dir);
    } catch (error) {
      console.error("Failed to create directory for logo:", error);
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    // Wir speichern das Logo immer als "ID-original.svg" für Konsistenz.
    // Das überschreibt ein eventuell vorhandenes "original"-Logo.
    const langId = req.body.id;
    cb(null, `${langId}-original.svg`);
  },
});

// Initialisiere Multer mit der definierten Speicherstrategie
const upload = multer({ storage: storage });
// --- Ende der Multer Konfiguration ---

// Middleware, um JSON-Anfragen zu verstehen und statische Dateien aus dem 'public'-Ordner auszuliefern
app.use(express.json());
app.use(express.static("public"));

// --- API-Endpunkte ---

// API-Endpunkt, um alle Sprachen zu LESEN
app.get("/api/languages", async (req, res) => {
  try {
    const data = await fs.readFile(LANGUAGES_PATH, "utf-8");
    res.json(JSON.parse(data));
  } catch (error) {
    console.error("Error reading languages file:", error);
    res.status(500).json({ message: "Error reading language data." });
  }
});

// API-Endpunkt, um alle Sprachen zu SCHREIBEN (speichern)
app.post("/api/languages", async (req, res) => {
  try {
    // Wir nehmen den kompletten Datensatz aus der Anfrage
    const newLanguagesData = req.body;
    // Wir schreiben ihn formatiert (null, 2 für "pretty-print") in die Datei und überschreiben die alte Version
    await fs.writeFile(
      LANGUAGES_PATH,
      JSON.stringify(newLanguagesData, null, 2)
    );
    res.json({ message: "Languages saved successfully!" });
  } catch (error) {
    console.error("Error writing languages file:", error);
    res.status(500).json({ message: "Error saving language data." });
  }
});

// NEUER API-Endpunkt für Logo-Uploads
app.post("/api/upload-logo", upload.single("logoFile"), (req, res) => {
  // 'upload.single('logoFile')' ist die Middleware, die die Datei verarbeitet.
  // 'logoFile' muss der Name des Feldes im FormData sein, das die Datei enthält.

  // Wenn die Middleware durchgelaufen ist, ist die Datei bereits gespeichert.
  if (!req.file) {
    // Dieser Fall tritt ein, wenn kein File im Request war.
    return res.status(400).json({ message: "No file uploaded." });
  }

  // Alles hat geklappt. Wir senden eine Erfolgsmeldung und den Pfad zur Datei zurück.
  // Der Pfad ist relativ zum Server, aber der Client kann daraus den relativen Web-Pfad ableiten.
  const relativePath = path
    .join("logos", req.body.id, req.file.filename)
    .replace(/\\/g, "/");
  res.json({
    message: "Logo uploaded successfully!",
    path: relativePath,
  });
});

// Server starten
app.listen(PORT, () => {
  console.log(`✅ Server is running!`);
  console.log(`   Main App: http://localhost:${PORT}`);
  console.log(`   Editor:   http://localhost:${PORT}/edit.html`);
});
