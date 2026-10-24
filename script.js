/* =====================================================================
 *  1. YOUR INFO — edit everything in this block to add more lines.
 * ===================================================================== */
const USER = "user";
const HOST = "arch";

/* fastfetch info rows. Array values render as clickable chips. */
const INFO = [
  { key: "os", value: "Arch Linux x86_64" },
  { key: "shell", value: "zsh 5.9" },
  { key: "uptime", value: "live" }, /* ticks in real time */
  { key: "interests", value: ["computer", "videogames", "learning random shit"] },
  { key: "skills", value: ["coding (C and Python)"] },
  // add more here later, e.g.:
  // { key: "projects", value: ["coming soon"] },
];

/* what `whoami` prints during the swap and in the live prompt */
const WHOAMI = [
  "programmer who likes learning new things.",
  "currently learning 3d modeling, microcontrollers,",
  "and how operating systems work.",
];

const CONTACTS = [{ label: "discord", value: "@mgoal" }];

/* fake filesystem — `ls` lists the keys, `openfile <file>` prints the value.
 * Files listed in DENIED_FILES answer "permission denied" to openfile. */
const FILES = {
  "about.md": () => WHOAMI.join("\n"),
  "projects.log": () => "[todo] ship first projects — coming soon",
  "contact.md": () => CONTACTS.map((c) => `${c.label}: ${c.value}`).join("\n"),
  "todo.txt": () =>
    "- learn 3d modeling\n- flash a real microcontroller\n- figure out how operating systems work",
  "secret.txt": () => "encrypted. some things you just have to find out.",
};
const DENIED_FILES = new Set(["secret.txt"]);

/* typewriter typing speed (ms) — lower = faster */
const TYPE_MIN_MS = 25;
const TYPE_MAX_MS = 70;

/* after a scripted command finishes typing, before its output appears */
const TYPE_OUTPUT_PAUSE_MS = 150;

/* timings & toggles */
const READING_TIME_MS = 2500; /* how long fastfetch holds before swapping */
const COMMAND_DELAY_MS = 1000; /* pause before each scripted command types */
const AMBIENT_GLITCH = true; /* random background glitches */

/* =====================================================================
 *  2. Internals — you usually don't need to touch anything below.
 * ===================================================================== */
const screenEl = document.getElementById("screen");
const bootLine = document.getElementById("boot-line");
const fetchEl = document.getElementById("fetch");
const infoLines = document.getElementById("info-lines");
const replEl = document.getElementById("repl");

const bootTime = Date.now();
let uptimeValueEl = null;
let ambientStarted = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---- prompt & output helpers ---- */
function makePrompt(inRepl = false) {
  const cls = inRepl ? "repl-prompt" : "prompt";
  return `<span class="${cls}">[${USER}@${HOST} ~]$</span>`;
}

