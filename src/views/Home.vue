<template>
  <div class="home">
    <div class="hero-section">
  <h2>复杂装备可靠性分析与评估系统</h2>
  <p>基于Vue3构建的专业可靠性预计与分配工具</p>
      <button @click="$router.push('/calculator')" class="start-btn">
        开始分析
      </button>
    </div>
    <div class="features">
      <div class="feature-card">
        <h3>📊 可靠性建模</h3>
        <p>支持多种可靠性模型和分布函数</p>
      </div>
      <div class="feature-card">
        <h3>⚡ 快速计算</h3>
        <p>实时计算任务可靠度指标</p>
      </div>
      <div class="feature-card">
        <h3>📈 可视化分析</h3>
        <p>直观展示可靠性曲线和数据分析</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: 'HomeView' })
</script>

<style scoped>
.hero-section {
  text-align: center;
  padding: 4rem 0;
  background: white;
}
.hero-section h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #333;
}
.hero-section p {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 2rem;
}
.start-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 30px;
  font-size: 1.1rem;
  border-radius: 25px;
  cursor: pointer;
  transition: transform 0.3s;
}
.start-btn:hover {
  transform: translateY(-2px);
}
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}
.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: transform 0.3s;
}
.feature-card h3 {
  margin-bottom: 1rem;
  color: #333;
}
</style>
