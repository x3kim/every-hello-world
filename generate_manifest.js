const fs = require("fs");
const path = require("path");

// Pfade definieren
const dataDir = path.join(__dirname, "data");
const logoDir = path.join(dataDir, "logos");
const imageDir = path.join(dataDir, "images");
const logoManifestPath = path.join(dataDir, "logo_manifest.json");
const imageManifestPath = path.join(dataDir, "image_manifest.json");

// --- 1. LOGO-MANIFEST ERSTELLEN ---
console.log("Generating logo manifest...");
const logoManifest = {};

if (fs.existsSync(logoDir)) {
  // Lese alle Unterordner (Sprachen)
  const langDirs = fs
    .readdirSync(logoDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  for (const langId of langDirs) {
    const specificLangDir = path.join(logoDir, langId);
    // Lese alle Dateien im Sprach-Ordner
    const logos = fs
      .readdirSync(specificLangDir)
      .filter((file) => file.endsWith(".svg")); // Nur SVGs

    if (logos.length > 0) {
      logoManifest[langId] = logos;
    }
  }
}
fs.writeFileSync(
  logoManifestPath,
  JSON.stringify(logoManifest, null, 2),
  "utf8"
);
console.log("✔ Logo manifest created.");

// --- 2. BILD-MANIFEST AKTUALISIEREN (die intelligente Version) ---
console.log("Smart-updating image manifest...");
let existingImageManifest = [];
try {
  if (fs.existsSync(imageManifestPath)) {
    existingImageManifest = JSON.parse(
      fs.readFileSync(imageManifestPath, "utf8")
    );
  }
} catch (e) {
  console.error("Could not parse existing image manifest, starting fresh.");
}
const existingImageMap = new Map(
  existingImageManifest.map((item) => [item.src, item])
);

const newImageManifest = [];
if (fs.existsSync(imageDir)) {
  const currentImageFiles = fs
    .readdirSync(imageDir)
    .filter((file) => /\.(jpe?g|png|gif|svg|webp)$/i.test(file));
  for (const file of currentImageFiles) {
    if (existingImageMap.has(file)) {
      newImageManifest.push(existingImageMap.get(file));
    } else {
      console.log(`+ Adding new image to manifest: ${file}`);
      newImageManifest.push({ src: file, alt: "", href: "", button_text: "" });
    }
  }
}
fs.writeFileSync(
  imageManifestPath,
  JSON.stringify(newImageManifest, null, 2),
  "utf8"
);
console.log("✔ Image manifest updated.");
