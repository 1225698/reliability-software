/**
 * 故障树分析器
 * 实现最小割集计算和概率分析
 */

class FaultTreeAnalyzer {
  constructor(nodes, connections) {
    this.nodes = nodes
    this.connections = connections
    this.nodeMap = new Map()
    this.childrenMap = new Map()
    
    // 构建节点映射和子节点映射
    this.buildMaps()
  }

  /**
   * 构建节点映射表
   */
  buildMaps() {
    // 创建节点ID到节点对象的映射
    this.nodes.forEach(node => {
      this.nodeMap.set(node.id, node)
    })

    // 创建父节点到子节点的映射
    this.connections.forEach(conn => {
      const fromNode = this.nodeMap.get(conn.from)
      const toNode = this.nodeMap.get(conn.to)

      // 条件事件的连接是反向的：条件事件(from) -> 中间事件(to)
      // 但在逻辑上，条件事件应该是中间事件的输入（子节点）
      if (fromNode && fromNode.type === 'event-oval') {
        // 反向连接：将条件事件作为目标节点的子节点
        if (!this.childrenMap.has(conn.to)) {
          this.childrenMap.set(conn.to, [])
        }
        this.childrenMap.get(conn.to).push(conn.from)
      } else {
        // 正常连接：from是父节点，to是子节点
        if (!this.childrenMap.has(conn.from)) {
          this.childrenMap.set(conn.from, [])
        }
        this.childrenMap.get(conn.from).push(conn.to)
      }
    })
  }

  /**
   * 计算最小割集
   * @param {string} rootNodeId - 根节点ID（顶事件）
   * @returns {Array} 最小割集数组
   */
  calculateMinimalCutSets(rootNodeId) {
    if (!rootNodeId) {
      // 如果没有指定根节点，找到顶事件
      rootNodeId = this.findTopEvent()
    }

    if (!rootNodeId) {
      return []
    }

    const rootNode = this.nodeMap.get(rootNodeId)
    const cutSets = this.traverseTree(rootNode)

    // 最小化割集（移除包含关系的割集）
    return this.minimizeCutSets(cutSets)
  }

  /**
   * 找到顶事件（没有父节点的节点）
   */
  findTopEvent() {
    const childIds = new Set()
    this.connections.forEach(conn => {
      childIds.add(conn.to)
    })

    // 找到不是任何连接的目标的节点
    for (const node of this.nodes) {
      if (!childIds.has(node.id)) {
        return node.id
      }
    }
    return null
  }

  /**
   * 遍历故障树生成割集
   * @param {Object} node - 当前节点
   * @returns {Array} 割集数组
   */
  traverseTree(node) {
    if (!node) {
      return []
    }

    // 如果是底事件或条件事件，返回包含该事件的割集
    // 条件事件直接参与顶事件的概率计算，所以也作为基本事件处理
    if (node.type === 'event-circle' || node.type === 'event-oval') {
      return [[node.id]]
    }

    // 获取子节点
    const children = this.childrenMap.get(node.id) || []

    if (children.length === 0) {
      // 叶子节点（非底事件和条件事件）
      return [[node.id]]
    }

    // 递归获取所有子节点的割集
    const childCutSets = children.map(childId => {
      const childNode = this.nodeMap.get(childId)
      return this.traverseTree(childNode)
    })

    // 根据逻辑门类型合并割集
    const gateType = this.getGateType(node)

    if (gateType === 'AND' || gateType === 'gate-and') {
      return this.combineAND(childCutSets)
    } else if (gateType === 'OR' || gateType === 'gate-or') {
      return this.combineOR(childCutSets)
    } else {
      // 默认使用OR门逻辑
      return this.combineOR(childCutSets)
    }
  }

  /**
   * 获取节点的逻辑门类型
   */
  getGateType(node) {
    // 如果节点本身就是逻辑门
    if (node.type && node.type.startsWith('gate-')) {
      return node.type
    }
    
    // 如果是中间事件，检查其logicGate属性
    if (node.logicGate) {
      return node.logicGate
    }

    // 默认返回OR门
    return 'OR'
  }

