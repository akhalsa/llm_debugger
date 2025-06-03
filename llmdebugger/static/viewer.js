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
function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, m => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[m] || m);
}
document.addEventListener("DOMContentLoaded", () => __awaiter(void 0, void 0, void 0, function* () {
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
        const parsed = logEntries.map((entry, i) => {
            const prev = i > 0 ? logEntries[i - 1] : undefined;
            return parseLogEntry(entry, i, prev);
        });
        container.innerHTML = `<pre>${escapeHtml(JSON.stringify(parsed, null, 2))}</pre>`;
    }
    catch (err) {
        console.error("Error loading session:", err);
        container.textContent = "⚠️ Failed to load session data.";
    }
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
        // naive deep comparison — works for small arrays
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
