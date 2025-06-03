// log_viewer_debugged.ts

type Role = "system" | "user" | "assistant" | "tool";

type ToolCall = {
  id: string;
  functionName: string;
  arguments: Record<string, any> | string;
};

type ViewModelMessage = {
  role: Role;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

type ViewModelEntry = {
  index: number;
  startTime: string;
  latencyMs: number | "Unknown";
  metadata: {
    model: string;
    provider: string;
  };
  contextMessages: ViewModelMessage[];
  newMessages: ViewModelMessage[];
};

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("session-content");
  if (!container) return;

  const sessionId = new URLSearchParams(window.location.search).get("id") || "demo";

  try {
    const res = await fetch(`/api/sessions/${sessionId}`);
    const logEntries = await res.json();

    if (!Array.isArray(logEntries)) {
      container.textContent = "⚠️ Invalid session format.";
      return;
    }

    const parsed: ViewModelEntry[] = [];
    let prevMessages: ViewModelMessage[] = [];

    for (let i = 0; i < logEntries.length; i++) {
      const entry = logEntries[i];
      const latency = entry.latency_ms ?? computeLatency(entry);
      const startTime = entry.start_time
        ? new Date(entry.start_time).toLocaleString()
        : "Unknown";

      const allMessages = extractMessages(entry);
      const contextMessages = i === 0 ? [allMessages[0]] : [...prevMessages];
      const newMessages = i === 0
        ? allMessages.slice(1)
        : allMessages.filter((m, j) => JSON.stringify(m) !== JSON.stringify(prevMessages[j]));

      parsed.push({
        index: i,
        startTime,
        latencyMs: latency,
        metadata: {
          model: entry.model || "unknown",
          provider: entry.provider || "unknown",
        },
        contextMessages,
        newMessages,
      });

      prevMessages = allMessages;
    }

    let currentIndex = 0;
    renderEntry(currentIndex);

    function renderEntry(index: number) {
      currentIndex = index;
      const entry = parsed[index];
      const prevEntry = parsed[index - 1];
      const app = document.getElementById("session-content");
      if (!app) {
        console.error("Missing container #session-content");
        return;
      }

      const contextHtml = entry.contextMessages.map(renderMessage).join("");
      const newMessagesHtml = entry.newMessages.map(renderMessage).join("");

      app.innerHTML = `
        <div style="font-family: sans-serif; max-width: 800px; margin: auto;">
          <h2>Entry ${entry.index + 1} of ${parsed.length}</h2>

          <details style="margin-bottom: 1em;" ${entry.contextMessages.length ? "open" : ""}>
            <summary>🧠 Context (${entry.contextMessages.length} messages)</summary>
            <div style="margin-left: 1em">${contextHtml || "<p>No prior context.</p>"}</div>
          </details>

          <h3>💬 New Messages</h3>
          <div style="margin-left: 1em">${newMessagesHtml || "<p>No new messages in this turn.</p>"}</div>

          <details style="margin-top: 1em;">
            <summary>⏱️ Metadata</summary>
            <p>
              <strong>Start Time:</strong> ${entry.startTime}<br>
              <strong>Latency:</strong> ${entry.latencyMs} ms<br>
              <strong>Model:</strong> ${entry.metadata.model}<br>
              <strong>Provider:</strong> ${entry.metadata.provider}
            </p>
          </details>

          <div style="margin-top: 20px;">
            <button id="prev-btn" ${index === 0 ? "disabled" : ""}>← Back</button>
            <button id="next-btn" ${index >= parsed.length - 1 ? "disabled" : ""}>Next →</button>
          </div>
        </div>
      `;

      document.getElementById("prev-btn")?.addEventListener("click", () => renderEntry(index - 1));
      document.getElementById("next-btn")?.addEventListener("click", () => renderEntry(index + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  } catch (err) {
    console.error("Error loading session:", err);
    container.textContent = "⚠️ Failed to load session data.";
  }
});

function computeLatency(entry: any): number | "Unknown" {
  try {
    return new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime();
  } catch {
    return "Unknown";
  }
}

function extractMessages(entry: any): ViewModelMessage[] {
  const base = entry?.request_body?.kwargs?.messages || [];
  const reply = entry?.response?.choices?.[0]?.message;
  const all = [...base, ...(reply ? [reply] : [])].filter(Boolean);

  return all.map((m: any) => ({
    role: m.role,
    content: m.content ?? null,
    tool_call_id: m.tool_call_id,
    tool_calls: Array.isArray(m.tool_calls)
      ? m.tool_calls.map((tc: any) => ({
          id: tc.id,
          functionName: tc.function?.name,
          arguments: tc.function?.arguments,
        }))
      : undefined,
  }));
}

function renderMessage(m: ViewModelMessage): string {
  const roleColor: Record<Role, string> = {
    system: "#888",
    user: "#0b5394",
    assistant: "#38761d",
    tool: "#990000",
  };

  let content = m.content ? `<pre>${escapeHtml(m.content)}</pre>` : "";
  if (m.tool_calls?.length) {
    content += m.tool_calls
      .map(
        (tc) => `
        <div style="border: 1px solid #ccc; padding: 4px; margin-top: 4px;">
          <strong>Tool Call: ${tc.functionName}</strong>
          <pre>${escapeHtml(JSON.stringify(tc.arguments, null, 2))}</pre>
        </div>`
      )
      .join("");
  }

  return `
    <div style="margin-bottom: 1em;">
      <strong style="color: ${roleColor[m.role]}">${m.role}:</strong>
      ${content || "<em>(empty)</em>"}
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>'"]/g, (tag) => {
    const chars: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return chars[tag] || tag;
  });
}