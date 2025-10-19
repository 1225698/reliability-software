<template>
  <div id="app">
    <aside class="sidebar">
      <h2>可靠性预计软件</h2>
      <nav class="sidebar-links">
        <router-link to="/">首页</router-link>
        <router-link to="/calculator">可靠性计算</router-link>
        <router-link to="/results">结果分析</router-link>
      </nav>
    </aside>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

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
</style>