"use strict";

// Bump together with the ?v= on the script tag and the page label in index.html.
const VERSION = 17;

const AUDIO_DIR = "audio/";
const SYSTEM_DIR = "audio/system/";
// Wait this long after a complete number that is also the start of a longer one.
const DIAL_TIMEOUT_MS = 2000;
// Idle time after which an incomplete or unknown number is rejected.
const IDLE_TIMEOUT_MS = 5000;
// Off hook with no digit dialed for this long switches the dial tone to the reorder (fast busy) signal.
const DIAL_TONE_TIMEOUT_MS = 15000;
// Longest number on the system; an unknown number is only rejected once this many digits are dialed.
const MAX_DIGITS = 6;
// Cheat mode reveals the secrets: the selected phone's number and the description of the number being called.
const CHEAT_MODE = false;

const DTMF = {
  "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
  "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
  "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
  "*": [941, 1209], "0": [941, 1336], "#": [941, 1477],
};

// Fallback tones when a system recording is missing: [Hz pairs, on ms, off ms, repeats].
const FALLBACK_TONES = {
  invalid: { freqs: [950, 1400], on: 330, off: 30, repeat: 3 },
  busy: { freqs: [480, 620], on: 500, off: 500, repeat: 4 },
  reorder: { freqs: [480, 620], on: 250, off: 250, repeat: 60 },
};
const DIAL_TONE_FREQS = [350, 440];
// Long so the browser's audio loop gap (audible in Safari) happens rarely.
const DIAL_TONE_MS = 30000;

const displayEl = document.getElementById("display");
const statusEl = document.getElementById("status");
const phoneSelectEl = document.getElementById("phone");

let numbers = new Map(); // digits -> { desc, file }
let phones = [];
let selectedPhone = null;
let buffer = "";
let dialTimer = null;
let dialed = false; // true once the buffer has been dialed; next digit starts a new number
let offHook = false;
let player = null;
const toneUrls = new Map();

// Tones are rendered to WAV and played as <audio>, the same path as the mp3s, which Safari allows reliably.
// Whole-second lengths hold a whole number of cycles for integer Hz, so loopable tones have no seam.
function toneUrl(freqs, ms, loopable = false, offMs = 0) {
  const key = freqs.join("+") + "@" + ms + "+" + offMs + (loopable ? "L" : "");
  if (toneUrls.has(key)) return toneUrls.get(key);
  const rate = 22050;
  const onSamples = Math.floor(rate * ms / 1000);
  const n = Math.floor(rate * (ms + offMs) / 1000);
  const fade = loopable ? 0 : Math.floor(rate * 0.005);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVEfmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    let s = 0;
    if (i < onSamples) {
      for (const f of freqs) s += Math.sin(2 * Math.PI * f * i / rate);
    }
    const env = fade ? Math.min(1, i / fade, (onSamples - i) / fade) : 1;
    v.setInt16(44 + i * 2, Math.round(s / freqs.length * env * 0.8 * 32767), true);
  }
  const url = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  toneUrls.set(key, url);
  return url;
}

function playTone(freqs, ms) {
  new Audio(toneUrl(freqs, ms)).play().catch(() => {});
}

let fallbackTimers = [];

function playFallback(name) {
  const t = FALLBACK_TONES[name];
  if (!t) return;
  for (let i = 0; i < t.repeat; i++) {
    fallbackTimers.push(setTimeout(() => playTone(t.freqs, t.on), i * (t.on + t.off)));
  }
}

function stopAudio() {
  fallbackTimers.forEach(clearTimeout);
  fallbackTimers = [];
  if (player) {
    player.onended = player.onerror = null;
    player.pause();
    player = null;
  }
}

function playFile(url, { onError, onEnd, loop, logError = true } = {}) {
  stopAudio();
  const a = new Audio(url);
  a.loop = !!loop;
  player = a;
  a.onended = () => { if (player === a) { player = null; onEnd && onEnd(); } };
  a.onerror = () => {
    if (logError) console.error("Audio failed:", url, a.error);
    if (player === a) { player = null; onError && onError(); }
  };
  a.play().catch((err) => {
    if (logError) console.error("Audio play() rejected:", url, err);
    a.onerror && a.onerror();
  });
}

