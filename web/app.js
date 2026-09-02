const KEY = "dream.entries";
const $ = (id) => document.getElementById(id);

const load = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return []; // corrupt storage should not brick the app
  }
};
const save = (entries) => localStorage.setItem(KEY, JSON.stringify(entries));

let entries = load();

// Cmd/Ctrl+Enter saves. This gets written half-awake at 6am; reaching for the mouse
// is the difference between logging a fragment and losing it.
$("text").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) $("new").requestSubmit();
});

$("new").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("text").value.trim();
  if (!text) return;
  entries.push({ id: crypto.randomUUID(), at: Date.now(), text, reading: "" });
  save(entries);
  $("text").value = "";
  render();
  say("Dream saved.");
});

// One live region for the whole app. The entry list must NOT be one, or every render
// re-announces the entire journal.
function say(msg) {
  $("status").textContent = msg;
}

function render() {
  $("count").textContent = entries.length
    ? `${entries.length} ${entries.length === 1 ? "dream" : "dreams"}`
    : "";

  const list = $("entries");
  list.textContent = "";

  if (!entries.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "Nothing yet. The readings get sharper once there is something to compare against.";
    list.append(p);
    return;
  }

  // Newest first on screen; entries stays oldest-first so history reads chronologically.
  for (const entry of [...entries].reverse()) list.append(view(entry));
}

function view(entry) {
  const el = document.createElement("article");
  el.className = "entry";
  el.dataset.id = entry.id;

  const date = document.createElement("div");
  date.className = "date";
  date.textContent = new Date(entry.at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const body = document.createElement("p");
  body.className = "body";
  body.textContent = entry.text;

  const row = document.createElement("div");
  row.className = "row";

  // Two-step, because deleting a dream is permanent and there is no undo and no backup.
  // Inline rather than confirm(), which is a modal nobody reads.
  const del = document.createElement("button");
  del.className = "secondary";
  del.textContent = "Delete";
  let armed = false;
  del.onclick = () => {
    if (!armed) {
      armed = true;
      del.textContent = "Delete for good?";
      del.classList.add("armed");
      setTimeout(() => {
        armed = false;
        del.textContent = "Delete";
        del.classList.remove("armed");
      }, 4000);
      return;
    }
    entries = entries.filter((e) => e.id !== entry.id);
    save(entries);
    render();
    say("Dream deleted.");
  };

  el.append(date, body, row);

  const reading = document.createElement("p");
  reading.className = "reading";
  reading.tabIndex = -1;

  if (entry.reading) {
    reading.textContent = entry.reading;
    el.append(reading);
    row.append(del);
    return el;
  }

  const go = document.createElement("button");
  go.textContent = "Interpret";
  go.onclick = async () => {
    go.disabled = true;
    go.textContent = "Reading…";
    try {
      entry.reading = await interpret(entry);
      save(entries);
      render();
      // render() rebuilds the list, so focus would otherwise fall back to the body.
      // Put it on the reading the person just asked for.
      const fresh = document.querySelector(`[data-id="${entry.id}"] .reading`);
      fresh?.focus();
      say("Reading ready.");
    } catch (err) {
      reading.textContent = err.message;
      el.append(reading);
      go.disabled = false;
      go.textContent = "Try again";
    }
  };

  row.append(go, del);
  return el;
}

async function interpret(entry) {
  // Only entries written before this one — a reading must never cite the future.
  const history = entries
    .filter((e) => e.at < entry.at)
    .map((e) => ({ at: e.at, text: e.text }));

  const res = await fetch("/api/interpret", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: entry.text, history }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      res.status === 429
        ? "Too many readings for now. Give it a minute."
        : data.error || "Could not reach the interpreter."
    );
  }
  return data.reading;
}

// Export is the only backstop against clearing site data, since nothing is stored
// anywhere else. Cheap insurance until accounts land.
$("export").addEventListener("click", () => {
  if (!entries.length) return say("Nothing to export yet.");
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `dreams-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  say("Exported.");
});

render();

// Speak: record in the browser, send the bytes once, append the words. Half-awake at
// 6am, talking beats typing. Audio is sent for that request only, never stored.
(() => {
  const btn = $("speak");
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return;
  btn.hidden = false;
  let rec = null;
  btn.addEventListener("click", async () => {
    if (rec) { rec.stop(); return; }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      say("Microphone blocked.");
      return;
    }
    const chunks = [];
    rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: rec.mimeType });
      rec = null;
      btn.textContent = "Speak";
      btn.classList.remove("armed");
      btn.disabled = true;
      say("Listening back…");
      try {
        const res = await fetch("/api/transcribe", { method: "POST", body: blob });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "failed");
        const t = $("text");
        t.value = (t.value.trim() ? t.value.trim() + " " : "") + data.text;
        t.dispatchEvent(new Event("input"));
        t.focus();
        say("Words added.");
      } catch (err) {
        say(err.message === "rate limited" ? "Too many recordings. Wait a minute." : "Could not transcribe that.");
      } finally {
        btn.disabled = false;
      }
    };
    rec.start();
    btn.textContent = "Stop";
    btn.classList.add("armed");
    say("Recording.");
  });
})();
