---
name: tracking-design
description: >-
  基于位置模型的埋点方案设计助手，读取产品需求文档（PRD）自动解析并生成结构化埋点方案。
  触发场景：用户提到'埋点设计'、'埋点方案'、'设计埋点'、'做埋点'、'tracking design'、
  '帮我设计埋点'、'XX功能的埋点'、'位置模型埋点'、'根据需求文档做埋点'、'点位设计'，
  或用户给出一个产品需求文档（PRD）要求生成埋点方案。
---

# 位置模型埋点方案设计助手

读取产品需求文档（PRD），基于得谱平台位置模型自动解析产品结构，引导生成可直接录入平台的埋点方案。

## 核心概念

位置模型按**三层结构**组织埋点：

```
产品功能 (feature_id)
├── 页面 (page_name)        ← 对应PRD中的独立页面/视图
│   ├── 页面级事件            ← 页面展示、加载
│   ├── 模块 (module_name)   ← 对应PRD中的功能区块
│   │   ├── 模块级事件        ← 模块展示、加载
│   │   └── 元素 (element_name) ← 对应PRD中的按钮、卡片等可交互项
│   │       └── 元素级事件    ← 点击、展示、悬停
```

- **事件名**：`{功能标识}_{业务动作}`（如 `newbie_zone_click`），同功能共享事件名，靠位置属性区分点位
- **位置属性**（自动）：`page_name` / `module_name` / `element_name`
- **公共属性**：所有事件统一上报（如入口 `position`）
- **自定义属性**：从PRD业务逻辑中提取的属性（如 `sku_id`、`reward_type`）

## 输入：产品需求文档（PRD）

Skill 接受以下任意形式的 PRD 输入：

| 输入方式 | 处理 |
|---------|------|
| 金山文档 URL（kdocs.cn） | 用 `wps-doc export` 导出为 markdown 后解析 |
| 本地 markdown/文本文件 | 直接读取解析 |
| 用户在对话中粘贴的需求内容 | 直接解析 |

### PRD 解析要点

从 PRD 中提取以下关键信息：

1. **页面结构**：PRD 中的"需求页面"章节、交互稿、页面流程图
2. **模块划分**：PRD 通常按模块组织需求详情（如"3.1 首屏弹窗"、"3.2 头图模块"）
3. **交互行为**：关注 PRD 中的"交互逻辑"部分，识别用户可操作的行为：
   - "点击" → click 事件
   - "展示/展现/曝光/进入" → display 事件
   - "加载" → load 事件
   - "悬浮/悬停" → hover 事件
   - "滑动/滚动" → scroll 事件
4. **状态分支**：PRD 中的多状态设计（未登录/已登录、未解锁/已解锁等），需要考虑通过属性值区分
5. **业务属性**：PRD 中涉及的业务实体（SKU、奖励类型、功能点名称等），转化为自定义属性
6. **配置项**：PRD 中标记"读取配置"的项目，通常意味着值可变，适合作为属性上报

## 工作目录

```
tracking-workspace/
├── prd-source.md             # PRD 原文（如从金山文档导出）
├── feature-info.json         # 步骤1：功能基本信息
├── page-tree.json            # 步骤2：页面-模块-元素结构树
├── events.json               # 步骤3：事件定义
├── properties.json           # 步骤4：属性定义
└── tracking-plan.md          # 步骤5：最终埋点方案
```

数据格式详见 [references/schema.md](references/schema.md)。

## 执行流程

```
埋点方案设计进度：
- [ ] 步骤 0：获取并解析 PRD
- [ ] 步骤 1：确定产品功能基本信息（需用户确认）
- [ ] 步骤 2：从 PRD 提取页面-模块-元素结构树（需用户确认）
- [ ] 步骤 3：从 PRD 交互逻辑提取事件定义
- [ ] 步骤 4：从 PRD 业务逻辑提取属性方案
- [ ] 步骤 5：输出最终埋点方案
```

### 步骤 0：获取并解析 PRD

**金山文档 URL**：
```bash
wps-doc export "<URL>" -o tracking-workspace/prd-source.md --save-images
```

**本地文件**：直接读取。

**对话内容**：保存到 `tracking-workspace/prd-source.md`。

解析 PRD 后，输出一份简要的结构摘要，确认理解正确：
- 产品名称和定位
- 包含哪些页面/视图
- 核心模块清单
- 主要交互场景

### 步骤 1：确定产品功能基本信息

从 PRD 中推断，无法推断的字段通过 AskQuestion 向用户确认：

| 字段 | 推断来源 | 示例 |
|------|---------|------|
| 应用归属 | PRD标题/背景 | WPS Office |
| 业务归属 | PRD业务线 | 增值业务 |
| 应用终端 | PRD"需求范围" | PC端 |
| 功能名称 | `业务_功能` 格式 | 公共运营_新人专区 |
| 功能标识 | 英文，作为事件前缀，**不可修改** | newbie_zone |
| 埋点点位类型 | 固定 | 位置模型 |

**输出**：`tracking-workspace/feature-info.json`

### 步骤 2：从 PRD 提取页面-模块-元素结构树

