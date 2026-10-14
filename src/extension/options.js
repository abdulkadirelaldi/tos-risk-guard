const keyEl = document.getElementById('key');
const modelEl = document.getElementById('model');
const statusEl = document.getElementById('status');

chrome.storage.local.get(['apiKey', 'model']).then(({ apiKey, model }) => {
  if (apiKey) keyEl.placeholder = '•••••••• (kayıtlı — değiştirmek için yeni anahtar girin)';
  modelEl.value = model || '';
});

document.getElementById('save').addEventListener('click', async () => {
  const update = { model: modelEl.value.trim() };
  if (keyEl.value.trim()) update.apiKey = keyEl.value.trim();
  await chrome.storage.local.set(update);
  keyEl.value = '';
  statusEl.textContent = 'Kaydedildi';
  setTimeout(() => (statusEl.textContent = ''), 2000);
});
