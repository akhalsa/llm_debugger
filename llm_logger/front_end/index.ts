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

// Group sessions by date
type GroupedSessions = {
  [date: string]: Session[];
};

// Function to format the timestamp for display
function formatTimestamp(id: string): { displayDate: string; displayTime: string } {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}/.test(id)) {
    const date = new Date(id.slice(0, 19));
    return {
      displayDate: date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
      displayTime: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    };
  }
  return {
    displayDate: 'Unknown Date',
    displayTime: id
  };
}

// Function to group sessions by date
function groupSessionsByDate(sessions: Session[]): GroupedSessions {
  return sessions.reduce((groups: GroupedSessions, session) => {
    const { displayDate } = session;
    if (!groups[displayDate]) {
      groups[displayDate] = [];
    }
    groups[displayDate].push(session);
    return groups;
  }, {});
}

// Function to render the sessions list
function renderSessionsList(sessions: Session[]): void {
  const container = document.getElementById('session-list-container');
  if (!container) return;

  if (!sessions.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No sessions found.</p>
        <p>Start using LLM Logger in your application to see sessions here.</p>
      </div>
    `;
    return;
  }

  // Group sessions by date
  const groupedSessions = groupSessionsByDate(sessions);
  
  // Sort dates in descending order (newest first)
  const sortedDates = Object.keys(groupedSessions).sort((a, b) => {
    // Special handling for 'Unknown Date'
    if (a === 'Unknown Date') return 1;
    if (b === 'Unknown Date') return -1;
    return new Date(b).getTime() - new Date(a).getTime();
  });

  // Build the HTML
  let html = `
    <div class="search-container">
      <input type="text" id="session-search" placeholder="Search sessions..." class="search-input">
    </div>
    <div id="sessions-list">
  `;

  sortedDates.forEach(date => {
    const sessionsForDate = groupedSessions[date];
    
    // Sort sessions for this date by timestamp (newest first)
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
      // Capitalize first letter of sender role
      const senderRole = session.metadata?.provider || 'assistant';
      const capitalizedSenderRole = capitalize(senderRole);
      
      html += `
        <li class="session-item">
          <a href="${baseUrl}/sessions/${encodeURIComponent(session.id)}" class="session-link">
            <div class="session-content">
              <div class="sender-name">${escapeHtml(capitalizedSenderRole)}</div>
              ${session.message ? 
                `<div class="message-text">${escapeHtml(session.message.substring(0, 100))}${session.message.length > 100 ? '...' : ''}</div>` : 
                `<div class="empty-message">No message content</div>`
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

    html += `
        </ul>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;

  // Add search functionality
  const searchInput = document.getElementById('session-search') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const searchTerm = searchInput.value.toLowerCase();
      const sessionItems = document.querySelectorAll('.session-item');
      
      sessionItems.forEach(item => {
        const text = item.textContent?.toLowerCase() || '';
        const dateGroup = item.closest('.date-group');
        
        if (text.includes(searchTerm)) {
          (item as HTMLElement).style.display = '';
        } else {
          (item as HTMLElement).style.display = 'none';
        }
        
        // Check if all items in a date group are hidden
        if (dateGroup) {
          const visibleItems = dateGroup.querySelectorAll('.session-item[style="display: none;"]');
          if (visibleItems.length === dateGroup.querySelectorAll('.session-item').length) {
            (dateGroup as HTMLElement).style.display = 'none';
          } else {
            (dateGroup as HTMLElement).style.display = '';
          }
        }
      });
    });
  }
}

// Main function to fetch and display sessions
async function fetchAndDisplaySessions(): Promise<void> {
  try {
    // Get today's date in YYYY-MM-DD format using local time (not UTC)
    const today = new Date();
    const year = today.getFullYear();
    const monthNum = today.getMonth() + 1; // Months are 0-indexed
    const dayNum = today.getDate();
    // Format month and day to ensure they have 2 digits
    const month = monthNum < 10 ? '0' + monthNum : String(monthNum);
    const day = dayNum < 10 ? '0' + dayNum : String(dayNum);
    const dateString = `${year}-${month}-${day}`;
    
    const res = await fetch(apiUrl(`/api/sessions?date=${dateString}`));
    const sessionData = await res.json();
    
    // Process the session data
    const sessions: Session[] = sessionData.map((session: { static_id: string, most_recent_message: MostRecentMessage }) => {
      const id = session.static_id;
      
      // Try to extract date from the static_id or use the starttime from most_recent_message
      let timestamp = id;
      if (session.most_recent_message?.starttime) {
        timestamp = session.most_recent_message.starttime;
      }
      
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

    // Render the sessions list
    renderSessionsList(sessions);
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

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  fetchAndDisplaySessions();
});
