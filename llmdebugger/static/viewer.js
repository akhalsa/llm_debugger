"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
document.addEventListener("DOMContentLoaded", () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const container = document.getElementById("session-content");
    if (!container)
        return;
    const sessionId = new URLSearchParams(window.location.search).get("id") || "demo";
    try {
        const res = yield fetch(`/api/sessions/${sessionId}`);
        const logEntries = yield res.json();
        if (!Array.isArray(logEntries)) {
            container.textContent = "⚠️ Invalid session format.";
            return;
        }
        const parsed = [];
        let prevMessages = [];
        for (let i = 0; i < logEntries.length; i++) {
            const entry = logEntries[i];
            const latency = (_a = entry.latency_ms) !== null && _a !== void 0 ? _a : computeLatency(entry);
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
        function renderEntry(entry, index, total) {
            var _a, _b;
            container.innerHTML = `
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
            (_a = document.getElementById("prev")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => {
                if (currentIndex > 0) {
                    currentIndex -= 1;
                    renderEntry(parsed[currentIndex], currentIndex, parsed.length);
                }
            });
            (_b = document.getElementById("next")) === null || _b === void 0 ? void 0 : _b.addEventListener("click", () => {
                if (currentIndex < parsed.length - 1) {
                    currentIndex += 1;
                    renderEntry(parsed[currentIndex], currentIndex, parsed.length);
                }
            });
        }
    }
    catch (err) {
        console.error("Error loading session:", err);
        container.textContent = "⚠️ Failed to load session data.";
    }
}));
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
function renderMessage(m) {
    var _a;
    const roleColor = {
        system: "#888",
        user: "#0b5394",
        assistant: "#38761d",
        tool: "#990000",
    };
    let content = m.content ? `<pre>${escapeHtml(m.content)}</pre>` : "";
    if ((_a = m.tool_calls) === null || _a === void 0 ? void 0 : _a.length) {
        content += m.tool_calls
            .map((tc) => `
        <div style="border: 1px solid #ccc; padding: 4px; margin-top: 4px;">
          <strong>Tool Call: ${tc.functionName}</strong>
          <pre>${escapeHtml(JSON.stringify(tc.arguments, null, 2))}</pre>
        </div>`)
            .join("");
    }
    return `
    <div style="margin-bottom: 1em;">
      <strong style="color: ${roleColor[m.role]}">${m.role}:</strong>
      ${content || "<em>(empty)</em>"}
    </div>
  `;
}
function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, (tag) => {
        const chars = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
        };
        return chars[tag] || tag;
    });
}
