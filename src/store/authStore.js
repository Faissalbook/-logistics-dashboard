import { create } from 'zustand'

const USERS_KEY = 'bf.users'
const SESSION_KEY = 'bf.session'

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || []
  } catch {
    return []
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export const useAuthStore = create((set) => ({
  user: null,
  initialized: false,

  init: () => {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY))
      if (session?.userId) {
        const user = readUsers().find((u) => u.id === session.userId)
        if (user) {
          set({ user: { id: user.id, name: user.name, email: user.email }, initialized: true })
          return
        }
      }
    } catch {
      // corrupt session — fall through to signed-out state
    }
    set({ user: null, initialized: true })
  },

  register: async ({ name, email, password, confirmPassword }) => {
    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanName) return { error: 'auth.err.nameRequired' }
    if (!isValidEmail(cleanEmail)) return { error: 'auth.err.emailInvalid' }
    if (password.length < 6) return { error: 'auth.err.passwordShort' }
    if (password !== confirmPassword) return { error: 'auth.err.passwordMismatch' }

    const users = readUsers()
    if (users.some((u) => u.email === cleanEmail)) return { error: 'auth.err.emailExists' }

    const salt = crypto.randomUUID()
    const user = {
      id: crypto.randomUUID(),
      name: cleanName,
      email: cleanEmail,
      salt,
      passwordHash: await hashPassword(password, salt),
      createdAt: new Date().toISOString(),
    }
    writeUsers([...users, user])
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }))
    set({ user: { id: user.id, name: user.name, email: user.email } })
    return { ok: true }
  },

  login: async ({ email, password }) => {
    const cleanEmail = email.trim().toLowerCase()
    const user = readUsers().find((u) => u.email === cleanEmail)
    if (!user) return { error: 'auth.err.invalidCredentials' }
    const hash = await hashPassword(password, user.salt)
    if (hash !== user.passwordHash) return { error: 'auth.err.invalidCredentials' }
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }))
    set({ user: { id: user.id, name: user.name, email: user.email } })
    return { ok: true }
  },

  updateName: (name) => {
    set((state) => {
      if (!state.user) return state
      const users = readUsers().map((u) => (u.id === state.user.id ? { ...u, name } : u))
      writeUsers(users)
      return { user: { ...state.user, name } }
    })
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY)
    set({ user: null })
  },
}))
