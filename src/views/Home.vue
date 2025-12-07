<template>
  <div class="home-container">
    <!-- Hero Section -->
    <header class="hero">
      <div class="hero-content">
        <h1>复杂装备可靠性分析与评估系统</h1>
        <p class="subtitle">集成化 · 可视化 · 智能化</p>
        <p class="description">
          提供从可靠性建模、预计、分配到故障树分析的一站式解决方案，
          助力装备全生命周期可靠性管理。
        </p>
      </div>
    </header>

    <!-- Main Navigation Grid -->
    <main class="modules-grid">
      <!-- Modeling -->
      <div class="module-card" @click="$router.push('/modeling')">
        <div class="icon-wrapper modeling-icon">
          <svg viewBox="0 0 24 24" width="40" height="40">
            <path fill="currentColor" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
          </svg>
        </div>
        <h3>可靠性建模</h3>
        <p>支持串联、并联、表决等多种模型的图形化构建与编辑。</p>
        <span class="link-text">开始建模 &rarr;</span>
      </div>

      <!-- Fault Tree -->
      <div class="module-card" @click="$router.push('/fault-tree')">
        <div class="icon-wrapper fault-tree-icon">
           <svg viewBox="0 0 24 24" width="40" height="40">
             <path fill="currentColor" d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
           </svg>
        </div>
        <h3>故障树分析</h3>
        <p>构建故障树模型，进行定性与定量分析，识别薄弱环节。</p>
        <span class="link-text">进入分析 &rarr;</span>
      </div>

      <!-- Allocation -->
      <div class="module-card" @click="$router.push('/allocation')">
        <div class="icon-wrapper allocation-icon">
           <svg viewBox="0 0 24 24" width="40" height="40">
             <path fill="currentColor" d="M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2 0v11h9c-.5 4.5-4.03 8.17-8.5 8.88V2zM13 2v9h9c-.47-4.64-4.24-8.38-8.88-8.88z"/>
           </svg>
        </div>
        <h3>可靠性分配</h3>
        <p>自顶向下的可靠性指标分配，支持多种分配方法。</p>
        <span class="link-text">开始分配 &rarr;</span>
      </div>

      <!-- Calculator -->
      <div class="module-card" @click="$router.push('/calculator')">
        <div class="icon-wrapper calculator-icon">
           <svg viewBox="0 0 24 24" width="40" height="40">
             <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 7h10v2H7V7zm0 4h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-8 4h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"/>
           </svg>
        </div>
        <h3>可靠性预计</h3>
        <p>基于元器件计数法等标准进行系统可靠性预计计算。</p>
        <span class="link-text">进行预计 &rarr;</span>
      </div>

      <!-- Results -->
      <div class="module-card" @click="$router.push('/results')">
        <div class="icon-wrapper results-icon">
           <svg viewBox="0 0 24 24" width="40" height="40">
             <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2v-4h2v4zm4 0h-2v-2h2v2z"/>
           </svg>
        </div>
        <h3>分析报告</h3>
        <p>生成详细的可靠性分析报告，支持导出与打印。</p>
        <span class="link-text">查看报告 &rarr;</span>
      </div>
    </main>
  </div>
</template>

<script setup>
defineOptions({ name: 'HomeView' })
</script>

<style scoped>
.home-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  color: #333;
}

/* Hero Section */
.hero {
  text-align: center;
  margin-bottom: 4rem;
  padding: 3rem 1rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}

.hero h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: #2c3e50;
  font-weight: 700;
}

.hero .subtitle {
  font-size: 1.2rem;
  color: #57606f;
  margin-bottom: 1.5rem;
  font-weight: 500;
  letter-spacing: 2px;
}

.hero .description {
  max-width: 700px;
  margin: 0 auto;
  font-size: 1.1rem;
  line-height: 1.6;
  color: #57606f;
}

/* Modules Grid */
.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  padding: 0 1rem;
}

.module-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s ease;
  border: 1px solid #eee;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.module-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  border-color: #a4b0be;
}

.icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  color: white;
  transition: transform 0.3s ease;
}

.module-card:hover .icon-wrapper {
  transform: scale(1.1);
}

/* Icon Colors */
.modeling-icon { background: linear-gradient(135deg, #3498db, #2980b9); }
.fault-tree-icon { background: linear-gradient(135deg, #e74c3c, #c0392b); }
.allocation-icon { background: linear-gradient(135deg, #2ecc71, #27ae60); }
.calculator-icon { background: linear-gradient(135deg, #f1c40f, #f39c12); }
.results-icon { background: linear-gradient(135deg, #9b59b6, #8e44ad); }

.module-card h3 {
  font-size: 1.4rem;
  margin-bottom: 1rem;
  color: #2c3e50;
}

.module-card p {
  color: #7f8c8d;
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
  flex-grow: 1;
}

.link-text {
  color: #3498db;
  font-weight: 600;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.module-card:hover .link-text {
  color: #2980b9;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .hero h1 {
    font-size: 2rem;
  }
  .home-container {
    padding: 1rem;
  }
}
</style>
