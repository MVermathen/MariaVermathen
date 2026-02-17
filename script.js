// =====================
// LOAD / SAVE
// =====================

const defaultVocab = {
    nouns: [],
    verbs: [],
    pronouns: [],
    adjectives: [],
    adverbs: [],
    prepositions: []
};

// =====================
// REMOTE COUCHDB SETUP
// =====================

const remoteDB = new PouchDB(
    "https://admin:Majo-4147@sesotho-couchdb.fly.dev/sesotho_vocab",
    { skip_setup: true }
);

// =====================
// PouchDB Data Base
// =====================

const usernameInput = document.getElementById("usernameInput");
const setUserBtn = document.getElementById("setUserBtn");

setUserBtn.addEventListener("click", () => {
  const value = usernameInput.value.trim();
  if (!value) return alert("Please enter a username");

  localStorage.setItem("sesotho-username", value);
  initUsername(); // initialise DB and load vocab
  alert(`Username set: ${value}`);
});

let username = localStorage.getItem("sesotho-username");

if (username && usernameInput) {
    usernameInput.value = username;
}

let db = null; // DB will be created after username is set

function initUsername() {
    username = localStorage.getItem("sesotho-username");
    if (!username) return;

    vocabDocId = `vocab:${username}`;

    if (usernameInput) {
        usernameInput.value = username;
    }

    vocab = structuredClone(defaultVocab);
    currentRev = null;
    db = new PouchDB (`sesotho_vocab_local_${username}`);

        loadVocab(); 
        startSync();
}

let vocab = structuredClone(defaultVocab);
let vocabDocId = null; // set after username
let currentRev = null;

async function loadVocab() {
    if (!db) return;
    try {
        const doc = await db.get(vocabDocId);
        vocab = doc.data;
        currentRev = doc._rev;
        renderVocabList();
    }   catch (err) {
        if (err.status === 404) {
            console.log("📂 Vocab doc not found. Creating new doc...");
            await db.put({_id: vocabDocId, data: vocab}); // first-time creation
            currentRev = (await db.get(vocabDocId))._rev;
            renderVocabList();
        } else {
            console.error(err);
        }
    }
}

async function saveVocab() {
    if (!db) return;
    try {
        const doc = {
            _id: vocabDocId,
            data: vocab,
            _rev: currentRev || undefined 
        };

        const res = await db.put(doc);
        currentRev = res.rev;
        console.log("💾 Vocab saved. Current rev:", currentRev);
    }   catch (err) {
            console.error("❌ Error saving vocab:", err);
    }
}

// =====================
// SYNC
// =====================

function startSync() {
    db.sync(remoteDB, {
        live: true, 
        retry: true
    })
    .on("change", info => {
        console.log("🔄 Sync change", info);
        loadVocab(); // refresh UI 
    })
    .on("paused", () => {
        console.log("⏸ Sync paused (offline?)");
    })
    .on("active", () => {
        console.log("▶ Sync active");
    })
    .on("error", err => {
        console.error("❌ Sync error", err);
    });
}

// =====================
// ELEMENT REFERENCES
// =====================

const wordTypeSelect = document.getElementById("wordType");

const sthoInput = document.getElementById("stho");
const enInput = document.getElementById("en");

const sthoPluralInput = document.getElementById("sthoPlural");
const enPluralInput = document.getElementById("enPlural");

const sthoPastInput = document.getElementById("sthoPast");
const enPastInput = document.getElementById("enPast");

const pluralFields = document.getElementById("pluralFields");
const verbFields = document.getElementById("verbFields");

const addWordBtn = document.getElementById("addWordBtn");
const generateBtn = document.getElementById("generateBtn");

// =====================
// EVENT LISTENERS
// =====================

wordTypeSelect.addEventListener("change", updateFields);
addWordBtn.addEventListener("click", addWord);
generateBtn.addEventListener("click", generatePhrase);

// =====================
// FIELD LOGIC
// =====================

function updateFields() {
    pluralFields.style.display = "none";
    verbFields.style.display = "none";

    if (wordTypeSelect.value === "noun" || wordTypeSelect.value === "pronoun") {
        pluralFields.style.display = "block";
    }

    if (wordTypeSelect.value === "verb") {
        verbFields.style.display = "block";
    }
}

