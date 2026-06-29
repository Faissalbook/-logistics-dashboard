const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const fetchFeed = () => request('/posts');
export const fetchPost = (id) => request(`/posts/${id}`);
export const createPost = (payload) =>
  request('/posts', { method: 'POST', body: JSON.stringify(payload) });
export const likePost = (id, liked) =>
  request(`/posts/${id}/like`, {
    method: 'POST',
    body: JSON.stringify({ liked }),
  });
export const fetchComments = (id) => request(`/posts/${id}/comments`);
export const addComment = (id, text) =>
  request(`/posts/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });

export const fetchProfile = (username) => request(`/users/${username}`);
export const fetchUsers = () => request('/users');

export const fetchNotifications = () => request('/notifications');
export const markNotificationsRead = () =>
  request('/notifications/read', { method: 'POST' });

export const fetchTrending = () => request('/trending');
export const fetchStories = () => request('/stories');
