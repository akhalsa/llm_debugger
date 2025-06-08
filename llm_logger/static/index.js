document.addEventListener("DOMContentLoaded", async () => {
  // Use the BASE_URL if it's defined, otherwise default to empty string
  const baseUrl = window.BASE_URL || '';
  
  const res = await fetch(`${baseUrl}/api/sessions`);
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
    // Use the BASE_URL for links as well
    const baseUrl = window.BASE_URL || '';
    return `<li><a href="${baseUrl}/sessions/${encodeURIComponent(id)}">${timestamp}</a></li>`;
  }).join("");
});
