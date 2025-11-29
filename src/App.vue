<template>
  <div id="app">
    <aside v-if="showShell" class="sidebar">
      <h2>复杂装备可靠性分析与评估系统</h2>
      <nav class="sidebar-links">
        <router-link to="/">首页</router-link>
        <router-link to="/modeling">可靠性建模</router-link>
        <router-link to="/calculator">可靠性预计</router-link>
        <router-link to="/allocation">可靠性分配</router-link>
        <router-link to="/fault-tree">故障树分析</router-link>
      </nav>
      <div class="user-section" v-if="isAuthenticated">
        <p class="user-name">{{ currentUser?.username }}</p>
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </div>
    </aside>
    <main :class="['main-content', { 'full-width': !showShell }]">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'

const route = useRoute()
const router = useRouter()
const { init, isAuthenticated, currentUser, logout } = useAuth()

init()

const showShell = computed(() => route.path !== '/login')

const handleLogout = () => {
  logout()
  router.replace({ path: '/login' })
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f5f7fa;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 220px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem 1rem;
  border-radius: 0 16px 16px 0;
  box-shadow: 2px 0 12px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  z-index: 100;
}

.sidebar h2 {
  font-size: 1.3rem;
  margin-bottom: 2rem;
  font-weight: bold;
  letter-spacing: 1px;
}

.sidebar-links {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.sidebar-links a {
  color: #fff;
  text-decoration: none;
  padding: 0.7rem 1rem;
  margin-bottom: 1rem;
  border-radius: 6px;
  transition: background 0.3s;
  font-size: 1rem;
}

.sidebar-links a.router-link-active,
.sidebar-links a:hover {
  background: rgba(255,255,255,0.18);
}

.main-content {
  margin-left: 220px;
  padding: 2rem;
  min-height: 100vh;
  background-color: #f5f7fa;
  width: calc(100vw - 220px);
  max-width: none;
  box-sizing: border-box;
}

.main-content.full-width {
  margin-left: 0;
  width: 100%;
}

.user-section {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.user-name {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
  word-break: break-all;
}

.logout-btn {
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  cursor: pointer;
  transition: background 0.2s ease;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
