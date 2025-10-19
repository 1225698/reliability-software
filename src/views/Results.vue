<template>
  <div class="results">
    <header class="tool-header">
      <h1>可靠性工程工具</h1>
    </header>

    <div class="analyses-container">
      <h2>历史分析结果</h2>

      <div v-if="analyses.length === 0" class="empty-state">
        <p>暂无保存的分析结果</p>
        <router-link to="/calculator" class="link-btn">
          去进行首次分析
        </router-link>
      </div>

      <div v-else class="analyses-list">
        <div v-for="analysis in analyses" :key="analysis.id" class="analysis-item">
          <div class="analysis-header">
            <h3>{{ analysis.systemName || '未命名系统' }}</h3>
            <button @click="handleDeleteAnalysis(analysis.id)" class="delete-btn">删除</button>
          </div>

          <!-- 环境信息展示（已确保变量和样式匹配） -->
          <div class="analysis-meta">
            <!-- 环境信息已移除 -->
            <span class="time-badge">分析时间: {{ analysis.timestamp || '未知时间' }}</span>
          </div>

          <div class="analysis-content">
            <div class="params-section">
              <h4>系统参数</h4>
              <div class="param-grid">
                <div class="param-item">
                  <label>任务时间:</label>
                  <span>{{ analysis.missionTime || 0 }} 小时</span>
                </div>
                <!-- 环境因子已移除 -->
              </div>
            </div>

            <div class="components-section">
              <h4>元器件配置</h4>
              <div class="components-grid">
                <div v-for="(comp, index) in (analysis.components || [])" :key="index" class="component-badge">
                  {{ comp.type || '未知类型' }} × {{ comp.quantity || 0 }}
                  <small>(λ={{ (comp.failureRate || 0).toFixed(6) }}/h)</small>
                </div>
              </div>
            </div>

            <div class="results-section">
              <h4>可靠性结果</h4>
              <div class="results-grid">
                <div class="result-badge primary">
                  <label>任务可靠度</label>
                  <span class="value">{{ ((analysis.systemReliability || 0) * 100).toFixed(2) }}%</span>
                </div>
                <div class="result-badge secondary">
                  <label>总失效率</label>
                  <span class="value">{{ (analysis.totalFailureRate || 0).toFixed(8) }}/h</span>
                </div>
                <div class="result-badge tertiary">
                  <label>MTBF</label>
                  <span class="value">{{ (analysis.mtbf || 0).toFixed(2) }} h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 为满足 ESLint 的多词组件命名规则，明确设置组件名
defineOptions({ name: 'ResultsView' })
import { ref, onMounted } from 'vue'
import { useReliabilityCalc } from '../composables/useReliabilityCalc'

const { getSavedAnalyses, deleteAnalysis } = useReliabilityCalc()
const analyses = ref([])

// 安全的数据加载函数
const loadAnalyses = () => {
  try {
    const savedData = getSavedAnalyses()
    console.log('加载的分析数据:', savedData)

    // 过滤无效数据，同时兼容旧数据（若有）
    analyses.value = savedData.filter(analysis =>
      analysis &&
      analysis.id &&
      analysis.systemName !== undefined
    ).map(analysis => {
      // 为旧数据补充默认环境名称（避免显示异常）
      // 旧数据中环境字段已移除，无需补充
      return analysis
    })

    console.log('过滤后的有效数据:', analyses.value)
  } catch (error) {
    console.error('加载分析结果失败:', error)
    analyses.value = []
  }
}

// 删除分析结果
const handleDeleteAnalysis = (id) => {
  if (confirm('确定要删除这个分析结果吗？')) {
    if (deleteAnalysis(id)) {
      loadAnalyses()
      alert('删除成功！')
    } else {
      alert('删除失败！')
    }
  }
}

onMounted(() => {
  loadAnalyses()
})
</script>

<style scoped>
/* 保持之前的样式，补充 factor-badge 样式并优化布局 */
.analyses-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.empty-state {
  text-align: center;
  padding: 4rem;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.link-btn {
  display: inline-block;
  margin-top: 1rem;
  padding: 10px 20px;
  background: #667eea;
  color: white;
  text-decoration: none;
  border-radius: 5px;
}

.analyses-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.analysis-item {
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  overflow: hidden;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.analysis-header h3 {
  margin: 0;
  font-size: 1.3rem;
}

.delete-btn {
  background: rgba(255,255,255,0.2);
  color: white;
  border: 1px solid rgba(255,255,255,0.3);
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

/* 关键修复：补充 factor-badge 样式，优化换行适配 */
.analysis-meta {
  display: flex;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  flex-wrap: wrap; /* 小屏幕自动换行，避免内容溢出 */
}

/* 统一三个徽章的样式，确保显示一致 */
.env-badge, .factor-badge, .time-badge {
  background: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  border: 1px solid #dee2e6;
  white-space: nowrap; /* 防止单个徽章内文字换行 */
}

.analysis-content {
  padding: 1.5rem;
}

.analysis-content h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 0.5rem;
}

.param-grid, .components-grid, .results-grid {
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.param-grid {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.components-grid {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.results-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.param-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.component-badge {
  background: #e3f2fd;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  text-align: center;
  border: 1px solid #bbdefb;
}

.result-badge {
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  color: white;
}

.result-badge.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.result-badge.secondary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.result-badge.tertiary {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.result-badge label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.result-badge .value {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
}
</style>