function playSystem(name, label) {
  setStatus(label);
  playFile(SYSTEM_DIR + name + ".mp3", {
    onError: () => playFallback(name),
    onEnd: () => setStatus("Dial a number"),
  });
}

function playRingback() {
  setStatus("Ringing...");
  const playIndefiniteRingback = () => playFile(SYSTEM_DIR + "ring-reorder.mp3", {
    loop: true,
    onError: () => playFile(toneUrl([440, 480], 2000, true, 4000), { loop: true }),
  });
  playFile(SYSTEM_DIR + "noanswer.mp3", {
    onError: playIndefiniteRingback,
    onEnd: () => setStatus("No answer"),
  });
}

function setStatus(text) { statusEl.textContent = text; }

function format(digits) {
  return digits || "\u00a0";
}

function parseCsv(text) {
  const map = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf(",");
    const label = (i < 0 ? line : line.slice(0, i)).trim();
    const num = label.replace(/\D/g, "");
    const desc = i < 0 ? "" : line.slice(i + 1).trim();
    if (num) map.set(num, { desc, file: label + ".mp3" });
  }
  return map;
}

function parsePhonesCsv(text) {
  const loadedPhones = [];
  const numbers = new Set();
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf(",");
    if (i < 0) throw new Error(`Missing comma on line ${index + 1}`);

    const rawNumber = line.slice(0, i).trim();
    const name = line.slice(i + 1).trim();
    const number = rawNumber.replace(/\D/g, "");
    if (!name) throw new Error(`Missing phone name on line ${index + 1}`);
    if (rawNumber && !number) throw new Error(`Invalid phone number on line ${index + 1}`);
    if (number && numbers.has(number)) throw new Error(`Duplicate phone number on line ${index + 1}`);
    if (number) numbers.add(number);
    loadedPhones.push({ number, name, label: number ? `${name} (${rawNumber})` : name });
  }
  if (!loadedPhones.length) throw new Error("No phones found");
  return loadedPhones;
}

