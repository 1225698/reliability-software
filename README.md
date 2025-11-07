# reliability-software

This template should help get you started developing with Vue 3 in Vite.

## 新增：可靠性分配（React + TypeScript 集成）

已在 `views/Allocation.vue` 中动态挂载 React 子应用，实现双标签页：
1. 系统级分配
2. 单元级分配

### 目录结构
```
src/react-allocation/
	ReliabilityAllocation/
		types.ts                # 类型定义
		state.tsx               # 状态管理 + 计算逻辑 + 持久化
		DataImport.tsx          # Excel 导入与模板下载
		SystemLevelAllocation.tsx # 系统级分配输入与结果
		UnitLevelAllocation.tsx   # 单元级分配输入与结果
		AllocationCharts.tsx    # 饼图 / 柱状图 / 树状图
		index.tsx               # Tab 容器与导出按钮
	mountAllocation.tsx       # Vue 页面挂载入口
```

### 核心计算公式
系统级：
```
总故障率 = Σ(各系统预计故障率)
分配系数 k = 单个系统故障率 / 总故障率
分配 MTBF = 任务 MTBF / k / 余量系数
分配故障率 = 1 / 分配 MTBF
```
单元级：
```
分系统总故障率 = Σ(单元预计故障率 × 数量)
单元分配系数 k = (单元故障率 × 数量) / 分系统总故障率
单元分配 MTBF = (分系统 MTBF / k / 余量系数) × 单元数量
单元分配故障率 = 1 / 分配 MTBF
```

### 使用说明
1. 打开 `可靠性分配` 页面。
2. 在“系统级分配”标签修改任务 MTBF、余量系数、系统数量或导入系统 Excel。
3. 点击系统结果表某行以激活该系统，然后切换到“单元级分配”标签进行单元分配或导入单元 Excel。
4. 下方图表实时展示分配占比与层级关系。
5. 点击“导出结果”生成包含系统与单元分配的 Excel。

### Excel 模板格式
系统级：列名需包含 `系统名称`, `预计故障率(1/h)`。
单元级：列名需包含 `单元名称`, `数量`, `预计故障率`。

### 持久化与校验
数据写入 `localStorage` 键：`reliability-allocation-state-v1`。
校验包括：
- 总预计故障率为 0 的警告
- 余量系数区间检查 (0,1]
- 分配后故障率总和与预计值差异提示

### 后续可扩展建议
* 增加手动锁定某系统/单元 MTBF 自动重新分配其它项。
* 增加“过程动画”与分配步骤讲解浮层。
* 引入更精细的可靠性模型（串并联系统、冗余结构）。

---
如需新增功能，请在 issue 中提出或直接扩展对应组件。

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```