**提取策略**：

1. **识别页面**：
   - PRD 的"需求页面"章节通常直接列出页面清单
   - 交互稿中的不同视图/场景页面
   - 例：新人专区主页、我的奖品页、功能体验弹窗

2. **识别模块**：
   - PRD 的"需求详情"通常按模块编号组织（如 3.1、3.2、3.3...）
   - 每个需求详情小节通常对应一个模块
   - 例：首屏弹窗模块、头图模块、功能体验区、新人专享优惠

3. **识别元素（子模块）**：
   - 元素 ≠ 按钮/链接等 UI 控件。元素是模块内可以再细分出的**功能独立的子区域**
   - 判断标准：该子区域是否有自己独立的展示逻辑、独立的属性集、独立的交互行为
   - **应建为元素**：消息轮播条（有自己的消息类型）、SKU卡片（有商品ID等独立属性）、地图碎片（有碎片序号等独立属性）
   - **不应建为元素**：同一模块内的多个按钮/链接。它们只是模块点击事件的不同触发目标，应在模块的 click 事件中用属性值区分
   - 例：头图模块有 5 个按钮（登录、查看、兑换、规则、奖励），不应建成 5 个元素，而应在模块 click 事件中添加 `click_target` 属性，枚举值为 `[login, view_medal, exchange_point, rule, reward]`

**命名规范**：
- 页面：`main_page`、`reward_page`
- 模块：`header_banner`、`experience_zone`、`payment_module`
- 元素（仅功能独立子区域）：`message_carousel`、`map_piece`、`sku_card`

**呈现格式**：向用户展示缩进树形图，等待确认。

**输出**：`tracking-workspace/page-tree.json`

### 步骤 3：从 PRD 交互逻辑提取事件定义

逐模块扫描 PRD 中的交互逻辑，按以下规则生成事件：

| PRD 中的描述 | 事件动作 | 层级 |
|-------------|---------|------|
| "页面展示/进入页面/打开页面" | display | 页面级 |
| "模块展示/曝光/出现在视口" | display | 模块级 |
| "点击XX按钮/链接/卡片" | click | 元素级 |
| "XX展示/曝光" | display | 元素级 |
| "鼠标悬浮/悬停" | hover | 元素级 |
| "页面加载/数据请求完成" | load | 页面/模块级 |
| "滑动/滚动到XX" | scroll | 模块级 |

**默认事件**：
- 每个页面自动添加 display 事件
- 所有按钮/可点击元素自动添加 click 事件
- 重要模块（首屏、核心转化区）添加 display 事件

**输出**：`tracking-workspace/events.json`

### 步骤 4：从 PRD 业务逻辑提取属性方案

#### 4.1 公共属性
从 PRD 全局信息提取：
- `position`（入口来源）：用户从哪个渠道进入该功能
- 其他全局属性

#### 4.2 位置属性（自动，无需设计）
`page_name` / `module_name` / `element_name`

#### 4.3 自定义属性提取策略

从 PRD 中以下位置提取：

| PRD 内容 | 属性提取 |
|---------|---------|
| 多状态分支（未登录/已登录/企业/个人） | `user_status` 属性 + 枚举值 |
| 业务实体（SKU、资源、奖励） | `sku_id`、`reward_type` 等 |
| 按钮/操作的多种结果（成功/失败） | `result` 属性 |
| PRD 表格中"配置说明"的可配置项 | 考虑是否需要属性记录配置值 |
| 模块内的子类型（功能点名称、分类名） | `item_name`、`category` 等 |
| 跳转目标（不同的跳转链接） | `target_page` 或 `jump_url` |

每个属性需定义：属性名（英文）、中文名、类型、枚举值（如有）、绑定事件范围。

**输出**：`tracking-workspace/properties.json`

### 步骤 5：输出最终埋点方案

汇总所有数据，生成结构化文档：

```markdown
# {功能名称} 埋点方案

## 一、功能基本信息
（表格）

## 二、公共属性
（表格：属性名 | 中文名 | 类型 | 枚举值）

## 三、页面结构与埋点明细

### 页面：{页面中文名}（{page_name}）
#### 页面级事件
（表格：事件名 | 动作 | 触发时机 | 自定义属性及说明）

#### 模块：{模块中文名}（{module_name}）
##### 模块级事件
（表格）
##### 元素：{元素中文名}（{element_name}）
（表格：事件名 | 动作 | 触发时机 | 自定义属性及说明）

...对每个页面/模块/元素重复...

## 四、自定义属性汇总
（表格：属性名 | 中文名 | 类型 | 枚举值 | 适用范围）
```

**输出**：`tracking-workspace/tracking-plan.md`

### 步骤 5b：输出结构化 JSON（用于页面事件表展示）

在生成 Markdown 方案的同时，**必须**在 `tracking-workspace/tracking-result.json` 中输出符合以下 TypeScript 接口的 JSON：

