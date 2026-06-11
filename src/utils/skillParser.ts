import type { ParsedSkill, ChatMessage } from '../types'

export function parseSkillMarkdown(raw: string): ParsedSkill {
  const exUserIdx = raw.indexOf('---EXAMPLE_USER---')
  const exAstIdx = raw.indexOf('---EXAMPLE_ASSISTANT---')
  const noCtxIdx = raw.indexOf('---NO_CONTEXT_HINT---')

  const systemPrompt = (exUserIdx > 0 ? raw.slice(0, exUserIdx) : raw)
    .replace(/^# System Prompt\s*\n/, '')
    .trim()

  const exampleUser =
    exUserIdx >= 0 && exAstIdx >= 0
      ? raw.slice(exUserIdx + '---EXAMPLE_USER---'.length, exAstIdx).trim()
      : ''

  const exampleAssistant =
    exAstIdx >= 0
      ? raw
          .slice(
            exAstIdx + '---EXAMPLE_ASSISTANT---'.length,
            noCtxIdx >= 0 ? noCtxIdx : undefined,
          )
          .trim()
      : ''

  const noContextHint =
    noCtxIdx >= 0 ? raw.slice(noCtxIdx + '---NO_CONTEXT_HINT---'.length).trim() : ''

  return { systemPrompt, exampleUser, exampleAssistant, noContextHint }
}

function stripHeavyContent(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\(data:[^)]+\)/g, '[图片: $1]')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '[图片: $1]')
    .replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '[base64图片已省略]')
}

export function buildTrackingMessages(
  skillRaw: string,
  prdText: string,
  feedback?: string,
  businessSpecRaw?: string,
  specMode: 'overlay' | 'standalone' = 'overlay',
): ChatMessage[] {
  const parsed = parseSkillMarkdown(skillRaw)

  const skillKnowledge = stripInteractiveDirectives(parsed.systemPrompt)

  const cleanPrd = stripHeavyContent(prdText)

  let specSection: string

  if (specMode === 'standalone' && businessSpecRaw?.trim()) {
    const cleanBizSpec = stripHeavyContent(businessSpecRaw)
    specSection = `## 埋点设计规范

${cleanBizSpec}`
  } else {
    const businessSpecSection = businessSpecRaw?.trim()
      ? `\n\n## 业务专属规范\n\n以下是当前业务方向的专属规范，在通用规范基础上优先遵循：\n\n${stripHeavyContent(businessSpecRaw)}`
      : ''
    specSection = `## 通用设计规范（基础知识库）

${skillKnowledge}
${businessSpecSection}`
  }

  const system = `你是一个埋点方案设计专家。下面的"埋点设计规范"是你必须遵循的基础知识库，请严格按照其中的核心概念、命名规范、提取策略、设计原则来分析 PRD 并输出埋点方案。

## ⚠️ 输出模式（一次性生成）

本次是 API 调用，不存在多轮交互。你必须：
1. 在一次回复中直接输出最终完整结果（不要分步骤展示）
2. 禁止输出思考过程、中间推理、开场白
3. 先输出 Markdown 方案文档，再输出 \`\`\`json 结构化数据块

${specSection}`

  const messages: ChatMessage[] = [{ role: 'system', content: system }]

  if (specMode === 'standalone') {
    messages.push(
      { role: 'user', content: '请根据 PRD 输出完整的运营活动埋点设计方案。' },
      { role: 'assistant', content: OPS_FEW_SHOT_EXAMPLE },
    )

    let opsInstruction = `以上是一个基于运营活动组件化规范的输出示例。现在请对下方 PRD 文档执行完全相同的分析流程，直接输出：

1. **Markdown 方案文档**：组件基本信息 → 埋点事件明细（show_rubikpage / show_rubikwindow / click_rubikbtn）→ data 字段汇总

2. **\`\`\`json 代码块**，遵循规范中定义的增量输出格式（component, baseline_source, inherited, changes）

⚠️ 关键要求（运营活动组件化规范）：
- 只使用 show_rubikpage、show_rubikwindow、click_rubikbtn 三个固定事件，不允许新增事件名
- 通过 position + event_name + data1~data8 字段组合承载业务语义
- event_name 遵循规范中的命名模式（如 topitem_1, couponbtn_2 等）
- 展示与点击配对：有弹窗展示就应有弹窗点击，有按钮展示就应有按钮点击
- 多个同类元素从左到右、从上到下依次编号 1、2、3...
- 每条 change 必须包含 component_name 字段，值为 **PRD 中明确提到的组件名称**（如"Banner组件"、"优惠券组件"），同一组件的所有埋点 component_name 相同
- **严禁编造 PRD 中未提及的组件**：只为 PRD 中明确描述到的组件设计埋点，不允许自行推测或发明组件
- data8 保留给人群包 id
- 如果 PRD 涉及已有组件的修改，标注继承/新增/修改/废弃${feedback?.trim() ? '\n- 请根据用户反馈修正上一版方案' : ''}

---

## PRD 文档

${cleanPrd}`

    if (feedback?.trim()) {
      opsInstruction += `\n\n---\n\n用户对上一版方案的反馈，请在本次输出中修正：\n${feedback}`
    }

    messages.push({ role: 'user', content: opsInstruction })
  } else {
    messages.push(
      { role: 'user', content: '请根据 PRD 输出完整的埋点设计方案。' },
      { role: 'assistant', content: FEW_SHOT_EXAMPLE },
    )

    let userInstruction = `以上是一个完整的输出示例（基于另一个 PRD）。现在请对下方 PRD 文档执行完全相同的分析流程，直接输出：

1. **Markdown 方案文档**，格式：功能基本信息 → 公共属性 → 页面结构与埋点明细（按页面→模块→元素层级） → 自定义属性汇总

2. **\`\`\`json 代码块**，包含完整的结构化事件数据

⚠️ 关键要求（与 Cursor Agent 输出标准一致）：
- 每个 event 必须包含：eventId, eventName, page, pageLabel, module, moduleLabel, element, elementLabel, trigger, timing, priority, params
- params 必须从 PRD 业务逻辑提取自定义属性：name（英文）、description（中文）、type、enum（如有）
- 涉及多状态/多目标/多类型的事件，必须有区分属性（如 click_target、status），不允许 params 为空
- 只有确实无自定义属性的简单曝光事件，params 才可以为空数组
- timing 只能是 display/click/hover/load/scroll/stay 之一
- 遵循设计规范中的元素定义：元素是模块内功能独立的子区域，按钮/链接不是元素，用 click_target 属性区分${feedback?.trim() ? '\n- 请根据用户反馈修正上一版方案' : ''}

---

## PRD 文档

${cleanPrd}`

    if (feedback?.trim()) {
      userInstruction += `\n\n---\n\n用户对上一版方案的反馈，请在本次输出中修正：\n${feedback}`
    }

    messages.push({ role: 'user', content: userInstruction })
  }

  return messages
}

