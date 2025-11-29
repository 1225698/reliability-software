import { ref, computed } from 'vue'

const USERS_KEY = 'auth-users'
const SESSION_KEY = 'auth-session'

const users = ref([])
const currentUser = ref(null)
const isInitialized = ref(false)

const persistUsers = () => {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users.value))
  } catch (error) {
    console.error('保存用户数据失败:', error)
  }
}

const persistSession = () => {
  try {
    if (currentUser.value) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ username: currentUser.value.username }))
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
  } catch (error) {
    console.error('保存会话失败:', error)
  }
}

const normalizeUsers = list => {
  return list.reduce((acc, user) => {
    if (!user || typeof user !== 'object') return acc
    const username = String(user.username || user.phone || '').trim()
    const password = typeof user.password === 'string' ? user.password : ''
    if (!username || !password) return acc
    acc.push({
      username,
      password,
      createdAt: user.createdAt || Date.now()
    })
    return acc
  }, [])
}

const loadUsers = () => {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const normalized = normalizeUsers(parsed)
        const changed = JSON.stringify(parsed) !== JSON.stringify(normalized)
        users.value = normalized
        if (changed) {
          persistUsers()
        }
      }
    }
  } catch (error) {
    console.error('加载用户数据失败:', error)
  }
}

const loadSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed && (parsed.username || parsed.phone)) {
      const identifier = String(parsed.username || parsed.phone).trim()
      const matched = users.value.find(user => user.username === identifier)
      if (matched) currentUser.value = matched
    }
  } catch (error) {
    console.error('加载会话失败:', error)
  }
}

export const useAuth = () => {
  const init = () => {
    if (isInitialized.value) return
    loadUsers()
    loadSession()
    isInitialized.value = true
  }

  const register = ({ username, password }) => {
    init()
    const trimmedUsername = String(username || '').trim()
    const trimmedPassword = String(password || '').trim()
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]{1,20}$/.test(trimmedUsername)) {
      return { success: false, message: '用户名需为1-20位中英文、数字或下划线' }
    }
    if (!trimmedPassword || trimmedPassword.length < 6) {
      return { success: false, message: '密码至少6位' }
    }
    const exists = users.value.some(user => user.username === trimmedUsername)
    if (exists) {
      return { success: false, message: '该用户名已存在' }
    }
    const newUser = {
      username: trimmedUsername,
      password: trimmedPassword,
      createdAt: Date.now()
    }
    users.value.push(newUser)
    persistUsers()
    currentUser.value = newUser
    persistSession()
    return { success: true }
  }

  const login = ({ username, password }) => {
    init()
    const trimmedUsername = String(username || '').trim()
    const trimmedPassword = String(password || '').trim()
    const matched = users.value.find(user => user.username === trimmedUsername && user.password === trimmedPassword)
    if (!matched) {
      return { success: false, message: '账号或密码错误' }
    }
    currentUser.value = matched
    persistSession()
    return { success: true }
  }

  const logout = () => {
    currentUser.value = null
    persistSession()
  }

  const removeAll = () => {
    users.value = []
    currentUser.value = null
    persistUsers()
    persistSession()
  }

  return {
    init,
    register,
    login,
    logout,
    removeAll,
    isInitialized: computed(() => isInitialized.value),
    isAuthenticated: computed(() => currentUser.value != null),
    currentUser,
    users
  }
}
