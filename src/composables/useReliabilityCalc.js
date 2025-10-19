import { ref } from 'vue'
import * as XLSX from 'xlsx'

export function useReliabilityCalc() {
  // 系统参数
  const systemName = ref('电源控制系统')
  const missionTime = ref(1000)
  const workingTemperature = ref(25)

  // 环境相关参数 - 支持输入环境名称和因子值
  // 环境相关参数已移除（不再影响计算）

  // 元器件类型选项
  const componentTypeOptions = [
    '电阻', '电容', '集成电路', '晶体管', '连接器',
    '电感', '二极管', '变压器', '继电器', '传感器'
  ]

  // 用户选择的元器件
  const selectedComponents = ref([
    {
      type: '电阻',
      quantity: 10,
      failureRate: 0.000001,
      description: '10kΩ 碳膜电阻'
    },
    {
      type: '集成电路',
      quantity: 2,
      failureRate: 0.00001,
      description: '运算放大器'
    }
  ])

  // 计算结果
  const calculationResults = ref({
    totalFailureRate: 0,
    systemReliability: 0,
    mtbf: 0,
    curveData: [],
    hasResults: false
  })

  // 真实的Excel解析函数 - 使用全局XLSX
  const parseExcelData = (file) => {
    return new Promise((resolve, reject) => {
      // 检查xlsx库是否加载
      if (typeof XLSX === 'undefined') {
        reject(new Error('Excel解析库未加载，请刷新页面重试'))
        return
      }

      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          console.log('开始解析Excel文件...', file.name)

          // 使用全局XLSX对象
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })

          // 获取第一个工作表
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]

          console.log('工作表名称:', firstSheetName)

          // 将工作表转换为JSON数组
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          console.log('Excel行数:', jsonData.length)

          if (!jsonData || jsonData.length < 2) {
            throw new Error('Excel文件为空或格式不正确')
          }

          // 解析数据
          const components = parseExcelJsonData(jsonData)
          console.log('解析出的元器件数量:', components.length)

          if (components.length === 0) {
            throw new Error('未找到有效的元器件数据，请检查Excel格式')
          }

          resolve(components)

        } catch (error) {
          console.error('Excel解析错误:', error)
          reject(new Error('Excel文件解析失败: ' + error.message))
        }
      }

      reader.onerror = (error) => {
        console.error('文件读取错误:', error)
        reject(new Error('文件读取失败'))
      }

      reader.readAsArrayBuffer(file)
    })
  }

  // 解析Excel JSON数据
  const parseExcelJsonData = (jsonData) => {
    const components = []

    console.log('原始Excel数据:', jsonData)

    // 方法1：尝试自动检测表头
    let headerRowIndex = 0
    let headers = []

    // 查找包含关键字的行作为表头
    for (let i = 0; i < Math.min(3, jsonData.length); i++) {
      const row = jsonData[i]
      if (Array.isArray(row)) {
        const rowText = row.join('').toLowerCase()
        if (rowText.includes('类型') && rowText.includes('数量') && rowText.includes('失效率')) {
          headerRowIndex = i
          headers = row.map(h => String(h || '').trim())
          break
        }
      }
    }

    // 如果没找到，使用第一行
    if (headers.length === 0 && jsonData[0]) {
      headers = jsonData[0].map(h => String(h || '').trim())
    }

    console.log('表头行索引:', headerRowIndex)
    console.log('表头内容:', headers)

    // 确定列索引（更宽松的匹配）
    const typeIndex = findColumnIndex(headers, ['类型', '元器件类型', 'type', 'component'])
    const quantityIndex = findColumnIndex(headers, ['数量', '元器件数量', 'quantity', 'count', '个数'])
    const failureRateIndex = findColumnIndex(headers, ['失效率', '失效率值', 'failure', 'rate', 'λ'])
    const descriptionIndex = findColumnIndex(headers, ['描述', '元器件描述', 'description', 'desc', '说明'])

    console.log('列索引:', { typeIndex, quantityIndex, failureRateIndex, descriptionIndex })

    if (typeIndex === -1 || quantityIndex === -1 || failureRateIndex === -1) {
      throw new Error(`Excel文件缺少必要的列。找到的列：${headers.join(', ')}`)
    }

    // 解析数据行
    let validCount = 0
    let skippedCount = 0

    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      if (!Array.isArray(row) || row.every(cell => cell === null || cell === '' || cell === undefined)) {
        continue // 跳过空行
      }

      try {
        const type = String(row[typeIndex] || '').trim()
        const quantity = parseNumber(row[quantityIndex])
        const failureRate = parseNumber(row[failureRateIndex])
        const description = descriptionIndex !== -1 ? String(row[descriptionIndex] || '').trim() : `${type}组件`

        console.log(`解析第${i + 1}行:`, { type, quantity, failureRate, description })

        // 数据验证
        if (!type) {
          console.warn(`第${i + 1}行: 类型为空`)
          skippedCount++
          continue
        }

        if (isNaN(quantity) || quantity <= 0) {
          console.warn(`第${i + 1}行: 数量无效 - ${row[quantityIndex]}`)
          skippedCount++
          continue
        }

        if (isNaN(failureRate) || failureRate <= 0) {
          console.warn(`第${i + 1}行: 失效率无效 - ${row[failureRateIndex]}`)
          skippedCount++
          continue
        }

        components.push({
          type,
          quantity,
          failureRate,
          description: description || `${type}组件`
        })
        validCount++

      } catch (error) {
        console.warn(`解析第${i + 1}行数据时出错:`, error, row)
        skippedCount++
      }
    }

    console.log(`解析完成: 有效${validCount}个, 跳过${skippedCount}个`)
    return components
  }

  // 辅助函数：查找列索引
  const findColumnIndex = (headers, possibleNames) => {
    const lowerHeaders = headers.map(h => String(h).toLowerCase())

    for (const name of possibleNames) {
      const lowerName = name.toLowerCase()
      const exactIndex = lowerHeaders.findIndex(header => header === lowerName)
      if (exactIndex !== -1) return exactIndex

      const containsIndex = lowerHeaders.findIndex(header => header.includes(lowerName))
      if (containsIndex !== -1) return containsIndex
    }

    return -1
  }

  // 辅助函数：解析数字
  const parseNumber = (value) => {
    if (value === null || value === undefined || value === '') return NaN

    // 如果是数字，直接返回
    if (typeof value === 'number') return value

    const str = String(value).trim().replace(/,/g, '')

    // 处理科学计数法
    if (str.includes('e') || str.includes('E')) {
      return parseFloat(str)
    }

    // 处理百分比（如果有）
    if (str.includes('%')) {
      return parseFloat(str) / 100
    }

    const num = parseFloat(str)
    return isNaN(num) ? NaN : num
  }

  // 批量导入Excel元器件
  const importComponentsFromExcel = async (file) => {
    try {
      console.log('开始导入Excel文件...')

      const newComponents = await parseExcelData(file)

      console.log('导入的元器件数据:', newComponents)

      // 清空现有元器件，替换为导入的数据
      selectedComponents.value = newComponents

      return {
        success: true,
        count: newComponents.length,
        message: `成功导入 ${newComponents.length} 个元器件`,
        components: newComponents
      }
    } catch (error) {
      console.error('导入失败:', error)
      return {
        success: false,
        count: 0,
        message: error.message
      }
    }
  }

  // 手动添加单个元器件（保留原有功能）
  const addComponent = (type = '电阻') => {
    const defaultFailureRates = {
      '电阻': 0.000001,
      '电容': 0.000002,
      '集成电路': 0.00001,
      '晶体管': 0.000005,
      '连接器': 0.000003,
      '电感': 0.0000015,
      '二极管': 0.000004,
      '变压器': 0.000008,
      '继电器': 0.000015,
      '传感器': 0.000012
    }

    selectedComponents.value.push({
      type: type,
      quantity: 1,
      failureRate: defaultFailureRates[type] || 0.000001,
      description: `${type}组件`
    })
  }

  // 删除元器件
  const removeComponent = (index) => {
    selectedComponents.value.splice(index, 1)
  }

  // 计算总失效率
  const calculateTotalFailureRate = () => {
    return selectedComponents.value.reduce((sum, comp) => {
      // 直接使用组件失效率 * 数量（环境因子已删除）
      return sum + (comp.failureRate * comp.quantity)
    }, 0)
  }

  // 生成可靠性曲线数据
  const generateCurveData = (totalFailureRate, timeRange = 500) => {
    const data = []
    for (let t = 0; t <= timeRange; t += 10) {
      data.push({
        time: t,
        reliability: Math.exp(-totalFailureRate * t)
      })
    }
    return data
  }

  // 执行可靠性计算
  const calculateReliability = () => {
    // 验证是否有元器件
    if (selectedComponents.value.length === 0) {
      alert('请先添加或导入元器件')
      return false
    }

    const totalFailureRate = calculateTotalFailureRate()
    const systemReliability = Math.exp(-totalFailureRate * missionTime.value)
    const mtbf = 1 / totalFailureRate
    const curveData = generateCurveData(totalFailureRate)

    calculationResults.value = {
      totalFailureRate,
      systemReliability,
      mtbf,
      curveData,
      hasResults: true
    }

    return calculationResults.value
  }

  // 保存分析结果
  const saveAnalysis = () => {
    if (!calculationResults.value.hasResults) {
      alert('请先进行计算！')
      return false
    }

    const analysis = {
      id: Date.now(),
      systemName: systemName.value,
      missionTime: missionTime.value,
      components: JSON.parse(JSON.stringify(selectedComponents.value)),
      totalFailureRate: calculationResults.value.totalFailureRate,
      systemReliability: calculationResults.value.systemReliability,
      mtbf: calculationResults.value.mtbf,
      timestamp: new Date().toLocaleString('zh-CN')
    }

    try {
      const savedAnalyses = JSON.parse(localStorage.getItem('reliabilityAnalyses') || '[]')
      savedAnalyses.unshift(analysis)
      localStorage.setItem('reliabilityAnalyses', JSON.stringify(savedAnalyses))
      console.log('分析结果已保存:', analysis)
      return true
    } catch (error) {
      console.error('保存分析结果失败:', error)
      alert('保存失败，请检查控制台信息')
      return false
    }
  }

  // 获取所有保存的分析结果
  const getSavedAnalyses = () => {
    try {
      return JSON.parse(localStorage.getItem('reliabilityAnalyses') || '[]')
    } catch (error) {
      console.error('读取分析结果失败:', error)
      return []
    }
  }

  // 删除分析结果
  const deleteAnalysis = (id) => {
    try {
      const savedAnalyses = getSavedAnalyses()
      const updatedAnalyses = savedAnalyses.filter(analysis => analysis.id !== id)
      localStorage.setItem('reliabilityAnalyses', JSON.stringify(updatedAnalyses))
      return true
    } catch (error) {
      console.error('删除分析结果失败:', error)
      return false
    }
  }

  return {
    systemName,
    missionTime,
    componentTypeOptions,
    selectedComponents,
    calculationResults,
    calculateReliability,
    saveAnalysis,
    getSavedAnalyses,
    deleteAnalysis,
    addComponent,
    removeComponent,
    importComponentsFromExcel,
    workingTemperature
  }
}
