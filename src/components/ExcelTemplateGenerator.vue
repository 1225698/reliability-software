<template>
  <div class="template-generator">
    <button @click="downloadTemplate" class="download-btn">
      📥 下载Excel模板
    </button>
  </div>
</template>

<script setup>
import * as XLSX from 'xlsx'

const downloadTemplate = () => {
  // 模板数据
  const templateData = [
    ['类型', '数量', '失效率', '描述'],
    ['电阻', 15, 0.000001, '10kΩ碳膜电阻'],
    ['电容', 8, 0.000002, '100μF电解电容'],
    ['集成电路', 3, 0.00001, '运算放大器IC'],
    ['晶体管', 5, 0.000005, 'NPN功率晶体管'],
    ['连接器', 12, 0.000003, 'DB9串口连接器'],
    ['电感', 6, 0.0000015, '10mH功率电感'],
    ['二极管', 10, 0.000004, '1N4148开关二极管'],
    ['变压器', 2, 0.000008, '220V转12V电源变压器'],
    ['继电器', 4, 0.000015, '12V直流继电器'],
    ['传感器', 3, 0.000012, '温度传感器DS18B20']
  ]

  // 创建工作簿
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(templateData)
  
  // 设置列宽
  const colWidths = [
    { wch: 12 }, // 类型
    { wch: 8 },  // 数量
    { wch: 12 }, // 失效率
    { wch: 25 }  // 描述
  ]
  ws['!cols'] = colWidths
  
  // 设置表头样式
  const headerRange = XLSX.utils.decode_range(ws['!ref'])
  for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
    if (!ws[cellAddress]) continue
    ws[cellAddress].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4472C4" } },
      alignment: { horizontal: "center" }
    }
  }
  
  // 添加工作表
  XLSX.utils.book_append_sheet(wb, ws, '元器件配置')
  
  // 生成并下载文件
  XLSX.writeFile(wb, '可靠性分析_元器件模板.xlsx')
  
  alert('Excel模板已下载完成！')
}
</script>

<style scoped>
.download-btn {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 1rem;
}

.download-btn:hover {
  background: linear-gradient(135deg, #218838 0%, #1e9e8a 100%);
}
</style>