const FEW_SHOT_EXAMPLE = `# 公共运营_新人专区 埋点方案

## 一、功能基本信息

| 字段 | 值 |
|------|-----|
| 应用归属 | WPS Office |
| 业务归属 | 公共运营 |
| 应用终端 | PC端 |
| 功能名称 | 公共运营_新人专区 |
| 功能标识 | newbie_zone |

## 二、公共属性

| 属性名 | 中文名 | 类型 | 枚举值 |
|--------|--------|------|--------|
| position | 入口来源 | string | direct / push / banner / deeplink |

## 三、页面结构与埋点明细

### 页面：新人专区主页（main_page）

#### 页面级事件

| 事件名 | 动作 | 触发时机 | 自定义属性 |
|--------|------|---------|-----------|
| newbie_zone_display | display | 页面加载完成 | user_status(用户身份状态: not_logged_in/enterprise/personal_new/personal_old) |

#### 模块：头图模块（header_banner）

| 事件名 | 动作 | 触发时机 | 自定义属性 |
|--------|------|---------|-----------|
| newbie_zone_display | display | 头图模块曝光 | — |
| newbie_zone_click | click | 点击头图区域按钮 | click_target(点击目标: login/view_medal/exchange_point/rule/reward) |

##### 元素：消息轮播条（message_carousel）

| 事件名 | 动作 | 触发时机 | 自定义属性 |
|--------|------|---------|-----------|
| newbie_zone_display | display | 轮播消息曝光 | message_type(消息类型: welcome/medal/points) |

#### 模块：功能体验区（experience_zone）

| 事件名 | 动作 | 触发时机 | 自定义属性 |
|--------|------|---------|-----------|
| newbie_zone_display | display | 功能体验区曝光 | completed_count(已完成数), total_count(总数) |

##### 元素：地图碎片（map_piece）

| 事件名 | 动作 | 触发时机 | 自定义属性 |
|--------|------|---------|-----------|
| newbie_zone_click | click | 点击地图碎片 | piece_name(功能名), piece_index(序号:1-6), is_completed(是否已点亮:true/false) |
| newbie_zone_display | display | 碎片曝光 | piece_name, piece_index, is_completed |

##### 元素：新人礼包（gift_pack）

| 事件名 | 动作 | 触发时机 | 自定义属性 |
|--------|------|---------|-----------|
| newbie_zone_click | click | 点击领取/查看礼包 | pack_status(礼包状态: unlocked/claimed) |
| newbie_zone_display | display | 礼包曝光 | pack_status(礼包状态: locked/unlocked/claimed) |

## 四、自定义属性汇总

| 属性名 | 中文名 | 类型 | 枚举值 | 适用范围 |
|--------|--------|------|--------|---------|
| user_status | 用户身份状态 | string | not_logged_in/enterprise/personal_new/personal_old | 页面display |
| click_target | 点击目标 | string | login/view_medal/exchange_point/rule/reward | header_banner click |
| message_type | 消息类型 | string | welcome/medal/points | message_carousel display |
| piece_name | 功能名称 | string | 动态值 | map_piece 全部事件 |
| piece_index | 碎片序号 | int | 1-6 | map_piece 全部事件 |
| is_completed | 是否已点亮 | boolean | true/false | map_piece 全部事件 |
| pack_status | 礼包状态 | string | locked/unlocked/claimed | gift_pack 全部事件 |
| completed_count | 已完成数 | int | 0-6 | experience_zone display |
| total_count | 总数 | int | 6 | experience_zone display |

\`\`\`json
{
  "summary": "公共运营_新人专区埋点方案：1页面4模块3元素，共9个埋点事件（节选）",
  "conventions": {
    "feature_id": "newbie_zone",
    "eventNaming": "newbie_zone_{action}，同功能共享事件名，靠位置属性区分点位"
  },
  "commonParams": [
    {"name": "position", "type": "string", "description": "入口来源", "enum": ["direct", "push", "banner", "deeplink"]}
  ],
  "events": [
    {
      "eventId": "newbie_zone_main_page_display",
      "eventName": "新人专区主页展示",
      "page": "main_page",
      "pageLabel": "新人专区主页",
      "module": "",
      "moduleLabel": "",
      "element": "",
      "elementLabel": "",
      "trigger": "页面加载完成",
      "timing": "display",
      "priority": "P0",
      "params": [
        {"name": "user_status", "type": "string", "description": "用户身份状态", "enum": ["not_logged_in", "enterprise", "personal_new", "personal_old"]}
      ]
    },
    {
      "eventId": "newbie_zone_header_banner_display",
      "eventName": "头图模块曝光",
      "page": "main_page",
      "pageLabel": "新人专区主页",
      "module": "header_banner",
      "moduleLabel": "头图模块",
      "element": "",
      "elementLabel": "",
      "trigger": "头图模块曝光",
      "timing": "display",
      "priority": "P1",
      "params": []
    },
    {
      "eventId": "newbie_zone_header_banner_click",
      "eventName": "头图区域按钮点击",
      "page": "main_page",
      "pageLabel": "新人专区主页",
      "module": "header_banner",
      "moduleLabel": "头图模块",
      "element": "",
      "elementLabel": "",
      "trigger": "点击头图区域按钮",
      "timing": "click",
      "priority": "P1",
      "params": [
        {"name": "click_target", "type": "string", "description": "点击目标", "enum": ["login", "view_medal", "exchange_point", "rule", "reward"]}
      ]
    },
    {
      "eventId": "newbie_zone_message_carousel_display",
      "eventName": "消息轮播条曝光",
      "page": "main_page",
      "pageLabel": "新人专区主页",
      "module": "header_banner",
      "moduleLabel": "头图模块",
      "element": "message_carousel",
      "elementLabel": "消息轮播条",
      "trigger": "轮播消息曝光",
      "timing": "display",
      "priority": "P2",
      "params": [
        {"name": "message_type", "type": "string", "description": "消息类型", "enum": ["welcome", "medal", "points"]}
      ]
    },
    {
      "eventId": "newbie_zone_experience_zone_display",
      "eventName": "功能体验区曝光",
      "page": "main_page",
      "pageLabel": "新人专区主页",
      "module": "experience_zone",
      "moduleLabel": "功能体验区",
      "element": "",
      "elementLabel": "",
      "trigger": "功能体验区曝光",
      "timing": "display",
      "priority": "P0",
      "params": [
        {"name": "completed_count", "type": "int", "description": "已完成功能数"},
        {"name": "total_count", "type": "int", "description": "功能总数"}
      ]
    },
    {
      "eventId": "newbie_zone_map_piece_click",
      "eventName": "点击地图碎片",
      "page": "main_page",
      "pageLabel": "新人专区主页",
      "module": "experience_zone",
      "moduleLabel": "功能体验区",
      "element": "map_piece",
      "elementLabel": "地图碎片",
      "trigger": "点击地图碎片唤起体验弹窗",
      "timing": "click",
      "priority": "P0",
      "params": [
        {"name": "piece_name", "type": "string", "description": "功能名称"},
        {"name": "piece_index", "type": "int", "description": "碎片序号", "enum": ["1","2","3","4","5","6"]},
        {"name": "is_completed", "type": "boolean", "description": "是否已点亮", "enum": ["true", "false"]}
      ]
    },
    {
      "eventId": "newbie_zone_map_piece_display",
      "eventName": "地图碎片曝光",
      "page": "main_page",
      "pageLabel": "新人专区主页",
      "module": "experience_zone",
      "moduleLabel": "功能体验区",
      "element": "map_piece",
      "elementLabel": "地图碎片",
      "trigger": "碎片曝光",
      "timing": "display",
      "priority": "P1",
      "params": [
        {"name": "piece_name", "type": "string", "description": "功能名称"},
        {"name": "piece_index", "type": "int", "description": "碎片序号"},
        {"name": "is_completed", "type": "boolean", "description": "是否已点亮"}
      ]
    },
    {
      "eventId": "newbie_zone_gift_pack_click",
      "eventName": "点击领取/查看礼包",
      "page": "main_page",
      "pageLabel": "新人专区主页",
      "module": "experience_zone",
      "moduleLabel": "功能体验区",
      "element": "gift_pack",
      "elementLabel": "新人礼包",
      "trigger": "点击领取或查看礼包",
      "timing": "click",
      "priority": "P0",
      "params": [
        {"name": "pack_status", "type": "string", "description": "礼包状态", "enum": ["unlocked", "claimed"]}
      ]
    },
    {
      "eventId": "newbie_zone_gift_pack_display",
      "eventName": "新人礼包曝光",
      "page": "main_page",
      "pageLabel": "新人专区主页",
      "module": "experience_zone",
      "moduleLabel": "功能体验区",
      "element": "gift_pack",
      "elementLabel": "新人礼包",
      "trigger": "新人礼包曝光",
      "timing": "display",
      "priority": "P1",
      "params": [
        {"name": "pack_status", "type": "string", "description": "礼包状态", "enum": ["locked", "unlocked", "claimed"]}
      ]
    }
  ],
  "funnels": [
    {"name": "功能体验到礼包领取", "steps": ["newbie_zone_experience_zone_display", "newbie_zone_map_piece_click", "newbie_zone_gift_pack_click"]}
  ],
  "gaps": ["PRD未说明会员免费试用模块的具体点击交互"]
}
\`\`\``

