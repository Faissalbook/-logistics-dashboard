import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');

async function load(name) {
  const raw = await readFile(join(dataDir, name), 'utf8');
  return JSON.parse(raw);
}

const state = {
  users: await load('users.json'),
  posts: await load('posts.json'),
  comments: await load('comments.json'),
  notifications: await load('notifications.json'),
  trending: await load('trending.json'),
  stories: await load('stories.json'),
};

export function getUsers() {
  return state.users;
}

export function getUserById(id) {
  return state.users.find((u) => u.id === id) || null;
}

export function getUserByUsername(username) {
  return state.users.find((u) => u.username === username) || null;
}

function decoratePost(post) {
  const author = getUserById(post.authorId);
  return { ...post, author };
}

export function getFeed() {
  return [...state.posts]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(decoratePost);
}

export function getPostById(id) {
  const post = state.posts.find((p) => p.id === id);
  return post ? decoratePost(post) : null;
}

export function getPostsByAuthor(authorId) {
  return state.posts
    .filter((p) => p.authorId === authorId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(decoratePost);
}

export function getCommentsForPost(postId) {
  const list = state.comments[postId] || [];
  return list.map((c) => ({ ...c, author: getUserById(c.authorId) }));
}

export function addComment(postId, { authorId, text }) {
  if (!state.comments[postId]) state.comments[postId] = [];
  const comment = {
    id: `c_${Date.now()}`,
    authorId,
    text,
    createdAt: new Date().toISOString(),
    likes: 0,
  };
  state.comments[postId].unshift(comment);
  const post = state.posts.find((p) => p.id === postId);
  if (post) post.comments = (post.comments || 0) + 1;
  return { ...comment, author: getUserById(authorId) };
}

export function createPost({ authorId, text, tags = [], media = null }) {
  const post = {
    id: `p_${Date.now()}`,
    authorId,
    createdAt: new Date().toISOString(),
    type: media ? 'image' : 'text',
    text,
    tags,
    media,
    likes: 0,
    comments: 0,
    shares: 0,
  };
  state.posts.unshift(post);
  const author = getUserById(authorId);
  if (author) author.posts = (author.posts || 0) + 1;
  return decoratePost(post);
}

export function togglePostLike(postId, liked) {
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return null;
  post.likes = Math.max(0, (post.likes || 0) + (liked ? 1 : -1));
  return decoratePost(post);
}

export function getNotifications() {
  return state.notifications
    .map((n) => ({
      ...n,
      actor: getUserById(n.actorId),
      post: n.postId ? getPostById(n.postId) : null,
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function markAllNotificationsRead() {
  state.notifications.forEach((n) => {
    n.read = true;
  });
  return getNotifications();
}

export function getTrending() {
  return state.trending;
}

export function getStories() {
  return state.stories.map((s) => ({ ...s, user: getUserById(s.userId) }));
}
