const toggleInput = document.getElementById('toggleInput');
const statusLabel = document.getElementById('statusLabel');
const dot         = document.getElementById('dot');

function applyState(enabled) {
  toggleInput.checked = enabled;
  if (enabled) {
    statusLabel.textContent = 'Truth Code ON';
    statusLabel.className   = 'status-label on';
    dot.className           = 'dot on';
  } else {
    statusLabel.textContent = 'Truth Code OFF';
    statusLabel.className   = 'status-label off';
    dot.className           = 'dot off';
  }
}

chrome.storage.sync.get('enabled', (data) => {
  applyState(data.enabled !== false);
});

toggleInput.addEventListener('change', () => {
  const enabled = toggleInput.checked;
  chrome.storage.sync.set({ enabled });
  applyState(enabled);
});
