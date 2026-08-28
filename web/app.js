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

$("new").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("text").value.trim();
  if (!text) return;
  entries.push({ id: crypto.randomUUID(), at: Date.now(), text, reading: "" });
  save(entries);
  $("text").value = "";
  render();
});

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

  const del = document.createElement("button");
  del.className = "secondary";
  del.textContent = "Delete";
  del.onclick = () => {
    entries = entries.filter((e) => e.id !== entry.id);
    save(entries);
    render();
  };

  el.append(date, body, row);

  const reading = document.createElement("p");
  reading.className = "reading";

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

render();
