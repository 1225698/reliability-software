<template>
  <div class="login-wrapper">
    <div class="login-card">
      <h1>复杂装备可靠性分析与评估系统</h1>
      <p class="subtitle">首次登录请先注册账号</p>
      <form @submit.prevent="handleSubmit">
        <label>
          <span>用户名</span>
          <input v-model="username" type="text" maxlength="20" placeholder="请输入用户名" required />
        </label>
        <label>
          <span>密码</span>
          <input v-model="password" type="password" minlength="6" placeholder="请输入密码" required />
        </label>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit">{{ mode === 'login' ? '登录' : '注册并登录' }}</button>
      </form>
      <button class="mode-switch" @click="toggleMode">
        {{ mode === 'login' ? '还没有账号？立即注册' : '已有账号？返回登录' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const route = useRoute()
const { init, login, register, isAuthenticated, users } = useAuth()

const username = ref('')
const password = ref('')
const mode = ref('login')
const error = ref('')

const redirectTarget = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/'
})

onMounted(() => {
  init()
  if (!users.value.length) {
    mode.value = 'register'
  }
  if (isAuthenticated.value) {
    router.replace(redirectTarget.value)
  }
})

const handleSubmit = () => {
  error.value = ''
  const payload = { username: username.value, password: password.value }
  const result = mode.value === 'login' ? login(payload) : register(payload)
  if (!result.success) {
    error.value = result.message || '操作失败，请稍后重试'
    return
  }
  router.replace(redirectTarget.value)
}

const toggleMode = () => {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  error.value = ''
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 30px 70px rgba(15, 23, 42, 0.4);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.login-card h1 {
  font-size: 1.4rem;
  text-align: center;
  color: #0f172a;
  margin: 0;
}

.subtitle {
  text-align: center;
  color: #475569;
  margin: 0;
}

form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.95rem;
  color: #1f2937;
}

input {
  border: 1px solid #cbd5f5;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  outline: none;
}

button {
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

button[type='submit'] {
  background-color: #2563eb;
  color: #ffffff;
}

button[type='submit']:hover {
  background-color: #1d4ed8;
}

.mode-switch {
  background-color: #f1f5f9;
  color: #1f2937;
}

.mode-switch:hover {
  background-color: #e2e8f0;
}

.error {
  color: #dc2626;
  margin: 0;
  text-align: center;
}
</style>
