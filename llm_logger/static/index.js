document.addEventListener("DOMContentLoaded", async () => {
  const res = await fetch("/api/sessions");
  const sessions = await res.json();
  const list = document.getElementById("session-list");

  if (!sessions.length) {
    list.innerHTML = "<li>No sessions found.</li>";
    return;
  }

  list.innerHTML = sessions.map(filename => {
    const id = filename.replace(/\.json$/, "");
    let timestamp = id;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}/.test(id)) {
      timestamp = id.slice(0, 19).replace("T", " ");
    }
    return `<li><a href="/static/session.html?id=${encodeURIComponent(id)}">${timestamp}</a></li>`;
  }).join("");
});