function makeSpan(className, text = "") {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

function printOut(text, cls = "repl-line repl-out") {
  const el = document.createElement("div");
  el.className = cls;
  el.textContent = text;
  replEl.append(el);
  return el;
}

function clearCursors(...roots) {
  roots.forEach((root) =>
    root.querySelectorAll(".cursor").forEach((c) => c.remove()),
  );
}

async function typeChars(el, text, minMs, maxMs) {
  for (const ch of text) {
    el.textContent += ch;
    await sleep(minMs + Math.random() * (maxMs - minMs));
  }
}

/* ---- typewriter: every scripted command gets its own fresh line ----
 * fastfetch types in the boot container (above the fetch grid);
 * later commands flow into the shared output stream (replEl). */
async function typeBootCommand(cmd, container = bootLine) {
  clearCursors(container);

  const line = document.createElement("div");
  line.className = "prompt-line repl-line";

  const prompt = document.createElement("span");
  prompt.innerHTML = makePrompt();
  line.append(prompt, makeSpan("dollar", " "), makeSpan("typed"));

  const cursor = document.createElement("span");
  cursor.className = "cursor";
  line.append(cursor);

  container.append(line);

  await typeChars(line.querySelector(".typed"), cmd, TYPE_MIN_MS, TYPE_MAX_MS);
  await sleep(TYPE_OUTPUT_PAUSE_MS);
  return cursor;
}

/* ---- uptime ---- */
function fmtUptime() {
  const s = Math.max(0, Math.floor((Date.now() - bootTime) / 1000));
  const m = Math.floor(s / 60);
  return `${m} min${m === 1 ? "" : "s"}, ${s % 60} sec${s % 60 === 1 ? "" : "s"}`;
}

setInterval(() => {
  if (uptimeValueEl && document.contains(uptimeValueEl)) {
    uptimeValueEl.textContent = fmtUptime();
  }
}, 1000);

/* ---- build the info column ---- */
function renderInfo() {
  const fragment = document.createDocumentFragment();

  INFO.forEach(({ key, value }) => {
    const row = document.createElement("div");
    row.className = "row";

    const keyEl = document.createElement("span");
    keyEl.className = "key";
    keyEl.textContent = `${key}: `;
    row.append(keyEl);

    if (Array.isArray(value)) {
      /* clickable chips: clicking runs the matching list command */
      value.forEach((item, i) => {
        if (i > 0) row.append(makeSpan("sep", ", "));
        const v = makeSpan("val chip", item);
        v.dataset.cmd = key;
        row.append(v);
      });
    } else if (key === "uptime") {
      uptimeValueEl = makeSpan("val", fmtUptime());
      row.append(uptimeValueEl);
    } else {
      row.append(makeSpan("val", value));
    }

    fragment.append(row);
  });

  infoLines.replaceChildren(fragment);
}

/* ---- print `whoami` output under the current prompt ---- */
function printWhoami() {
  printOut(WHOAMI.join("\n"));
}

/* ---- glitch ---- */
function glitchScreen(durationMs = 900) {
  const term = document.querySelector(".terminal");
  term.classList.add("glitching");
  return new Promise((r) =>
    setTimeout(() => {
      term.classList.remove("glitching");
      r();
    }, durationMs),
  );
}

/* rare ambient glitches so the CRT feel never fully settles */
function scheduleAmbientGlitch() {
  ambientStarted = true;
  const timer = () =>
    setTimeout(() => {
      glitchScreen(600);
      timer();
    }, 15000 + Math.random() * 25000);
  timer();
}

/* ---- commands available in the prompt ---- */
const COMMANDS = {
  help: () =>
    "available: whoami, ls, openfile, uptime, skills, interests, projects, contact, location, age, uname, clear\nusage openfile: openfile projects.log — type a command and see what happens, view all files with ls",
  whoami: () => WHOAMI.join(" "),
  uname: () => "Linux arch 6.12.7-arch1-1 x86_64",
  uptime: () => `up ${fmtUptime()}, 1 user, load average: 0.41, 0.35, 0.30`,
  skills: () => (INFO.find((i) => i.key === "skills")?.value ?? []).join(", "),
  interests: () =>
    (INFO.find((i) => i.key === "interests")?.value ?? []).join(", "),
  projects: () => "coming soon...",
  contact: () => CONTACTS.map((c) => `${c.label}: ${c.value}`).join(", "),
  ls: () => Object.keys(FILES).join("  "),
  openfile: (file) => {
    if (!file) return "openfile: missing file operand";
    if (!(file in FILES)) return `openfile: ${file}: No such file or directory`;
    if (DENIED_FILES.has(file)) return `openfile: ${file}: permission denied`;
    return FILES[file]();
  },
  cd: () => "", /* cd goes nowhere — the terminal is the home */
  rm: () => "cannot remove '/': permission denied",
  /* commands rendered as OS-level permission errors */
  location: () => "operation not permitted",
  age: () => "operation not permitted (you'll have to find out)",
};

const DENIED_CMDS = new Set(["location", "age"]);

/* ---- interactive prompt (repeat after every command) ---- */
function newPromptRow(focus = true) {
  const row = document.createElement("div");
  row.className = "repl-row";

  const prompt = document.createElement("span");
  prompt.className = "repl-prompt";
  prompt.innerHTML = makePrompt(true);

  const input = document.createElement("input");
  input.className = "repl-input";
  input.setAttribute("autocomplete", "off");
  input.setAttribute("spellcheck", "false");
  input.setAttribute("aria-label", "terminal input");

  const cursor = document.createElement("span");
  cursor.className = "cursor";

  row.append(prompt, input, cursor);
  replEl.append(row);

  input.addEventListener("keydown", handleCommand);
  input.addEventListener("blur", () => (cursor.hidden = false));
  row.addEventListener("click", () => {
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
  });

  if (focus) input.focus();
  return input;
}

function handleCommand(e) {
  if (e.key !== "Enter") return;
  e.preventDefault();

  /* capture everything synchronously — async paths lose the event */
  const input = e.currentTarget;
  const cmd = input.value.trim();
  const row = input.parentElement;

  /* freeze the row as plain text */
  row.className = "repl-line";
  input.disabled = true;
  input.hidden = true;
  row.querySelector(".cursor")?.remove();
  row.append(makeSpan("val", cmd));

  /* sudo rm — special interactive sequence, no normal prompt until done */
  if (/^sudo\s+rm\b/.test(cmd)) {
    screenEl.scrollIntoView({ block: "end" });
    wipeSequence(cmd);
    return;
  }

  if (cmd === "clear") {
    replEl.replaceChildren();
    newPromptRow();
    screenEl.scrollIntoView({ block: "end" });
    return;
  }

  const handler = COMMANDS[cmd] ?? COMMANDS[cmd.split(" ")[0]];
  if (handler) {
    const args = cmd.replace(/^\S+\s*/, "");
    const text = handler(args);
    if (text) printOut(text, "repl-line " + (DENIED_CMDS.has(cmd) ? "err" : "repl-out"));
  } else if (cmd) {
    printOut(`zsh: command not found: ${cmd}`, "repl-line err");
  }

  newPromptRow();
  screenEl.scrollIntoView({ block: "end" });
}

/* ---- sudo rm -rf / : failsafe, or full wipe + reboot ---- */
const WIPE_PATHS = [
  "/home/user/.config",
  "/home/user/projects",
  "/usr/share/doc",
  "/usr/lib",
  "/boot",
  "/",
];

async function wipeSequence(cmd) {
  /* fake password entry */
  const pwLine = printOut("");
  pwLine.append("[sudo] password for user: ");
  const dots = document.createElement("span");
  pwLine.append(dots);
  await typeChars(dots, "••••••••", 45, 85);
  await sleep(400);

  /* without --no-preserve-root: the kernel refuses (real rm failsafe) */
  if (!cmd.includes("--no-preserve-root")) {
    await glitchScreen(700);
    printOut("rm: it is dangerous to operate recursively on '/'", "repl-line err");
    await sleep(150);
    printOut("rm: use --no-preserve-root to override this failsafe", "repl-line err");
    await sleep(800);
    printOut("kernel: arch does not die that easily.");
    newPromptRow();
    screenEl.scrollIntoView({ block: "end" });
    return;
  }

  /* full wipe: files "delete", heavy glitch, crash, then a rescue reboot */
  printOut("deleting the filesystem. you were warned.", "repl-line err");
  const glitch = glitchScreen(1500);
  for (const path of WIPE_PATHS) {
    printOut(`rm: removing '${path}'...`, "repl-line dim");
    await sleep(280);
  }
  await glitch;
  await sleep(300);

  replEl.replaceChildren();
  printOut("segmentation fault (core dumped)", "repl-line err");
  await sleep(900);
  printOut("recovering from rescue snapshot...", "repl-line repl-out");
  await sleep(1200);
  replEl.replaceChildren();
  await boot();
}

/* ---- click any info chip to run its list command ---- */
document.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  const input = document.querySelector(".repl-row .repl-input:not([disabled])");
  if (!input) return;
  input.focus({ preventScroll: true });
  input.value = chip.dataset.cmd;
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
});

