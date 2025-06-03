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

function escapeHtml(str: string): string {
  return (str || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[m] || m);
}

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("entry-container")!;
  const prevBtn = document.getElementById("prev-btn") as HTMLButtonElement;
  const nextBtn = document.getElementById("next-btn") as HTMLButtonElement;

  if (!container || !prevBtn || !nextBtn) return;

  const sessionId = new URLSearchParams(window.location.search).get("id") || "demo";

  try {
    const res = await fetch(`/api/sessions/${sessionId}`);
    const logEntries = await res.json();

    if (!Array.isArray(logEntries)) {
      container.textContent = "⚠️ Invalid session format.";
      return;
    }

    const parsed = logEntries.map((entry, i) => {
      const prev = i > 0 ? logEntries[i - 1] : undefined;
      return parseLogEntry(entry, i, prev);
    });

    let currentIndex = 0;

    function renderCurrentEntry() {
      const entry = parsed[currentIndex];
      container.innerHTML = `
        <div>
          <div><strong>Time:</strong> ${entry.startTime}</div>
          <div><strong>New Messages:</strong></div>
          <ul>
            ${entry.newMessages
              .map((m) =>
                `<li data-role="${m.role}">
                  <div class="role-label">${capitalize(m.role)}</div>
                  <div class="message-body">
                    ${
                      m.tool_calls?.length
                        ? m.tool_calls.map(tc => `
                            <div class="tool-call">
                              <strong>Tool:</strong> ${escapeHtml(tc.functionName)}
                              <pre>${escapeHtml(typeof tc.arguments === "string" ? tc.arguments : JSON.stringify(tc.arguments, null, 2))}</pre>
                            </div>
                          `).join("")
                        : m.role === "tool" && m.content
                          ? `<div class="tool-response">
                              <div class="tool-call-label">Tool Response:</div>
                              <pre class="tool-response-body">${escapeHtml(prettyPrintJson(m.content))}</pre>
                            </div>`
                          : escapeHtml(m.content || "[no content]")
                    }
                  </div>
                </li>`
              ).join("")}
          </ul>
        </div>
      `;

      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex === parsed.length - 1;
    }

    prevBtn.addEventListener("click", () => {
      if (currentIndex > 0) {
        currentIndex--;
        renderCurrentEntry();
      }
    });

    nextBtn.addEventListener("click", () => {
      if (currentIndex < parsed.length - 1) {
        currentIndex++;
        renderCurrentEntry();
      }
    });

    renderCurrentEntry();
  } catch (err) {
    console.error("Error loading session:", err);
    container.textContent = "⚠️ Failed to load session data.";
  }
});

function prettyPrintJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


function parseLogEntry(entry: any, index: number, prevEntry?: any): ViewModelEntry {
  const latency = entry.latency_ms ?? computeLatency(entry);
  const startTime = entry.start_time
    ? new Date(entry.start_time).toLocaleString()
    : "Unknown";

  const messages = extractMessages(entry);

  let contextMessages: ViewModelMessage[] = [];
  let newMessages: ViewModelMessage[] = [];

  if (index === 0) {
    contextMessages = messages.filter(m => m.role === "system");
    newMessages = messages.filter(m => m.role !== "system");
  } else if (prevEntry) {
    const prevMessages = extractMessages(prevEntry);
    contextMessages = prevMessages;

    // naive deep comparison — works for small arrays
    newMessages = messages.filter(
      (m, i) => !deepEqual(m, prevMessages[i])
    );
  }

  return {
    index,
    startTime,
    latencyMs: latency,
    metadata: {
      model: entry.response?.model || entry.request_body?.kwargs?.model || "unknown",
      provider: entry.provider || "unknown",
    },
    contextMessages,
    newMessages,
  };
}

function deepEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

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