// =====================
// ADD WORD
// =====================

async function addWord() {
    if (!db) return alert("Please choose a username first!");
    const type = wordTypeSelect.value;

    const stho = sthoInput.value.trim();
    const en = enInput.value.trim();

    const sthoPlural = sthoPluralInput.value.trim();
    const enPlural = enPluralInput.value.trim();

    const sthoPast = sthoPastInput.value.trim();
    const enPast = enPastInput.value.trim();

// =====================
// 1. BASIC VALIDATION
// =====================

    if (!type || !stho || !en) {
        alert("Please fill in the required fields.");
        return;
    }

// =====================
// 2. TYPE-SPECIFIC VALIDATION
// =====================

    if ((type === "noun" || type === "pronoun") && (!sthoPlural || !enPlural)) {
        alert("Please enter plural forms.");
        return;
    }

    if (type === "verb" && (!sthoPast || !enPast)) {
        alert("Please enter past tense forms.");
        return;
    }

// =====================
// 3. ADD WORD
// =====================

    if (type === "noun" || type === "pronoun") {
        vocab[type + "s"].push({
            stho_singular: stho,
            stho_plural: sthoPlural,
            en_singular: en,
            en_plural: enPlural
        });
    }

    else if (type === "verb") {
        vocab.verbs.push({
            stho_present: stho,
            stho_past: sthoPast,
            en_present: en,
            en_past: enPast
        });
    }

    else {
        vocab[type + "s"].push({
            stho,
            en
        });
    }

// =====================
// 4. SAVE + FEEDBACK
// =====================

await saveVocab();

alert("Word saved!");
clearInputs();
}

// =====================
// CLEAR FORM
// =====================

function clearInputs() {
  sthoInput.value = "";
  enInput.value = "";
  sthoPluralInput.value = "";
  enPluralInput.value = "";
  sthoPastInput.value = "";
  enPastInput.value = "";
  wordTypeSelect.value = "";
  updateFields();
}

// =====================
// HELPERS
// =====================

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function block(text, type) {
    const span = document.createElement("span");
    span.className = `block ${type}`;
    span.textContent = text;
    return span;
}

function randomChoice(options) {
    return options[Math.floor(Math.random() * options.length)];
}

function maybeAdd(list, language, type, output) {
    if (list.length === 0) return;
    if (Math.random() < 0.5) {
        const item = randomItem(list);
        const text = language === "stho" ? item.stho : item.en;
        output.appendChild(block(text, type));
    }
}

// =====================
// GENERATOR
// =====================

function generatePhrase() {
    if (
        vocab.pronouns.length === 0 ||
        vocab.verbs.length === 0 ||
        vocab.nouns.length === 0
    ) {
        alert("Please add at least one pronoun, verb, and noun.");
        return;
    }

    let language = document.getElementById("languageSelect").value;
    let tense = document.getElementById("tenseSelect").value;
    let number = document.getElementById("numberSelect").value;

    if (!language) {
        language = randomChoice(["stho", "en"]);
    }

    if (!tense) {
        tense = randomChoice(["present", "past"]);
    }

    if (!number) {
        number = randomChoice(["singular", "plural"]);
    }
    
    const output = document.getElementById("output");
    output.innerHTML = "";

    // PRONOUN (required)
    const p = randomItem(vocab.pronouns);
    output.appendChild(
        block(language === "stho"
            ? p[`stho_${number}`]
            : p[`en_${number}`], 
            "pronoun")
    );

    // VERB (required)
    const v = randomItem(vocab.verbs);
    output.appendChild(
        block(language === "stho"
            ? v[`stho_${tense}`]
            : v[`en_${tense}`],
            "verb")
    );

    // NOUN (required)
    const n = randomItem(vocab.nouns);
    output.appendChild(
        block(language === "stho"
            ? n[`stho_${number}`]
            : n[`en_${number}`],
            "noun")  
    );

    maybeAdd(vocab.adjectives, language, "adjective", output);
    maybeAdd(vocab.adverbs, language, "adverb", output);
    maybeAdd(vocab.prepositions, language, "preposition", output);
}

updateFields();
initUsername();

function renderVocabList() {
  console.log("Current vocab:", vocab);
}