/* click anywhere dead on the screen to focus the live prompt */
screenEl.addEventListener("click", (e) => {
  if (e.target.closest(".repl-row") || e.target.closest(".chip")) return;
  const input = document.querySelector(".repl-row .repl-input:not([disabled])");
  if (input) input.focus({ preventScroll: true });
});

/* ---- boot sequence ---- */
async function boot() {
  bootLine.replaceChildren();
  replEl.replaceChildren();
  renderInfo();

  /* small breathing room — short attention spans welcome */
  await sleep(COMMAND_DELAY_MS);
  const c1 = await typeBootCommand("fastfetch");
  await sleep(200);
  fetchEl.hidden = false;
  c1.remove(); /* cursor goes away once output is visible */

  /* glitch out, swap to whoami mid-glitch */
  await sleep(READING_TIME_MS);
  const glitchDone = glitchScreen(); /* don't await yet */
  await sleep(350); /* cut the screen mid-glitch */
  bootLine.replaceChildren();
  replEl.replaceChildren();
  fetchEl.hidden = true;
  await glitchDone; /* let the glitch finish settling */

  /* whoami — line and its output in the same stream */
  await sleep(COMMAND_DELAY_MS);
  const c2 = await typeBootCommand("whoami", replEl);
  await sleep(250);
  c2.remove();
  printWhoami();

  /* scripted help, then hand the prompt to the visitor */
  await sleep(COMMAND_DELAY_MS);
  const c3 = await typeBootCommand("help", replEl);
  await sleep(250);
  c3.remove();
  printOut(COMMANDS.help());

  /* interactive prompt — anything can be typed from here on */
  await sleep(400);
  clearCursors(bootLine, replEl);
  newPromptRow();

  if (AMBIENT_GLITCH && !ambientStarted) scheduleAmbientGlitch();
}

boot();
