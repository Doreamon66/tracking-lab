# 业务规范注册表与读取方式

> 第1步确认**业务归属**后：第2步读本表读规范正文；**第3步生成事件前必读** [business-generation-guide.md](business-generation-guide.md) 对应业务一节。  
> **有规范的业务必须按规范出方案**，不得套用 Excel 模板示例行或照搬其他 delper project。

---

## 〇、读取方式与优先级（必读）

**读取步骤**：
1. 在 `## 一` 注册表中定位该业务规范文档。
2. **在线读规范正文**：ksheet 用 `wps_docs` ET（按 PRD 上线平台读对应 Sheet）；otl 用 `wps_docs` AP 或 WPS365 MCP。
3. 确认 **模型类型 / 事件链路 / 公共属性清单 / 各事件必报属性**，再复制 `assets/` 模板（模板只提供列结构与样式）。

**来源优先级**：

```
业务规范云文档（ksheet 修订版 / otl 知识库）   ← 唯一权威
    ↓ 缺字段时
attribute-rules.md 兜底清单
    ↓ 仅结构参考
delper 同业务在线 project（对照枚举值，不照搬全量属性）
    ↓ 禁止作为属性/事件来源
Excel 模板示例行、其他业务 project、本地离线镜像
```

- **云文档读取失败时**：告知用户原因，请用户**导出规范为 xlsx/本地文件**，或修复 `wps_docs`/WPS365 MCP；**不得**用 `ai-tracking-validate` 等本地离线镜像替代规范正文。
- **用户纠正业务归属时**（如「是 AI 业务，通用模型」）：按新业务**重读规范并重生成整份方案**，不得只改基本信息 Sheet。

---

## 一、规范注册表

### AI 业务

