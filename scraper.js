const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const { glob } = require("glob");

// --- KONFIGURATION ---
const GITHUB_REPO_PATH = "./public/data/ext_ressources/hello-world-main";
const EXISTING_LANG_PATH = "./public/data/languages.json";
const HWC_URL = "http://helloworldcollection.de/";
const OUTPUT_PATH = "./public/data/languages.json";

// --- HAUPTLOGIK ---

async function runScraper() {
  console.log("Starting the data aggregation process...");
  let masterData = {};

  // Phase 1: GitHub Repo
  console.log("\n--- Phase 1: Processing GitHub Repo ---");
  try {
    const files = await glob(`${GITHUB_REPO_PATH}/**/*.*`);
    for (const file of files) {
      const langName = path.basename(file, path.extname(file));
      const id = generateId(langName);

      if (!masterData[id]) {
        const code = await fs.readFile(file, "utf-8");
        masterData[id] = {
          id: id,
          name: langName,
          code: code.trim(),
          fileExtension: path.extname(file),
          source: "github-leachim6",
          links: {},
          output: { type: "Console Output", text: "Hello, World!" },
          comments: {},
        };
        console.log(`[GitHub] Added: ${langName}`);
      }
    }
  } catch (error) {
    console.error(
      "Error processing GitHub repo. Did you clone it into `hello-world-repo`?",
      error.message
    );
  }

  // Phase 2: Unsere bestehende JSON
  console.log("\n--- Phase 2: Merging existing data ---");
  try {
    const existingData = JSON.parse(
      await fs.readFile(EXISTING_LANG_PATH, "utf-8")
    );
    for (const lang of existingData) {
      if (!masterData[lang.id]) {
        masterData[lang.id] = lang;
        masterData[lang.id].source = "every-hello-world-v1";
        console.log(`[Existing] Added: ${lang.name}`);
      }
    }
  } catch (error) {
    console.warn(
      "Could not read existing languages.json, skipping. Error:",
      error.message
    );
  }

  // Phase 3: helloworldcollection.de
  console.log("\n--- Phase 3: Scraping helloworldcollection.de ---");
  try {
    const { data } = await axios.get(HWC_URL);
    const $ = cheerio.load(data);

    $("a[name]").each((i, el) => {
      const h2 = $(el).next("table").find("h2");
      if (h2.length) {
        const langName = h2.text().replace(/\s/g, " ").trim();
        const id = generateId(langName);
        const pre = $(el).next("table").next("pre");
        const wikipediaLink = pre.find("a").attr("href");

        if (!masterData[id]) {
          const code = pre.text().trim();
          masterData[id] = {
            id: id,
            name: langName,
            code: code,
            fileExtension: "",
            source: "hwc-website",
            links: { wikipedia: wikipediaLink || "" },
            output: { type: "Console Output", text: "Hello, World!" },
            comments: {},
          };
          console.log(`[HWC] Added new: ${langName}`);
        } else if (wikipediaLink && !masterData[id].links.wikipedia) {
          masterData[id].links.wikipedia = wikipediaLink;
          console.log(`[HWC] Enriched with Wikipedia link: ${langName}`);
        }
      }
    });
  } catch (error) {
    console.error(
      "Failed to scrape helloworldcollection.de. Error:",
      error.message
    );
  }

  // --- FINALE ---
  console.log("\n--- Phase 4: Finalizing data ---");
  const finalDataArray = Object.values(masterData).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  try {
    // CHANGE: Hier fügen wir die Desinfektion hinzu!
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(finalDataArray, null, 2), {
      encoding: "utf-8",
    });
    console.log(
      `\n✅ Success! Wrote ${finalDataArray.length} clean entries to ${OUTPUT_PATH}`
    );
  } catch (error) {
    console.error("Failed to write final JSON file. Error:", error.message);
  }
}

function generateId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, "")
    .replace(/\s/g, "");
}

runScraper();