async function loadNumbers() {
  try {
    const res = await fetch("numbers.csv", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    numbers = parseCsv(await res.text());
    console.log("Loaded numbers:", [...numbers.keys()].join(" "));
  } catch (e) {
    setStatus("Could not load numbers.csv (serve over http, not file://)");
  }
}

async function loadPhones() {
  try {
    const res = await fetch("phones.csv", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    phones = parsePhonesCsv(await res.text());
    phoneSelectEl.replaceChildren(...phones.map((phone, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = CHEAT_MODE ? phone.label : phone.name;
      return option;
    }));
    selectedPhone = phones[0];
    phoneSelectEl.disabled = offHook;
    console.log("Loaded phones:", phones.map((phone) => phone.name).join(", "));
  } catch (e) {
    console.error("Could not load phones.csv:", e);
    setStatus("Could not load phones.csv (serve over http, not file://)");
  }
}

function isOwnNumber(digits) {
  return !!selectedPhone?.number && digits === selectedPhone.number;
}

function hasLongerMatch(digits) {
  for (const n of numbers.keys()) if (n.length > digits.length && n.startsWith(digits)) return true;
  for (const phone of phones) {
    if (phone.number.length > digits.length && phone.number.startsWith(digits)) return true;
  }
  return false;
}

function dial() {
  clearTimeout(dialTimer);
  if (!buffer) return;
  dialed = true;
  const digits = buffer;
  if (isOwnNumber(digits)) {
    console.log("Dial own number", digits);
    playSystem("busy", "Line busy");
    return;
  }
  const calledPhone = phones.find((phone) => phone.number === digits);
  if (calledPhone) {
    console.log("Call phone", calledPhone.name, digits);
    playRingback();
    return;
  }
  console.log("Dial", digits, numbers.has(digits) ? numbers.get(digits).file : "not in numbers.csv");
  if (!numbers.has(digits)) {
    playSystem("invalid", "Call cannot be completed as dialed");
    return;
  }
  const entry = numbers.get(digits);
  setStatus(CHEAT_MODE ? "Calling " + (entry.desc || digits) + "..." : "Calling...");
  const sharedRecording = () => playFile(AUDIO_DIR + encodeURIComponent(entry.file), {
    onError: () => playSystem("invalid", "Call cannot be completed as dialed"),
    onEnd: () => setStatus("Call ended"),
  });
  if (selectedPhone?.number) {
    playFile(AUDIO_DIR + selectedPhone.number + "/" + encodeURIComponent(entry.file), {
      logError: false,
      onError: sharedRecording,
      onEnd: () => setStatus("Call ended"),
    });
  } else {
    sharedRecording();
  }
}

function pressKey(key) {
  if (!offHook) return;
  playTone(DTMF[key], 120);
  if (key === "#" || key === "*") return;

  clearTimeout(dialTimer);
  stopAudio();
  if (dialed) { buffer = ""; dialed = false; }
  buffer += key;
  displayEl.textContent = format(buffer);
  setStatus("Dialing...");

  const isDialable = numbers.has(buffer) || phones.some((phone) => phone.number === buffer);
  if (isDialable && !hasLongerMatch(buffer)) {
    dialTimer = setTimeout(dial, 400);
  } else if (buffer.length >= MAX_DIGITS) {
    dialTimer = setTimeout(dial, 400);
  } else if (isDialable) {
    dialTimer = setTimeout(dial, DIAL_TIMEOUT_MS);
  } else {
    dialTimer = setTimeout(dial, IDLE_TIMEOUT_MS);
  }
}

function pickUp() {
  if (offHook) return;
  selectedPhone = phones[Number(phoneSelectEl.value)] || selectedPhone;
  offHook = true;
  phoneSelectEl.disabled = true;
  buffer = "";
  dialed = false;
  displayEl.textContent = format(buffer);
  setStatus("Dial tone");
  playFile(SYSTEM_DIR + "dialtone.mp3", {
    loop: true,
    onError: () => playFile(toneUrl(DIAL_TONE_FREQS, DIAL_TONE_MS, true), { loop: true }),
  });
  dialTimer = setTimeout(() => {
    setStatus("Receiver off hook");
    playFile(SYSTEM_DIR + "reorder.mp3", { loop: true, onError: () => playFallback("reorder") });
  }, DIAL_TONE_TIMEOUT_MS);
}

function hangUp() {
  clearTimeout(dialTimer);
  stopAudio();
  offHook = false;
  phoneSelectEl.disabled = false;
  buffer = "";
  dialed = false;
  displayEl.textContent = format(buffer);
  setStatus("Pick up the receiver");
}

document.getElementById("keypad").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-key]");
  if (btn) pressKey(btn.dataset.key);
});
document.getElementById("pickup").addEventListener("click", pickUp);
document.getElementById("hangup").addEventListener("click", hangUp);
phoneSelectEl.addEventListener("change", () => {
  selectedPhone = phones[Number(phoneSelectEl.value)] || null;
});

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target === phoneSelectEl && e.key !== "Enter") return;
  let key = null;
  if (/^[0-9*#]$/.test(e.key)) key = e.key;
  else if (e.key === "Enter") {
    e.preventDefault();
    if (e.repeat) return;
    return offHook ? hangUp() : pickUp();
  }
  if (!key || e.repeat) return;
  const btn = document.querySelector(`button[data-key="${CSS.escape(key)}"]`);
  btn.classList.add("active");
  setTimeout(() => btn.classList.remove("active"), 120);
  pressKey(key);
});

loadNumbers();
loadPhones();
setStatus("Pick up the receiver");
document.getElementById("version").textContent += " / script v" + VERSION;
