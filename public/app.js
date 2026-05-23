const fieldSelect = document.getElementById('field-select');
const valueSelect = document.getElementById('value-select');
const statusMessage = document.getElementById('status-message');
const inputJsonPre = document.getElementById('input-json');
const form = document.getElementById('dashboard-form');

let currentInput = {};
let fieldOptions = {};

async function fetchData() {
  const [inputRes, optionsRes] = await Promise.all([
    fetch('/api/input'),
    fetch('/api/options')
  ]);

  currentInput = await inputRes.json();
  fieldOptions = await optionsRes.json();

  updateInputPreview();
  populateFieldSelect();
}

function updateInputPreview() {
  inputJsonPre.textContent = JSON.stringify(currentInput, null, 2);
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
