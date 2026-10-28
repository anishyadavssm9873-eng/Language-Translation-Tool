// frontend/src/services/api.js
// Handles communication with the Express backend
const API_BASE = '/api';

export async function fetchLanguages() {
  const res = await fetch(`${API_BASE}/languages`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch supported languages (HTTP ${res.status})`);
  }
  const data = await res.json();
  return data.languages || [];
}

export async function translateText({ text, source = 'auto', target }) {
  if (!text.trim()) {
    throw new Error('Please enter text to translate.');
  }
  if (!target || target === 'auto') {
    throw new Error('Please choose a valid destination language.');
  }

  const res = await fetch(`${API_BASE}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, source, target }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Rate limit reached (30 requests/min). Please wait a moment before trying again.');
    }
    throw new Error(data?.error?.message || `Translation failed with status ${res.status}`);
  }

  return data;
}

export async function detectLanguage(text) {
  const res = await fetch(`${API_BASE}/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Detection failed');
  return res.json();
}
