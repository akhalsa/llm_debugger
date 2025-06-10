import { escapeHtml, apiUrl, capitalize } from './common.js';

// Types for session data
type MostRecentMessage = {
  starttime: string;
  sender_role: string;
  message: string;
};

type Session = {
  id: string;
  timestamp: string;
  displayDate: string;
  displayTime: string;
  message?: string;
  metadata?: {
    model?: string;
    provider?: string;
  };
};

type GroupedSessions = {
  [date: string]: Session[];
};

// === Helper: Pad numbers to 2 digits ===
function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

// === Helper: Format timestamp for display ===
function formatTimestamp(id: string): { displayDate: string; displayTime: string } {
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
function getTodayDate(): string {
  const today = new Date();
  return `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
}

// === Group sessions by displayDate ===
function groupSessionsByDate(sessions: Session[]): GroupedSessions {
  return sessions.reduce((groups: GroupedSessions, session) => {
    const { displayDate } = session;
    if (!groups[displayDate]) groups[displayDate] = [];
    groups[displayDate].push(session);
    return groups;
  }, {});
}

// === Render the sessions list ===
function renderSessionsList(sessions: Session[], dateString: string): void {
  const container = document.getElementById('session-list-container');
  if (!container) return;

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
  } else {
    const groupedSessions = groupSessionsByDate(sessions);
    const sortedDates = Object.keys(groupedSessions).sort((a, b) => {
      if (a === 'Unknown Date') return 1;
      if (b === 'Unknown Date') return -1;
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
        const baseUrl = (window as any).BASE_URL || '';
        const senderRole = session.metadata?.provider || 'assistant';
        const capitalizedSenderRole = capitalize(senderRole);

        html += `
          <li class="session-item">
            <a href="${baseUrl}/sessions/${encodeURIComponent(session.id)}" class="session-link">
              <div class="session-content">
                <div class="sender-name">${escapeHtml(capitalizedSenderRole)}</div>
                ${
                  session.message
                    ? `<div class="message-text">${escapeHtml(session.message.substring(0, 100))}${session.message.length > 100 ? '...' : ''}</div>`
                    : `<div class="empty-message">No message content</div>`
                }
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
  const datePicker = document.getElementById('date-picker') as HTMLInputElement;
  if (datePicker) {
    if (!datePicker.value) datePicker.value = dateString;
    datePicker.addEventListener('change', handleDateChange);
  }
}

// === Fetch and display sessions ===
async function fetchAndDisplaySessions(dateString?: string): Promise<void> {
  try {
    const selectedDate = dateString || getTodayDate();
    const res = await fetch(apiUrl(`/api/sessions?date=${selectedDate}`));
    const sessionData = await res.json();

    const sessions: Session[] = sessionData.map((session: { static_id: string; most_recent_message: MostRecentMessage }) => {
      const id = session.static_id;
      const timestamp = session.most_recent_message?.starttime || id;
      const { displayDate, displayTime } = formatTimestamp(timestamp);

      return {
        id,
        timestamp,
        displayDate,
        displayTime,
        message: session.most_recent_message?.message,
        metadata: {
          provider: session.most_recent_message?.sender_role || 'Assistant'
        }
      };
    });

    renderSessionsList(sessions, selectedDate);
  } catch (error) {
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
}

// === Handle date picker changes ===
function handleDateChange(event: Event): void {
  const datePicker = event.target as HTMLInputElement;
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
