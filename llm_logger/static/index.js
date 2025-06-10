var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { escapeHtml, apiUrl, capitalize } from './common.js';
// === Helper: Pad numbers to 2 digits ===
function pad2(n) {
    return n < 10 ? '0' + n : String(n);
}
// === Helper: Format timestamp for display ===
function formatTimestamp(id) {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}/.test(id)) {
        const date = new Date(id.slice(0, 19));
        return {
            displayDate: date.toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),
            displayTime: date.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit'
            })
        };
    }
    return {
        displayDate: 'Unknown Date',
        displayTime: id
    };
}
// === Helper: Get today's date in YYYY-MM-DD format ===
function getTodayDate() {
    const today = new Date();
    return `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
}
// === Group sessions by displayDate ===
function groupSessionsByDate(sessions) {
    return sessions.reduce((groups, session) => {
        const { displayDate } = session;
        if (!groups[displayDate])
            groups[displayDate] = [];
        groups[displayDate].push(session);
        return groups;
    }, {});
}
// === Render the sessions list ===
function renderSessionsList(sessions, dateString) {
    const container = document.getElementById('session-list-container');
    if (!container)
        return;
    let html = `
    <div class="date-picker-container">
      <label for="date-picker">Select Date: </label>
      <input type="date" id="date-picker" class="date-input">
    </div>
    <div id="sessions-list">
  `;
    if (!sessions.length) {
        html += `
      <div class="empty-state">
        <p>No sessions found for the selected date.</p>
        <p>Try selecting a different date or start using LLM Logger in your application to see sessions here.</p>
      </div>
    `;
    }
    else {
        const groupedSessions = groupSessionsByDate(sessions);
        const sortedDates = Object.keys(groupedSessions).sort((a, b) => {
            if (a === 'Unknown Date')
                return 1;
            if (b === 'Unknown Date')
                return -1;
            return new Date(b).getTime() - new Date(a).getTime();
        });
        sortedDates.forEach(date => {
            const sessionsForDate = groupedSessions[date];
            sessionsForDate.sort((a, b) => {
                if (!/^\d{4}-\d{2}-\d{2}T\d{2}/.test(a.id) || !/^\d{4}-\d{2}-\d{2}T\d{2}/.test(b.id)) {
                    return a.id.localeCompare(b.id);
                }
                return b.id.localeCompare(a.id);
            });
            html += `
        <div class="date-group">
          <h2 class="date-header">${escapeHtml(date)}</h2>
          <ul class="session-list">
      `;
            sessionsForDate.forEach(session => {
                var _a;
                const baseUrl = window.BASE_URL || '';
                const senderRole = ((_a = session.metadata) === null || _a === void 0 ? void 0 : _a.provider) || 'assistant';
                const capitalizedSenderRole = capitalize(senderRole);
                html += `
          <li class="session-item">
            <a href="${baseUrl}/sessions/${encodeURIComponent(session.id)}" class="session-link">
              <div class="session-content">
                <div class="sender-name">${escapeHtml(capitalizedSenderRole)}</div>
                ${session.message
                    ? `<div class="message-text">${escapeHtml(session.message.substring(0, 100))}${session.message.length > 100 ? '...' : ''}</div>`
                    : `<div class="empty-message">No message content</div>`}
                <div class="session-footer">
                  <span class="session-id-small">${escapeHtml(session.id.substring(0, 8))}...</span>
                  <span class="session-time-small">${escapeHtml(session.displayTime)}</span>
                </div>
              </div>
            </a>
          </li>
        `;
            });
            html += `</ul></div>`;
        });
    }
    html += `</div>`;
    container.innerHTML = html;
    // === Reattach date picker listener ===
    const datePicker = document.getElementById('date-picker');
    if (datePicker) {
        if (!datePicker.value)
            datePicker.value = dateString;
        datePicker.addEventListener('change', handleDateChange);
    }
}
// === Fetch and display sessions ===
function fetchAndDisplaySessions(dateString) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const selectedDate = dateString || getTodayDate();
            const res = yield fetch(apiUrl(`/api/sessions?date=${selectedDate}`));
            const sessionData = yield res.json();
            const sessions = sessionData.map((session) => {
                var _a, _b, _c;
                const id = session.static_id;
                const timestamp = ((_a = session.most_recent_message) === null || _a === void 0 ? void 0 : _a.starttime) || id;
                const { displayDate, displayTime } = formatTimestamp(timestamp);
                return {
                    id,
                    timestamp,
                    displayDate,
                    displayTime,
                    message: (_b = session.most_recent_message) === null || _b === void 0 ? void 0 : _b.message,
                    metadata: {
                        provider: ((_c = session.most_recent_message) === null || _c === void 0 ? void 0 : _c.sender_role) || 'Assistant'
                    }
                };
            });
            renderSessionsList(sessions, selectedDate);
        }
        catch (error) {
            console.error('Error fetching sessions:', error);
            const container = document.getElementById('session-list-container');
            if (container) {
                container.innerHTML = `
        <div class="error-state">
          <p>⚠️ Failed to load sessions.</p>
          <p>Please check your connection and try again.</p>
        </div>
      `;
            }
        }
    });
}
// === Handle date picker changes ===
function handleDateChange(event) {
    const datePicker = event.target;
    const selectedDate = datePicker.value;
    if (selectedDate) {
        fetchAndDisplaySessions(selectedDate);
    }
}
// === Initial load ===
document.addEventListener('DOMContentLoaded', () => {
    const today = getTodayDate();
    fetchAndDisplaySessions(today);
});
