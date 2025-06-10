import { escapeHtml, apiUrl, capitalize } from './common.js';

// Types for session data
type Session = {
  id: string;
  timestamp: string;
  displayDate: string;
  displayTime: string;
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
      html += `
        <li class="session-item">
          <a href="${baseUrl}/sessions/${encodeURIComponent(session.id)}" class="session-link">
            <div class="session-time">${escapeHtml(session.displayTime)}</div>
            <div class="session-info">
              ${session.metadata?.model ? `<span class="session-model">${escapeHtml(session.metadata.model)}</span>` : ''}
              ${session.metadata?.provider ? `<span class="session-provider">${escapeHtml(session.metadata.provider)}</span>` : ''}
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
    const res = await fetch(apiUrl('/api/sessions'));
    const sessionFilenames = await res.json();
    
    // Process the session data
    const sessions: Session[] = sessionFilenames.map((filename: string) => {
      const id = filename.replace(/\.json$/, "");
      const { displayDate, displayTime } = formatTimestamp(id);
      
      return {
        id,
        timestamp: id,
        displayDate,
        displayTime,
        // Metadata will be populated later if available
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
