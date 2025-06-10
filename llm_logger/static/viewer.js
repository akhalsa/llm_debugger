var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { escapeHtml, apiUrl, prettyPrintJson, capitalize } from './common.js';
document.addEventListener("DOMContentLoaded", () => __awaiter(void 0, void 0, void 0, function* () {
    const container = document.getElementById("entry-container");
    const positionDisplay = document.getElementById("entry-position");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const backBtn = document.getElementById("back-btn");
    const refreshBtn = document.getElementById("refresh-btn");
    if (!container || !prevBtn || !nextBtn || !backBtn || !refreshBtn || !positionDisplay)
        return;
    const match = window.location.pathname.match(/\/sessions\/([^\/?#]+)/);
    const sessionId = (match === null || match === void 0 ? void 0 : match[1]) || "demo";
    let parsed = [];
    let currentIndex = 0;
    function loadAndRenderSession() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield fetch(apiUrl(`/api/sessions/${sessionId}`));
                const logEntries = yield res.json();
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
            }
            catch (err) {
                console.error("Error loading session:", err);
                container.textContent = "⚠️ Failed to load session data.";
            }
        });
    }
    function renderCurrentEntry() {
        const entry = parsed[currentIndex];
        container.innerHTML = `
      <div>
        <div><strong>Time:</strong> ${entry.startTime}</div>
        <div class="context-section">
          <button class="toggle-context">Show Context Messages</button>
          <ul class="context-list" style="display: none;">
            ${entry.contextMessages.map(m => {
            var _a;
            return `
              <li data-role="${m.role}" class="context-message">
                <div class="role-label">${capitalize(m.role)}</div>
                <div class="message-body">
                  ${((_a = m.tool_calls) === null || _a === void 0 ? void 0 : _a.length)
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
                    : escapeHtml(m.content || "[no content]")}
                </div>
              </li>
            `;
        }).join("")}
          </ul>
        </div>

        <div><strong>New Messages:</strong></div>
        <ul>
          ${entry.newMessages.map(m => {
            var _a;
            return `
            <li data-role="${m.role}">
              <div class="role-label">${capitalize(m.role)}</div>
              <div class="message-body">
                ${((_a = m.tool_calls) === null || _a === void 0 ? void 0 : _a.length)
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
                    : escapeHtml(m.content || "[no content]")}
              </div>
            </li>
          `;
        }).join("")}
        </ul>
      </div>
    `;
        const toggleBtn = document.querySelector(".toggle-context");
        toggleBtn === null || toggleBtn === void 0 ? void 0 : toggleBtn.addEventListener("click", () => {
            const list = document.querySelector(".context-list");
            if (!list)
                return;
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
    yield loadAndRenderSession();
}));
function parseLogEntry(entry, index, prevEntry) {
    var _a, _b, _c, _d;
    const latency = (_a = entry.latency_ms) !== null && _a !== void 0 ? _a : computeLatency(entry);
    const startTime = entry.start_time
        ? new Date(entry.start_time).toLocaleString()
        : "Unknown";
    const messages = extractMessages(entry);
    let contextMessages = [];
    let newMessages = [];
    if (index === 0) {
        contextMessages = messages.filter(m => m.role === "system");
        newMessages = messages.filter(m => m.role !== "system");
    }
    else if (prevEntry) {
        const prevMessages = extractMessages(prevEntry);
        contextMessages = prevMessages;
        newMessages = messages.filter((m, i) => !deepEqual(m, prevMessages[i]));
    }
    return {
        index,
        startTime,
        latencyMs: latency,
        metadata: {
            model: ((_b = entry.response) === null || _b === void 0 ? void 0 : _b.model) || ((_d = (_c = entry.request_body) === null || _c === void 0 ? void 0 : _c.kwargs) === null || _d === void 0 ? void 0 : _d.model) || "unknown",
            provider: entry.provider || "unknown",
        },
        contextMessages,
        newMessages,
    };
}
function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}
function computeLatency(entry) {
    try {
        return new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime();
    }
    catch (_a) {
        return "Unknown";
    }
}
function extractMessages(entry) {
    var _a, _b, _c, _d, _e;
    const base = ((_b = (_a = entry === null || entry === void 0 ? void 0 : entry.request_body) === null || _a === void 0 ? void 0 : _a.kwargs) === null || _b === void 0 ? void 0 : _b.messages) || [];
    const reply = (_e = (_d = (_c = entry === null || entry === void 0 ? void 0 : entry.response) === null || _c === void 0 ? void 0 : _c.choices) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.message;
    const all = [...base, ...(reply ? [reply] : [])].filter(Boolean);
    return all.map((m) => {
        var _a, _b;
        return ({
            role: m.role,
            content: (_a = m.content) !== null && _a !== void 0 ? _a : null,
            tool_call_id: m.tool_call_id,
            tool_calls: (_b = m.tool_calls) === null || _b === void 0 ? void 0 : _b.map((tc) => {
                var _a, _b;
                return ({
                    id: tc.id,
                    functionName: (_a = tc.function) === null || _a === void 0 ? void 0 : _a.name,
                    arguments: (_b = tc.function) === null || _b === void 0 ? void 0 : _b.arguments,
                });
            }),
        });
    });
}