```typescript
interface TrackingParam {
  name: string       // 英文属性名
  type: string       // string | int | float | boolean
  example?: string   // 示例值
  required?: boolean
  description?: string // 中文说明
}

interface TrackingEvent {
  eventId: string    // 英文事件标识，如 newbie_zone_click_login_btn
  eventName: string  // 中文事件名，如"点击登录按钮"
  page: string       // 所属页面标识
  trigger: string    // 触发描述
  timing: string     // display | click | hover | submit | scroll
  priority?: 'P0' | 'P1' | 'P2'
  params: TrackingParam[]
}

interface TrackingFunnel {
  name: string       // 漏斗名称
  steps: string[]    // eventId 列表
}

// 输出文件结构
{
  summary: string,                    // 方案概述
  conventions: Record<string, string>,// 命名规范
  commonParams: TrackingParam[],      // 公共参数
  events: TrackingEvent[],            // ⚠️ 必须包含所有事件，不能为空数组
  funnels: TrackingFunnel[],          // 关键漏斗
  gaps: string[]                      // PRD 未覆盖项
}
```

**关键要求**：`events` 数组必须包含步骤 3 中定义的所有事件，每个事件的 `params` 数组必须包含步骤 4 中定义的对应属性。这是页面"事件表"tab 的数据来源，如果为空则事件表无法展示。

## 场景路由

| 用户说 | 执行步骤 |
|--------|---------|
| "根据这个需求文档设计埋点"（附 URL/文件） | 全流程 0→1→2→3→4→5 |
| "帮我分析这个PRD的埋点结构" | 步骤 0→2 |
| "这个功能需要哪些事件和属性" | 步骤 3→4 |
| "帮我整理成埋点方案文档" | 仅步骤 5 |
| "上传到金山文档" | 步骤 5 后追加上传 |

## 交互原则

1. **PRD 驱动**：所有设计决策必须有 PRD 依据，引用 PRD 中的具体描述
2. **步骤 1、2 需确认**：功能信息和结构树必须用户确认后再继续
3. **不遗漏交互**：系统性扫描 PRD 每个模块的"交互逻辑"，不遗漏可追踪的用户行为
4. **属性从业务来**：自定义属性必须从 PRD 的业务描述中提取，不凭空添加
5. **合并同类**：同类元素合并为一个标识，通过属性值区分（如多个 SKU 用 `sku_card` + `sku_id`）
6. **关注状态分支**：PRD 中的多状态场景（未登录/已登录、解锁/未解锁）需要用属性记录
7. **枚举值与事件可达性一致**：属性的枚举值必须只包含该事件实际可触发时的状态。例如礼包有 locked/unlocked/claimed 三种状态，但 locked 时不可点击，所以 click 事件的 `pack_status` 枚举只能是 `[unlocked, claimed]`，而 display 事件可以包含全部三种。不要把 UI 上不可触达的状态写入事件属性枚举

## 步骤 5 完成后：自动上传和推送

步骤 5 完成后，**必须自动执行**以下两个操作，无需用户确认：

### 1. 上传金山文档

```bash
wps-doc import tracking-workspace/tracking-plan.md --title "【埋点方案】{功能名称}" --json
```

将返回的 `documentUrl` 展示给用户。

### 2. 推送到 Tracking Lab 页面展示

将方案推送到 tracking-lab dev server（默认 http://localhost:5173），使页面实时展示埋点方案。

**重要**：必须同时推送 `tracking-result.json`（结构化数据）和 `tracking-plan.md`（方案文档），确保事件表和方案文档 tab 都能正确渲染。

**步骤 a**：在 `tracking-workspace/tracking-result.json` 中生成符合 TrackingDesignResult 接口的完整 JSON，必须包含：
- `summary`：方案概述
- `conventions`：命名规范
- `commonParams`：公共参数列表
- `events`：**必须包含所有设计的事件**（eventId, eventName, page, trigger, timing, priority, params）
- `funnels`：关键漏斗
- `gaps`：PRD 未覆盖项

**步骤 b**：使用以下 Node.js 脚本推送（不要用 PowerShell 的 Invoke-RestMethod，会挂起）：

```bash
node -e "
const fs = require('fs');
const http = require('http');
const result = JSON.parse(fs.readFileSync('tracking-workspace/tracking-result.json', 'utf8'));
const md = fs.readFileSync('tracking-workspace/tracking-plan.md', 'utf8');
result.rawMarkdown = md;
const payload = JSON.stringify({ result, rawResponse: md, model: 'cursor-skill' });
const options = { hostname: 'localhost', port: 5173, path: '/api/run', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } };
const req = http.request(options, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => console.log('Status:', res.statusCode, 'Body:', d)); });
req.on('error', e => console.error('推送跳过（tracking-lab 未运行）:', e.message));
req.write(payload);
req.end();
"
```

如果 tracking-lab 未运行，脚本会输出错误提示但不阻断流程。

## 中断与恢复

- 每步产出持久化为 JSON，支持断点续做
- 恢复时检查 `tracking-workspace/` 已有文件，从断点继续
- PRD 原文保留在 `prd-source.md`，可随时回溯

## 参考资料

- 数据结构定义：[references/schema.md](references/schema.md)
- 完整埋点方案示例（基于真实 PRD）：[references/examples.md](references/examples.md)