  /**
   * AND门的割集组合
   * 实现AND门的割集组合：笛卡尔积
   */
  combineAND(cutSetsArray) {
    if (cutSetsArray.length === 0) {
      return []
    }

    let result = cutSetsArray[0]
    
    for (let i = 1; i < cutSetsArray.length; i++) {
      const newResult = []
      for (const existing of result) {
        for (const cutSet of cutSetsArray[i]) {
          // 合并两个割集
          const combined = [...existing, ...cutSet]
          newResult.push(combined)
        }
      }
      result = newResult
    }

    return result
  }

  /**
   * OR门的割集组合
   * 实现OR门的割集组合：扁平化合并
   */
  combineOR(cutSetsArray) {
    // OR门：所有子割集的并集
    return cutSetsArray.flat()
  }

  /**
   * 最小化割集
   * 移除被其他割集包含的割集
   */
  minimizeCutSets(cutSets) {
    const result = []

    for (let i = 0; i < cutSets.length; i++) {
      let isMinimal = true
      const cutSetA = new Set(cutSets[i])

      for (let j = 0; j < cutSets.length; j++) {
        if (i === j) continue

        const cutSetB = new Set(cutSets[j])
        
        // 检查cutSetB是否是cutSetA的子集
        if (cutSetB.size < cutSetA.size) {
          const isSubset = [...cutSetB].every(item => cutSetA.has(item))
          if (isSubset) {
            isMinimal = false
            break
          }
        }
      }

      if (isMinimal) {
        result.push(cutSets[i])
      }
    }

    // 去重
    const uniqueResult = []
    const seen = new Set()

    for (const cutSet of result) {
      const sorted = [...cutSet].sort().join(',')
      if (!seen.has(sorted)) {
        seen.add(sorted)
        uniqueResult.push(cutSet)
      }
    }

    return uniqueResult
  }

  /**
   * 格式化概率值用于显示
   * @param {number} prob - 概率值
   * @returns {string} 格式化后的字符串
   */
  formatProbability(prob) {
    if (prob === undefined || prob === null || prob === 0) {
      return '0'
    }

    // 如果概率值小于 0.0001，使用科学计数法
    if (prob < 0.0001) {
      const exp = Math.floor(Math.log10(prob))
      const mantissa = prob / Math.pow(10, exp)
      return `${mantissa.toFixed(1)}×10^${exp}`
    }

    // 否则使用固定小数位数
    return prob.toFixed(4)
  }

  /**
   * 计算割集的发生概率
   * @param {Array} cutSet - 割集（事件ID数组）
   * @returns {number} 概率值
   */
  calculateCutSetProbability(cutSet) {
    let probability = 1.0

    console.log('=== 计算割集概率 ===')
    console.log('割集:', cutSet)

    for (const eventId of cutSet) {
      const node = this.nodeMap.get(eventId)
      if (node) {
        // 根据节点类型获取概率值
        let prob = 0
        if (node.type === 'event-oval') {
          // 条件事件使用 conditionProbability
          prob = parseFloat(node.conditionProbability || 0)
          console.log(`  事件 ${node.label} (${eventId}): 条件概率 = ${node.conditionProbability} -> ${this.formatProbability(prob)}`)
        } else {
          // 其他事件使用 probability
          prob = parseFloat(node.probability || 0)
          console.log(`  事件 ${node.label} (${eventId}): 发生概率 = ${node.probability} -> ${this.formatProbability(prob)}`)
        }

        if (!isNaN(prob) && prob > 0) {
          probability *= prob
          console.log(`  累积概率: ${this.formatProbability(probability)}`)
        } else {
          console.log(`  ⚠️ 概率无效或为0，跳过`)
        }
      } else {
        console.log(`  ⚠️ 未找到节点: ${eventId}`)
      }
    }

    console.log(`最终割集概率: ${this.formatProbability(probability)}`)
    console.log('==================')
    return probability
  }

  /**
   * 计算顶事件发生概率
   * 使用最小割集计算（近似方法）
   * @param {Array} minimalCutSets - 最小割集数组
   * @returns {number} 概率值
   */
  calculateTopEventProbability(minimalCutSets) {
    if (minimalCutSets.length === 0) {
      return 0
    }

    // 使用近似公式：P(顶事件) ≈ Σ P(割集i)
    // 这是上界近似，适用于小概率事件
    let totalProbability = 0

    for (const cutSet of minimalCutSets) {
      const cutSetProb = this.calculateCutSetProbability(cutSet)
      totalProbability += cutSetProb
    }

    // 确保概率不超过1
    return Math.min(totalProbability, 1.0)
  }

