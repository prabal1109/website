// Initialize dark mode
function initializeDarkMode() {
  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('theme') || 'light';
  
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
  }
  
  themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark-mode');
    const isDark = document.documentElement.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
  });
}

initializeDarkMode();

// Tab Navigation
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;
      
      // Hide all tabs
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });
      
      // Remove active from all buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));
      
      // Show selected tab and activate button
      document.getElementById(`${tabName}-tab`).classList.add('active');
      button.classList.add('active');
      
      // Initialize calendar if it's the calendar tab
      if (tabName === 'calendar') {
        initializeCalendar();
      }
    });
  });
}

initializeTabs();

// GitHub Tab - Dashboard Functions
const fieldSelect = document.getElementById('field-select');
const valueSelect = document.getElementById('value-select');
const statusMessage = document.getElementById('status-message');
const inputJsonPre = document.getElementById('input-json');
const inputJsonMainPre = document.getElementById('input-json-main');
const form = document.getElementById('dashboard-form');

let currentInput = {};
let mainInput = {};
let fieldOptions = {};

async function fetchData() {
  const [inputRes, optionsRes, mainRes] = await Promise.all([
    fetch('/api/input'),
    fetch('/api/options'),
    fetch('/api/input-main')
  ]);

  currentInput = await inputRes.json();
  fieldOptions = await optionsRes.json();
  mainInput = await mainRes.json();

  updateInputPreview();
  populateFieldSelect();
}

function updateInputPreview() {
  inputJsonPre.textContent = JSON.stringify(currentInput, null, 2);
  inputJsonMainPre.textContent = JSON.stringify(mainInput, null, 2);
}

function populateFieldSelect() {
  fieldSelect.innerHTML = '';
  Object.keys(currentInput).forEach(field => {
    const option = document.createElement('option');
    option.value = field;
    option.textContent = field;
    fieldSelect.appendChild(option);
  });
  updateValueSelect();
}

function updateValueSelect() {
  const field = fieldSelect.value;
  const values = fieldOptions[field] || [];
  valueSelect.innerHTML = '';

  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    if (currentInput[field] === value) {
      option.selected = true;
    }
    valueSelect.appendChild(option);
  });
}

fieldSelect.addEventListener('change', () => {
  updateValueSelect();
});

valueSelect.addEventListener('change', () => {
  const field = fieldSelect.value;
  const value = valueSelect.value;
  currentInput[field] = value;
  updateInputPreview();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('Submitting...', 'info');

  const payload = {
    field: fieldSelect.value,
    value: valueSelect.value
  };

  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus(`Error: ${data.error || 'Unknown error'}`, 'error');
      return;
    }

    setStatus(`Success! PR created: ${data.prUrl}`, 'success', data.prUrl);
    await fetchData();
  } catch (error) {
    setStatus(`Request failed: ${error.message}`, 'error');
  }
});

function setStatus(message, type, link) {
  statusMessage.textContent = message;
  statusMessage.className = type;
  if (link) {
    const anchor = document.createElement('a');
    anchor.href = link;
    anchor.textContent = ' Open PR';
    anchor.target = '_blank';
    statusMessage.appendChild(anchor);
  }
}

fetchData().catch(error => {
  setStatus(`Unable to load dashboard: ${error.message}`, 'error');
});

// Calendar Tab - Functions
let currentDate = new Date();
let events = JSON.parse(localStorage.getItem('calendarEvents')) || [];

function initializeCalendar() {
  renderCalendar();
  renderEventsList();
  setupCalendarControls();
  setupEventForm();
}

function renderCalendar() {
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);
  
  document.getElementById('calendar-month').textContent = monthName;
  
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';
  
  // Add day headers
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayHeaders.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-day-header';
    dayHeader.textContent = day;
    calendar.appendChild(dayHeader);
  });
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  // Previous month's days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = document.createElement('div');
    day.className = 'calendar-day other-month';
    day.textContent = daysInPrevMonth - i;
    calendar.appendChild(day);
  }
  
  // Current month's days
  const today = new Date();
  for (let i = 1; i <= daysInMonth; i++) {
    const day = document.createElement('div');
    day.className = 'calendar-day';
    day.textContent = i;
    
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    
    if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === i) {
      day.classList.add('today');
    }
    
    if (events.some(e => e.date === dateString)) {
      day.classList.add('has-event');
    }
    
    day.addEventListener('click', () => {
      document.getElementById('event-date').value = dateString;
    });
    
    calendar.appendChild(day);
  }
  
  // Next month's days
  const totalCells = calendar.children.length - 7;
  const remainingCells = 35 - totalCells;
  for (let i = 1; i <= remainingCells; i++) {
    const day = document.createElement('div');
    day.className = 'calendar-day other-month';
    day.textContent = i;
    calendar.appendChild(day);
  }
}

function renderEventsList() {
  const eventsList = document.getElementById('events-list');
  eventsList.innerHTML = '';
  
  const sortedEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  sortedEvents.forEach((event, index) => {
    const eventItem = document.createElement('div');
    eventItem.className = `event-item ${event.type}`;
    eventItem.innerHTML = `
      <div class="event-info">
        <div class="event-date">${new Date(event.date).toLocaleDateString()}</div>
        <div class="event-name">${event.name}</div>
        <span class="event-type ${event.type}">${event.type.charAt(0).toUpperCase() + event.type.slice(1)}</span>
      </div>
      <button class="event-delete" onclick="deleteEvent(${index})">Delete</button>
    `;
    eventsList.appendChild(eventItem);
  });
}

function setupCalendarControls() {
  document.getElementById('prev-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  
  document.getElementById('next-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
}

function setupEventForm() {
  const eventForm = document.getElementById('event-form');
  eventForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const date = document.getElementById('event-date').value;
    const name = document.getElementById('event-name').value;
    const type = document.getElementById('event-type').value;
    
    if (date && name) {
      events.push({ date, name, type });
      localStorage.setItem('calendarEvents', JSON.stringify(events));
      
      eventForm.reset();
      renderCalendar();
      renderEventsList();
    }
  });
}

function deleteEvent(index) {
  events.splice(index, 1);
  localStorage.setItem('calendarEvents', JSON.stringify(events));
  renderCalendar();
  renderEventsList();
}

