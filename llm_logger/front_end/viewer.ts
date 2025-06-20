import { escapeHtml, apiUrl, prettyPrintJson, capitalize } from './common.js';

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
  tokenUsage: {
    total: number | null;
    prompt: number | null;
    completion: number | null;
  };
  contextMessages: ViewModelMessage[];
  newMessages: ViewModelMessage[];
};

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("entry-container")!;
  const positionDisplay = document.getElementById("entry-position")!;
  const prevBtn = document.getElementById("prev-btn") as HTMLButtonElement;
  const nextBtn = document.getElementById("next-btn") as HTMLButtonElement;
  const backBtn = document.getElementById("back-btn") as HTMLButtonElement;
  const refreshBtn = document.getElementById("refresh-btn") as HTMLButtonElement;

  if (!container || !prevBtn || !nextBtn || !backBtn || !refreshBtn || !positionDisplay) return;

  const match = window.location.pathname.match(/\/sessions\/([^\/?#]+)/);
  const sessionId = match?.[1] || "demo";

  let parsed: ViewModelEntry[] = [];
  let currentIndex = 0;

  async function loadAndRenderSession() {
    try {
      const res = await fetch(apiUrl(`/api/sessions/${sessionId}`));
      const logEntries = await res.json();

      if (!Array.isArray(logEntries)) {
        container.textContent = "⚠️ Invalid session format.";
        return;
      }

      parsed = logEntries.map((entry, i) => {
        const prev = i > 0 ? logEntries[i - 1] : undefined;
        return parseLogEntry(entry, i, prev);
      });

      currentIndex = parsed.length - 1;
      renderCurrentEntry();
    } catch (err) {
      console.error("Error loading session:", err);
      container.textContent = "⚠️ Failed to load session data.";
    }
  }

  function renderCurrentEntry() {
    const entry = parsed[currentIndex];

    container.innerHTML = `
      <div>
        <div><strong>Time:</strong> ${entry.startTime}</div>
        <div><strong>Model:</strong> ${entry.metadata.model} (${entry.metadata.provider})</div>
        <div><strong>Latency:</strong> ${entry.latencyMs === "Unknown" ? "Unknown" : `${entry.latencyMs}ms`}</div>
        <div><strong>Token Usage:</strong> ${entry.tokenUsage.total !== null ? `${entry.tokenUsage.total} tokens total` : "Unknown"} 
          ${entry.tokenUsage.prompt !== null ? `(${entry.tokenUsage.prompt} prompt, ${entry.tokenUsage.completion} completion)` : ""}
        </div>
        <div class="context-section">
          <button class="toggle-context">Show Context Messages</button>
          <ul class="context-list" style="display: none;">
            ${entry.contextMessages.map(m => `
              <li data-role="${m.role}" class="context-message">
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
              </li>
            `).join("")}
          </ul>
        </div>

        <div><strong>New Messages:</strong></div>
        <ul>
          ${entry.newMessages.map(m => `
            <li data-role="${m.role}">
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
            </li>
          `).join("")}
        </ul>
      </div>
    `;

    const toggleBtn = document.querySelector(".toggle-context") as HTMLButtonElement;
    toggleBtn?.addEventListener("click", () => {
      const list = document.querySelector(".context-list") as HTMLElement;
      if (!list) return;
      const isOpen = list.style.display !== "none";
      list.style.display = isOpen ? "none" : "block";
      toggleBtn.textContent = isOpen ? "Show Context Messages" : "Hide Context Messages";
    });

    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === parsed.length - 1;

    positionDisplay.textContent = `Entry ${currentIndex + 1} of ${parsed.length}`;
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

  backBtn.addEventListener("click", () => {
    window.location.href = "/";
  });

  refreshBtn.addEventListener("click", () => {
    loadAndRenderSession();
  });

  await loadAndRenderSession();
});


function parseLogEntry(entry: any, index: number, prevEntry?: any): ViewModelEntry {
  const latency = entry.latency_ms ?? computeLatency(entry);
  const startTime = entry.start_time
    ? new Date(entry.start_time).toLocaleString()
    : "Unknown";

  const messages = extractMessages(entry);

  // Extract token usage information
  const tokenUsage = {
    total: entry.response?.usage?.total_tokens || null,
    prompt: entry.response?.usage?.prompt_tokens || null,
    completion: entry.response?.usage?.completion_tokens || null
  };


  let contextMessages: ViewModelMessage[] = [];
  let newMessages: ViewModelMessage[] = [];

  if (index === 0) {
    contextMessages = messages.filter(m => m.role === "system");
    newMessages = messages.filter(m => m.role !== "system");
  } else if (prevEntry) {
    const prevMessages = extractMessages(prevEntry);
    contextMessages = prevMessages;
    newMessages = messages.filter((m, i) => !deepEqual(m, prevMessages[i]));
  }

  return {
    index,
    startTime,
    latencyMs: latency,
    metadata: {
      model: entry.response?.model || entry.request_body?.kwargs?.model || "unknown",
      provider: entry.provider || "unknown",
    },
    tokenUsage,
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
