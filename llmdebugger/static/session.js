function computeLatency(entry) {
  try {
    const start = new Date(entry.start_time);
    const end = new Date(entry.end_time);
    return end - start;
  } catch {
    return "Unknown";
  }
}

function escape(str) {
  return (str || "").replace(/[&<>"']/g, function (m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m];
  });
}

function renderEntry(index) {
  currentIndex = index;
  const entry = sessionData[index];
  const prevEntry = sessionData[index - 1];
  const app = document.getElementById("session-content");

  const getMessages = e => {
    const base = e?.request_body?.kwargs?.messages || [];
    const assistantReply = e?.response?.choices?.[0]?.message;
    return [...base, ...(assistantReply ? [assistantReply] : [])].filter(Boolean);
  };

  const getMessageKey = m =>
    `${m.role}:${m.name || ""}:${m.tool_call_id || ""}:${m.content || JSON.stringify(m.tool_calls)}`;

  const prevMsgs = prevEntry ? getMessages(prevEntry) : [];
  const currMsgs = getMessages(entry);

  const seenKeys = new Set(prevMsgs.map(getMessageKey));
  let newMessages;

  if (!prevEntry) {
    const firstUserIdx = currMsgs.findIndex(m => m.role === "user");
    newMessages = currMsgs.slice(firstUserIdx);
  } else {
    newMessages = currMsgs.filter(m => !seenKeys.has(getMessageKey(m)));
  }

  const latency = entry.latency_ms ?? computeLatency(entry);
  const startTime = entry.start_time ? new Date(entry.start_time).toLocaleString() : "Unknown";

  // 🧠 Context = all prior messages excluding the new ones
  let lastUserIndex = currMsgs.map(m => m.role).lastIndexOf("user");
  if (lastUserIndex === -1) lastUserIndex = currMsgs.length - 1;
  const contextMessages = currMsgs
    .slice(0, lastUserIndex)
    .filter(m => !newMessages.includes(m));

  const contextHtml = contextMessages.map(m => `
    <div style="margin:6px 0;padding:6px;background:#f9f9f9;border-left:4px solid #ccc;">
      <strong>${m.role}:</strong> ${escape(m?.content || "")}
    </div>
  `).join("");

  const renderedMessages = newMessages.map(m => {
    if (m.tool_calls?.length) {
      return m.tool_calls.map(tc => `
        <div style="margin:6px 0;padding:6px;background:#fff3cd;border-left:4px solid #ffc107;">
          <strong>🔧 Tool Call: ${escape(tc.function?.name)}</strong><br>
          <pre>${escape(typeof tc.function?.arguments === "string" 
            ? tc.function.arguments 
            : JSON.stringify(tc.function.arguments, null, 2))}</pre>
        </div>
      `).join("");
    } else if (m.role === "tool") {
      return `
        <div style="margin:6px 0;padding:6px;background:#e0f7fa;border-left:4px solid #00acc1;">
          <strong>🔨 Tool Response</strong><br>
          <pre>${escape(m.content || "")}</pre>
        </div>
      `;
    } else if (m.role === "assistant" && m.content) {
      return `
        <div style="margin:6px 0;padding:6px;background:#f0f0ff;border-left:4px solid #6666cc;">
          <strong>🤖 Assistant:</strong> ${escape(m.content)}
        </div>
      `;
    } else {
      return `
        <div style="margin:6px 0;padding:6px;background:#f9f9f9;border-left:4px solid #ccc;">
          <strong>${m.role}:</strong> ${escape(m.content || "")}
        </div>
      `;
    }
  }).join("");

  app.innerHTML = `
    <div style="font-family: sans-serif; max-width: 800px; margin: auto;">
      <h2>Entry ${index + 1} of ${sessionData.length}</h2>

      <details style="margin-bottom: 1em;" ${contextMessages.length > 0 ? "" : "disabled"}>
        <summary>🧠 Context (${contextMessages.length} messages)</summary>
        ${contextHtml || "<p>No prior context.</p>"}
      </details>

      ${renderedMessages || "<p>No new messages in this turn.</p>"}

      <h4>⏱️ Metadata</h4>
      <p><strong>Start Time:</strong> ${startTime}<br>
         <strong>Latency:</strong> ${latency} ms</p>

      <div style="margin-top: 20px;">
        <button ${index === 0 ? "disabled" : ""} onclick="renderEntry(${index - 1})">← Back</button>
        <button ${index >= sessionData.length - 1 ? "disabled" : ""} onclick="renderEntry(${index + 1})">Next →</button>
      </div>
    </div>
  `;

  window.scrollTo({ top: 0, behavior: "smooth" }); // Optional: smoother UX
}

let sessionData = [];
let currentIndex = 0;

const sessionId = new URLSearchParams(window.location.search).get("id") || "demo";

async function fetchSession(sessionId) {
  try {
    const res = await fetch(`/api/sessions/${sessionId}`);
    const log = await res.json();
    console.log("Fetched session:", log);

    if (!Array.isArray(log) || log.length === 0) {
      document.getElementById("session-content").textContent = "No entries found.";
      return;
    }

    sessionData = log;
    renderEntry(log.length - 1);
  } catch (err) {
    console.error("Failed to load session:", err);
    document.getElementById("session-content").textContent = "⚠️ Failed to load session data.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fetchSession(sessionId);
});
