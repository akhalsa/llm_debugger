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
      const contextMessages = i === 0
        ? [allMessages[0]]
        : [...prevMessages];

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
    renderEntry(parsed[currentIndex], currentIndex, parsed.length);

    function renderEntry(entry: ViewModelEntry, index: number, total: number) {
      container!.innerHTML = `
        <h2>Session Entry ${index + 1} / ${total}</h2>
        <p><strong>${entry.startTime}</strong> · ${entry.latencyMs}ms · ${entry.metadata.model} (${entry.metadata.provider})</p>

        <details open>
          <summary><strong>Context Messages</strong></summary>
          <div style="margin-left: 1em">
            ${entry.contextMessages.map(renderMessage).join("")}
          </div>
        </details>

        <h3>New Messages</h3>
        <div style="margin-left: 1em">
          ${entry.newMessages.map(renderMessage).join("")}
        </div>

        <div style="margin-top: 16px;">
          <button id="prev" ${index === 0 ? "disabled" : ""}>⬅️ Previous</button>
          <button id="next" ${index === total - 1 ? "disabled" : ""}>Next ➡️</button>
        </div>
      `;

      document.getElementById("prev")?.addEventListener("click", () => {
        if (currentIndex > 0) {
          currentIndex -= 1;
          renderEntry(parsed[currentIndex], currentIndex, parsed.length);
        }
      });

      document.getElementById("next")?.addEventListener("click", () => {
        if (currentIndex < parsed.length - 1) {
          currentIndex += 1;
          renderEntry(parsed[currentIndex], currentIndex, parsed.length);
        }
      });
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
    tool_calls: m.tool_calls?.map((tc: any) => ({
      id: tc.id,
      functionName: tc.function?.name,
      arguments: tc.function?.arguments,
    })),
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
