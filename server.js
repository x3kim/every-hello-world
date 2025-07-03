const express = require("express");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const PORT = 3000;
const LANGUAGES_PATH = path.join(__dirname, "public", "data", "languages.json");

// Middleware, um JSON-Anfragen zu verstehen und statische Dateien auszuliefern
app.use(express.json());
app.use(express.static("public"));

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
    // Wir schreiben ihn formatiert (null, 2) in die Datei und überschreiben die alte Version
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

app.listen(PORT, () => {
  console.log(`✅ Server is running!`);
  console.log(`   Main App: http://localhost:${PORT}`);
  console.log(`   Editor:   http://localhost:${PORT}/edit.html`);
});
