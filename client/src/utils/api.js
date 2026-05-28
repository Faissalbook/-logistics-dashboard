const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const translateText = (text) =>
  request('/translate', { method: 'POST', body: JSON.stringify({ text }) });

export const fetchPhrasebook = (category) =>
  request(`/phrasebook${category ? `?category=${category}` : ''}`);

export const fetchCategories = () => request('/phrasebook/categories');

export const checkHealth = () => request('/health');