  /**
   * 计算结构重要度
   * 结构重要度公式：I_i = (1 / 2^(n-1)) * Σ(1 / n_j)
   * 其中：
   * - I_i: 事件i的结构重要度系数
   * - n: 基本事件总数
   * - n_j: 第j个包含事件i的最小割集的基本事件数
   * @param {Array} minimalCutSets - 最小割集数组
   * @returns {Array} 结构重要度数组
   */
  calculateStructuralImportance(minimalCutSets) {
    if (minimalCutSets.length === 0) {
      return []
    }

    // 获取所有基本事件（底事件和条件事件）
    const basicEvents = this.nodes.filter(node =>
      node.type === 'event-circle' || node.type === 'event-oval'
    )
    const n = basicEvents.length // 基本事件总数

    if (n === 0) {
      return []
    }

    // 计算每个基本事件的结构重要度
    const structuralImportance = []

    basicEvents.forEach(event => {
      const eventId = event.id

      // 找出包含该事件的所有最小割集
      const containingCutSets = minimalCutSets.filter(cutSet =>
        cutSet.includes(eventId)
      )

      // 计算 Σ(1 / n_j)
      let sum = 0
      containingCutSets.forEach(cutSet => {
        const n_j = cutSet.length // 该割集中的基本事件数
        sum += 1 / n_j
      })

      // 计算结构重要度：I_i = (1 / 2^(n-1)) * Σ(1 / n_j)
      const importance = (1 / Math.pow(2, n - 1)) * sum

      structuralImportance.push({
        eventId: eventId,
        eventName: event.label || '未命名',
        eventType: event.type === 'event-oval' ? '条件事件' : '底事件',
        occurrences: containingCutSets.length,
        totalCutSets: minimalCutSets.length,
        structuralImportance: importance
      })
    })

    // 按结构重要度降序排序
    structuralImportance.sort((a, b) => b.structuralImportance - a.structuralImportance)

    return structuralImportance
  }

  /**
   * 获取完整的分析结果
   */
  getAnalysisResult(rootNodeId = null) {
    const minimalCutSets = this.calculateMinimalCutSets(rootNodeId)

    // 计算每个割集的概率
    const cutSetsWithProb = minimalCutSets.map(cutSet => {
      const eventNames = cutSet.map(id => {
        const node = this.nodeMap.get(id)
        return node ? node.label : id
      })

      return {
        events: cutSet,
        eventNames: eventNames,
        probability: this.calculateCutSetProbability(cutSet)
      }
    })

    // 按概率排序
    cutSetsWithProb.sort((a, b) => b.probability - a.probability)

    // 计算顶事件概率
    const topEventProbability = this.calculateTopEventProbability(minimalCutSets)

    // 提取所有基本事件和条件事件及其概率
    const basicEventsProbability = []
    // 包含底事件和条件事件
    const basicEvents = this.nodes.filter(node =>
      node.type === 'event-circle' || node.type === 'event-oval'
    )
    basicEvents.forEach(node => {
      // 根据节点类型获取概率
      let prob = 0
      if (node.type === 'event-oval') {
        // 条件事件使用 conditionProbability
        prob = node.conditionProbability || 0
      } else {
        // 底事件使用 probability
        prob = node.probability || 0
      }

      basicEventsProbability.push({
        eventId: node.id,
        eventName: node.label || '未命名',
        probability: prob,
        eventType: node.type === 'event-oval' ? '条件事件' : '底事件'
      })
    })

    // 按事件名称排序（X1, X2, X3...）
    basicEventsProbability.sort((a, b) => {
      const numA = parseInt(a.eventName.replace('X', '')) || 0
      const numB = parseInt(b.eventName.replace('X', '')) || 0
      return numA - numB
    })

    // 计算结构重要度
    const structuralImportance = this.calculateStructuralImportance(minimalCutSets)

    return {
      minimalCutSets: cutSetsWithProb,
      cutSetCount: minimalCutSets.length,
      topEventProbability: topEventProbability,
      topEventId: rootNodeId || this.findTopEvent(),
      basicEventsProbability: basicEventsProbability,
      structuralImportance: structuralImportance
    }
  }
}

export default FaultTreeAnalyzer