| 文档 | 链接 | 类型 | 读取方式 | 说明 |
|------|------|------|---------|------|
| **国内WPS-AI埋点汇总-修订版** | [co81oG5lGNXz](https://365.kdocs.cn/l/co81oG5lGNXz) | ksheet | **`wps_docs` ET**：按上线平台读取对应 Sheet | 事件属性定义、上报策略、属性值字典（**唯一权威来源**） |
| AI埋点专项知识库 | `cmLAMbbOA88L` | otl | **`wps_docs` AP** 或 WPS365 MCP | ID 生成规则、**公共属性**、主线/支线事件说明 |

**生成约束**：AI 业务 + **通用模型**；公共属性见 [attribute-rules.md](attribute-rules.md) §5.2；事件范围见 §二 + [attribute-rules.md](attribute-rules.md) §二/§四。

### 增值功能 / PDF 业务

| 文档 | 链接 | 类型 | 读取方式 | 说明 |
|------|------|------|---------|------|
| 国内WPS-增值功能-埋点规范v2.0 | `ctK7Lql8GnGo` | ksheet | ET：4个Sheet（业务过程/公共属性/埋点规范/属性字典） | 事件属性定义、公共属性、属性字典 |
| 增值功能埋点专项知识库 | `ci9zchZqXZuZ` | otl | AP：下载为 Markdown 读取 | 命名规范（`vas_{功能}_{业务过程}`）、PDF前缀 `pdf_xxx` |

> 增值功能和PDF业务共用同一套规范，事件名称前缀不同：增值为 `vas_`，PDF为 `pdf_`。

### 稻壳业务

| 文档 | 链接 | 类型 | 读取方式 | 说明 |
|------|------|------|---------|------|
| 稻壳KLM位置模型规范 | — | — | 参见 docer-tracking-plan skill 的 references/ | KLM三层层级、命名规范、事件与层级对应规则 |
| 稻壳属性字典 | — | — | 参见 docer-tracking-plan skill 的 references/attribute-dictionary.md | 属性字典、公共模块、search_type/element_type取值 |

> 稻壳业务规范内容较多，建议直接参考 `docer-tracking-plan` skill 的 references 目录下的规范文件。

### 图片业务

| 文档 | 链接 | 类型 | 读取方式 | 说明 |
|------|------|------|---------|------|
| 看图-埋点规范 | `ctLna2xCvH1r` | ksheet | ET：3个Sheet（埋点规范/公共属性/问题汇总） | 事件属性定义、公共属性、图片信息属性 |

### 运营活动业务

| 文档 | 链接 | 类型 | 读取方式 | 说明 |
|------|------|------|---------|------|
| **运营活动业务埋点规范** | 本地 `tracking-design/SKILL.md` | markdown | 直接读取 | 位置模型完整规范：三层结构、事件命名、公共属性 8 项、自定义属性规则、漏斗设计（**唯一权威来源**） |
| 运营活动自定义埋点规范（魔方组件化） | 本地 `tracking-design/references/ops-activity-specs.md` | markdown | 直接读取 | 魔方平台组件化架构：3 固定事件 + event_name + data1~data8，用于基于魔方搭建的营销活动页 |
| 运营活动组件埋点基线 | 本地 `tracking-design/references/ops-activity-baseline.md` | markdown | 直接读取 | 各魔方组件现有埋点定义基线，增量设计参考 |

**生成约束**：运营活动 + **位置模型**（12 列）；公共属性 8 项见 [attribute-rules.md](attribute-rules.md) §5.6；事件范围见 [business-generation-guide.md](business-generation-guide.md) §运营活动。

**两套体系选择**：
- **位置模型**（SKILL.md）：适用于独立运营活动功能（新人专区、备考专区、签到打卡、福利中心等），按 `{功能标识}_{action}` 命名，三层位置结构
- **魔方组件化**（ops-activity-specs.md）：适用于魔方平台搭建的营销落地页，3 个固定事件 + event_name + data 字段

### 无标准业务

| 文档 | 链接 | 类型 | 读取方式 | 说明 |
|------|------|------|---------|------|
| 通用模型埋点方案设计 | `csPan013TqiA` | otl | AP：下载为 Markdown 读取 | 按分类+事件方式设计，属性由公共属性+自定义属性构成 |
| 位置模型埋点方案设计 | `cnB3tzATbhaQ` | otl | AP：下载为 Markdown 读取 | 按页面→模块→元素层级设计，属性由公共属性+位置属性+自定义属性构成 |

---

## 二、业务 → 模型与事件骨架

| 业务 | 推荐模型 | 事件骨架 |
|------|---------|---------|
| AI | 通用模型 | 主线 `ai_show → … → ai_finishrequest`，支线见 [attribute-rules.md](attribute-rules.md) §四；**§2.1/§2.2 分级与合并**；**§2.3 一事件一块** |
| 稻壳 | 位置模型 | KLM：`docer_{功能标识}_display/click/stay/load`；**§2.1/§2.2**：模块级合并，勿逐控件拆 display |
| 增值/PDF | 按规范 | `{vas\|pdf}_{功能}_{show\|click\|use\|result\|close}`；**§2.1/§2.2**：用 `act`/`button_name` 合并，勿逐按钮发明事件名 |
| 图片 | 按规范 | `photo_{功能}_show/click/...`；**§2.1/§2.2**：用 `page_name`/`button_name` 合并 |
| **运营活动** | 位置模型 | `{功能标识}_{display\|click\|stay\|load\|hover}`；三层位置结构（页面→模块→元素）；**§2.1/§2.2**：模块级合并，同一 click 事件用 `click_target` 枚举区分按钮，勿每按钮建事件 |
| 无标准业务 | 用户确认 | 通用或位置模型设计思路 |

**禁止混用（§2.4 业务规则隔离）**：

| 禁止 | 说明 |
|------|------|
| AI 业务 + PDF/增值事件名 | 用 `{前缀}_{功能}_{show/click}` 代替 AI 固定事件名；应只用 `ai_show`/`ai_click`/… |
| AI 业务 + 模板默认公共属性 | `func_version`/`is_login`/`member_identity`/`entry_id` 仅无标准业务可用 |
| AI 业务 + 稻壳 KLM / delper 稻壳 project | 位置模型、`docer_*_display` 等 |
| AI 业务 + ET 插件存量属性 | `comp=et`、已废弃 `position` 等 |
| PDF 业务 + AI 主线事件名 | 如 PDF 功能却写 `ai_open`/`ai_createrequest`（未走 AI 网关时） |
| 功能标识拼进 AI 事件名 | 功能标识只进 `function_code`/`ai_app` 等属性，不进 C 列事件名 |

PRD 含多个业务关键词时：**以第 1 步已确认的业务归属为准** → **只读该业务规范**，不得从 PRD 其他关键词拼接命名规则。详见 [business-generation-guide.md](business-generation-guide.md) §〇、§八。

---

## 三、其他引用

| 文档 | 链接 | 说明 |
|------|------|------|
| AI决策类别字典 | `corlR9WYFPdb` | `ai_resultuse` 事件的 `answer_use` 属性值枚举字典 |