const OPS_FEW_SHOT_EXAMPLE = `# 会员促销活动页 埋点方案（组件化规范）

## 一、组件基本信息

| 字段 | 值 |
|------|-----|
| 活动类型 | 会员促销 |
| 组件名称 | 限时特惠模块 |
| 适用终端 | H5 + PC |
| 基线组件 | 无（全新组件） |

## 二、埋点事件明细

### 页面加载（show_rubikpage）

| event_name | position | 触发时机 | 数据字段 |
|-----------|----------|---------|---------|
| act | 1 | 活动页加载完成 | — |

### 组件展示（show_rubikwindow）

| 组件 | event_name | 触发时机 | 数据字段 |
|------|-----------|---------|---------|
| Banner组件 | topitem_1 | 头部 Banner 曝光 | data1=banner图片ID |
| 优惠券组件 | couponitem_1 | 第1张优惠券曝光 | data1=券ID, data2=面额, data3=门槛 |
| 优惠券组件 | couponitem_2 | 第2张优惠券曝光 | data1=券ID, data2=面额, data3=门槛 |
| 套餐组件 | priceitem_1 | 第1个套餐价格卡曝光 | data1=套餐ID, data2=原价, data3=促销价, data4=套餐名 |
| 套餐组件 | priceitem_2 | 第2个套餐价格卡曝光 | data1=套餐ID, data2=原价, data3=促销价, data4=套餐名 |
| 倒计时组件 | countdownwindow | 倒计时弹窗弹出 | data1=剩余秒数 |

### 用户点击（click_rubikbtn）

| 组件 | event_name | 触发时机 | 数据字段 |
|------|-----------|---------|---------|
| Banner组件 | topbtn_1 | 点击头部 Banner | data1=跳转链接 |
| 优惠券组件 | couponbtn_1 | 点击领取第1张优惠券 | data1=券ID, data2=领取结果(success/fail/already) |
| 优惠券组件 | couponbtn_2 | 点击领取第2张优惠券 | data1=券ID, data2=领取结果 |
| 套餐组件 | pricebtn_1 | 点击购买第1个套餐 | data1=套餐ID, data2=套餐名, data3=促销价 |
| 套餐组件 | pricebtn_2 | 点击购买第2个套餐 | data1=套餐ID, data2=套餐名, data3=促销价 |
| 倒计时组件 | countdownbtn | 点击倒计时弹窗按钮 | data1=按钮类型(close/buy) |

## 三、data 字段汇总

| 字段 | 使用位置 | 说明 |
|------|---------|------|
| data1 | 多处 | 主标识（券ID/套餐ID/图片ID/跳转链接/剩余秒数/按钮类型） |
| data2 | coupon/price | 面额或原价或领取结果 |
| data3 | coupon/price | 门槛或促销价 |
| data4 | price | 套餐名称 |

\`\`\`json
{
  "component": "限时特惠模块",
  "baseline_source": "",
  "inherited": [],
  "changes": [
    {
      "type": "新增",
      "event": "show_rubikpage",
      "event_name": "act",
      "title": "活动页加载",
      "position": "1",
      "component_name": "页面级",
      "data_fields": {},
      "trigger": "活动页加载完成",
      "platform": "全端",
      "change_reason": "新活动页面"
    },
    {
      "type": "新增",
      "event": "show_rubikwindow",
      "event_name": "topitem_1",
      "title": "头部 Banner 曝光",
      "position": "1",
      "component_name": "Banner组件",
      "data_fields": { "data1": "banner图片ID" },
      "trigger": "Banner 进入可视区域",
      "platform": "全端",
      "change_reason": "新增头部 Banner 模块"
    },
    {
      "type": "新增",
      "event": "show_rubikwindow",
      "event_name": "couponitem_1",
      "title": "第1张优惠券曝光",
      "position": "2",
      "component_name": "优惠券组件",
      "data_fields": { "data1": "券ID", "data2": "面额", "data3": "门槛" },
      "trigger": "优惠券卡片进入可视区域",
      "platform": "全端",
      "change_reason": "优惠券领取功能"
    },
    {
      "type": "新增",
      "event": "click_rubikbtn",
      "event_name": "couponbtn_1",
      "title": "点击领取第1张优惠券",
      "position": "2",
      "component_name": "优惠券组件",
      "data_fields": { "data1": "券ID", "data2": "领取结果(success/fail/already)" },
      "trigger": "用户点击领取按钮",
      "platform": "全端",
      "change_reason": "优惠券领取功能"
    },
    {
      "type": "新增",
      "event": "show_rubikwindow",
      "event_name": "priceitem_1",
      "title": "第1个套餐价格卡曝光",
      "position": "3",
      "component_name": "套餐组件",
      "data_fields": { "data1": "套餐ID", "data2": "原价", "data3": "促销价", "data4": "套餐名" },
      "trigger": "价格卡进入可视区域",
      "platform": "全端",
      "change_reason": "套餐价格展示"
    },
    {
      "type": "新增",
      "event": "click_rubikbtn",
      "event_name": "pricebtn_1",
      "title": "点击购买第1个套餐",
      "position": "3",
      "component_name": "套餐组件",
      "data_fields": { "data1": "套餐ID", "data2": "套餐名", "data3": "促销价" },
      "trigger": "用户点击购买按钮",
      "platform": "全端",
      "change_reason": "套餐购买入口"
    },
    {
      "type": "新增",
      "event": "show_rubikwindow",
      "event_name": "countdownwindow",
      "title": "倒计时弹窗弹出",
      "position": "4",
      "component_name": "倒计时组件",
      "data_fields": { "data1": "剩余秒数" },
      "trigger": "倒计时弹窗自动弹出",
      "platform": "全端",
      "change_reason": "限时促销倒计时"
    },
    {
      "type": "新增",
      "event": "click_rubikbtn",
      "event_name": "countdownbtn",
      "title": "点击倒计时弹窗按钮",
      "position": "4",
      "component_name": "倒计时组件",
      "data_fields": { "data1": "按钮类型(close/buy)" },
      "trigger": "用户点击弹窗内按钮",
      "platform": "全端",
      "change_reason": "限时促销倒计时"
    }
  ]
}
\`\`\``

function stripInteractiveDirectives(skillContent: string): string {
  return skillContent
    .replace(/^---[\s\S]*?^---\s*/m, '')
    .replace(/## 工作目录[\s\S]*?(?=## 执行流程|## 核心概念|$)/, '')
    .replace(/## 执行流程\s*```[\s\S]*?```\s*/, '')
    .replace(/### 步骤 0[\s\S]*?(?=### 步骤 1)/, '')
    .replace(/\*\*输出\*\*：`tracking-workspace\/[^`]*`\s*/g, '')
    .replace(/\*\*呈现格式\*\*：向用户展示[\s\S]*?等待确认。\s*/g, '')
    .replace(/（需用户确认）/g, '')
    .replace(/## 步骤 5 完成后[\s\S]*?(?=## 中断|## 参考|$)/, '')
    .replace(/## 中断与恢复[\s\S]*?(?=## 参考|$)/, '')
    .replace(/## 场景路由[\s\S]*?(?=## 交互原则|## 步骤 5|$)/, '')
    .replace(/```bash\s*wps-doc[\s\S]*?```\s*/g, '')
    .replace(/```bash\s*node -e[\s\S]*?```\s*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 将 Skill + PRD 组装为适合粘贴到 Cursor 对话的完整 Prompt */
export function buildCursorPrompt(
  skillRaw: string,
  prdText: string,
  feedback?: string,
): string {
  const parsed = parseSkillMarkdown(skillRaw)
  const parts: string[] = []

  parts.push('请扮演以下角色，并根据文末 PRD 设计埋点方案。')
  parts.push('')
  parts.push('## 角色与规范')
  parts.push(parsed.systemPrompt)

  if (parsed.exampleUser && parsed.exampleAssistant) {
    parts.push('')
    parts.push('## 参考示例')
    parts.push('**用户：**')
    parts.push(parsed.exampleUser)
    parts.push('')
    parts.push('**助手：**')
    parts.push(parsed.exampleAssistant)
  }

  if (parsed.noContextHint) {
    parts.push('')
    parts.push('## 补充说明')
    parts.push(parsed.noContextHint)
  }

  parts.push('')
  parts.push('---')
  parts.push('')
  parts.push('## PRD 文档')
  parts.push(stripHeavyContent(prdText))

  if (feedback?.trim()) {
    parts.push('')
    parts.push('---')
    parts.push('')
    parts.push('## 对上一版方案的反馈（请在本次输出中修正）')
    parts.push(feedback.trim())
  }

  parts.push('')
  parts.push('---')
  parts.push('')
  parts.push(
    feedback?.trim()
      ? '请根据 PRD 和用户反馈，输出更新后的完整埋点设计方案（含 Markdown 说明 + JSON 代码块）。'
      : '请根据 PRD 输出完整的埋点设计方案（含 Markdown 说明 + JSON 代码块）。',
  )

  return parts.join('\n')
}
