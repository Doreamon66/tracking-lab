# 分业务生成指南（第 3 步必读）

> **用法**：第 1 步已确认「业务归属」后，**只打开本文件里对应业务那一节**，按该节的规则生成事件与属性。  
> **核心原则**：PRD 可同时出现多个业务/产品关键词，但生成时**只遵循第 1 步所选的那一个业务规范**，不得把 PRD 里其他业务的命名或属性规则混入方案。

---

## 〇、统一原则（所有业务适用）

### 原则 1：PRD 多业务 ≠ 方案多业务

| 情况 | 正确做法 |
|------|---------|
| PRD 标题/正文同时出现 AI、PDF、会员、稻壳等关键词 | **仍以第 1 步已确认的业务归属为准**，只读该业务的规范 |
| PRD 描述了其他业务的交互 | **默认不写入**本次方案（除非用户明确要求纳入且已选定范围） |
| Agent 不确定该归哪个业务 | **先问用户确认业务归属**，不得凭关键词拼凑多套规则 |

### 原则 2：所选业务决定全部生成规则

一旦业务归属确定，以下**全部**只跟该业务走，**禁止**从 PRD 其他关键词或他业务规范借用：

| 维度 | 由所选业务决定 |
|------|---------------|
| 事件名格式 | 固定名（AI）/ `{前缀}_{功能}_{过程}`（PDF 等）/ KLM 事件（稻壳） |
| 功能标识位置 | 属性字段 vs 事件名中间段（见 §一对照表） |
| 公共属性清单 | 各业务白名单不同，**不得**套通用模板默认项 |
| 场景合并字段 | `func_name`（AI）/ `act`（PDF）/ KLM 位置属性（稻壳）等 |
| P0 主链路 | AI 请求链路 vs show→use→result 等业务过程链 |

### 原则 3：禁止「拼接式」生成

常见错误模式（与具体产品无关）：

| 错误模式 | 说明 |
|---------|------|
| **归属 A + 命名 B** | 基本信息填 A 业务，事件名却用 B 业务的 `{功能}_show/click` 格式 |
| **关键词驱动命名** | 见 PRD 有某业务词，就把该业务前缀/规则拼进事件名 |
| **功能标识错位** | 功能标识写进了当前业务规范不允许的位置（如 AI 业务拼进事件名） |
| **模板/他 project 污染** | 从 Excel 模板示例行或其他业务 delper project 照搬事件/属性 |

---

## 一、30 秒对照表（生成事件前先看这张）

| 业务归属 | 模型 | 事件名怎么写 | 功能标识写在哪 | 多场景怎么合并 |
|---------|------|-------------|---------------|---------------|
| **AI业务** | 通用模型 | **固定名**：`ai_show`、`ai_click`、`ai_open`…`ai_finishrequest`（见 §二） | **属性**：`function_code`、`ai_app`、`open_position`、`func_name` | `func_name` / `page_name` / `button_writing` |
| **PDF业务** | 通用模型 | **`pdf_{功能标识}_{show\|click\|use\|result\|close}`** | **事件名中间段** + `act`/`button_name` | `act` / `button_name` |
| **增值功能** | 通用模型 | **`vas_{功能标识}_{show\|click\|use\|result\|close}`** | 同上 | `act` / `button_name` |
| **稻壳业务** | 位置模型 | **`docer_{功能标识}_{display\|click\|stay\|load}`** | KLM：`page_name`/`module_name`/`element_name` | 位置属性 + 模块级合并 |
| **图片业务** | 按规范 | **`photo_{功能}_{show\|click\|...}`** | `page_name` / `button_name` | `page_name` / `button_name` |
| **运营活动** | 位置模型 | **`{功能标识}_{display\|click\|stay\|load\|hover}`** | 位置属性：`page_name`/`module_name`/`element_name` | `click_target`（click 事件）/ 位置属性（display 事件） |
| **无标准业务** | 用户确认 | 自拟，参考通用/位置模型设计 otl | 按设计稿 | 按设计稿 |

**功能标识写在哪——因业务而异（不可混用）**：

| 业务 | 功能标识出现在 |
|------|---------------|
| AI | `function_code`、`ai_app` 等**属性值**；**不在** C 列事件名 |
| PDF / 增值 | **事件名中间段**：`pdf_{功能标识}_show` |
| 稻壳 | **事件名中间段**：`docer_{功能标识}_display` |
| 图片 | **事件名中间段**：`photo_{功能}_show` |
| 运营活动 | **事件名前缀**：`{功能标识}_display`；位置靠 `page_name`/`module_name`/`element_name` 区分 |

---

## 二、AI 业务 — 生成规则

### 何时选 AI 业务

- PRD 核心流程走 **AI 网关 / VLM / 对话生成** 等 **AI 请求链路**
- **即使** PRD 标题/模块含其他业务词（如 PDF、PC、稻壳），只要已确认归属为 AI业务，**仍只按本节生成**

### 读哪份规范

| 文档 | 链接 |
|------|------|
| 国内WPS-AI埋点汇总-修订版 | [co81oG5lGNXz](https://365.kdocs.cn/l/co81oG5lGNXz)（按终端 Sheet） |
| AI埋点专项知识库 | otl `cmLAMbbOA88L` |

### 事件怎么生成

**P0 主线**（PRD 有 AI 请求流程时**必写**）：

```
ai_show → ai_click → ai_open → ai_clickrequest → ai_createrequest
→ ai_requestresult → ai_resultuse → ai_finishrequest
```

**P1 支线**（按需，合并为少量块）：`ai_funcshow`、`ai_funcclick`  
**P2 默认不写**：`ai_feedback`、`ai_newfile` 等（除非用户明确要求）

**允许的事件名白名单**（不在此表且用户未要求新增 → 不得写）：

`ai_show`、`ai_click`、`ai_open`、`ai_clickrequest`、`ai_createrequest`、`ai_requestresult`、`ai_resultuse`、`ai_finishrequest`、`ai_funcshow`、`ai_funcclick`、`ai_feedback`、`ai_newfile`、`ai_funcshow_duration`、`ai_funcload_duration`、`ai_funcresult`、`ai_blacklist_show`、`ai_blacklist_click`、`ai_realnameshow`、`ai_realnameclick`

### 公共属性（只写这些）

`comp` 或 `project`、`ai_app`、`open_position`、`integritycheckvalue`、`cloud_file_id`、`intention_code`、`ai_type`、`ai_theme`、`rp`（详见 [attribute-rules.md](attribute-rules.md) §5.2）

### 本业务禁止

| 禁止 | 模式说明 |
|------|---------|
| 把功能标识拼进事件名 | `{功能标识}_show` / `ai_{功能标识}_show` 等 |
| 借用 PDF/增值 命名 | 用 `{前缀}_{功能}_{show\|click}` 代替固定 `ai_show`/`ai_click` |
| 套模板默认公共属性 | `func_version`、`is_login`、`member_identity`、`entry_id` |
| 只有展示/点击、无 AI 请求链路 | 二级分类仅「功能展示/功能点击」，缺 P0 主线 |
| 参考他业务 delper project | 照搬非 AI 规范的事件名或属性清单 |

### 正确做法（抽象）

| 项目 | 规则 |
|------|------|
| 业务归属 | 第 1 步确认为 AI业务 |
| 功能标识 | 写在 `function_code` / `ai_app` 等属性，**不进事件名** |
| 事件名 | 只用白名单固定名（`ai_show`、`ai_click`…） |
| 一级分类 | 按 AI 请求链路组织（入口链路、AI请求链路），非 PDF 式「功能展示/点击」 |
| PRD 含其他业务词 | 忽略其命名规则，不写入他业务事件 |

---

## 三、PDF 业务 — 生成规则

### 何时选 PDF 业务

- PDF 相关能力（转换/编辑/签名/扫描等）
- **且不走** AI 网关主线（无 `ai_show`→`ai_finishrequest` 链路）
- PRD 含 AI 关键词但已确认归属为 PDF → **只按本节**，不写 AI 主线

### 读哪份规范

与增值共用：[ctK7Lql8GnGo](https://365.kdocs.cn/l/ctK7Lql8GnGo) + otl `ci9zchZqXZuZ`；事件前缀用 **`pdf_`**

### 事件怎么生成

```
pdf_{功能标识}_show → click → use → result（PRD 有则 close）
```

- 功能标识**在事件名里**
- 多场景：同一 `show`/`click` + **`act` / `button_name`** 枚举

### 公共属性

以增值规范 ksheet「公共属性」Sheet 为准：`func_version`、`plugin_version`、`comp`、`first_entry`、`src` 等

### 本业务禁止

| 禁止 | 说明 |
|------|------|
| 用 AI 固定主线 | 未走 AI 网关时不写 `ai_show`/`ai_open`/… |
| 用 AI 公共属性白名单 | — |
| 因 PRD 含 AI 词而混写 | 已确认 PDF 则全文按 PDF 规则 |

---

## 四、增值功能 — 生成规则

与 **§三 PDF** 相同，仅事件前缀改为 **`vas_`**：

```
vas_{功能标识}_show → click → use → result（PRD 有则 close）
```

---

## 五、稻壳业务 — 生成规则

### 模型

**位置模型**（12 列），不是通用模型。

### 事件怎么生成

```
docer_{功能标识}_display / click / stay / load
```

- KLM 位置属性区分场景；模块级合并

### 本业务禁止

混用 AI 主线、AI 公共属性、通用模型默认 4 项（除非规范明确要求）

---

## 六、图片业务 — 生成规则

规范：[ctLna2xCvH1r](https://365.kdocs.cn/l/ctLna2xCvH1r)

```
photo_{功能}_show / click / use / result ...
```

合并：`page_name`、`button_name`

---

## 七、运营活动业务 — 生成规则

### 何时选运营活动业务

- PRD 描述的是**运营活动类需求**：新人专区、备考专区、大促活动、签到打卡、任务体系、福利中心等
- 具备以下任一特征：有明确活动周期、运营后台配置驱动、用户身份分层、奖励/签到/任务/优惠激励机制、弹窗密集、单页多模块纵向排列
- 活动目标为拉新/促活/转化/留存

### 读哪份规范

| 文档 | 位置 |
|------|------|
| **运营活动业务埋点规范** | `tracking-design/SKILL.md`（唯一权威） |
| 外部规范参考 | `tracking-design/references/external-specs.md` |
| 方案示例 | `tracking-design/references/examples.md` |

### 模型

**位置模型**（12 列），按三层结构组织：

```
功能 (feature_id)
├── 页面 (page_name)
│   ├── 模块 (module_name)
│   │   └── 元素 (element_name)
```

### 事件怎么生成

```
{功能标识}_display → {功能标识}_click → {功能标识}_click(结果反馈)
```

- 事件名格式：`{功能标识}_{action}`，同功能共享事件名，靠位置属性区分点位
- 功能标识格式：`{业务缩写}_{功能英文}`（如 `vas_newbie_zone`、`ops_checkin_center`）

**action 取值（与得谱平台统一，不可自创新类型）**：

| action | 含义 | 适用场景 |
|--------|------|---------|
| display | 曝光/展示 | 页面/模块/弹窗进入可视区域 |
| click | 点击/操作 | 用户主动点击、弹窗关闭、操作结果反馈 |
| stay | 停留 | 页面/模块停留时长（需 stay_duration） |
| load | 加载 | 页面/模块数据加载完成（需 load_result、load_duration） |
| hover | 悬浮 | 鼠标悬浮触发内容变化（仅PC活动） |

**P0/P1/P2 分级**：

| 级别 | 范围 | 默认动作 |
|------|------|---------|
| P0 | 页面级 display、核心模块 display、核心操作 click（含结果反馈） | **必写** |
| P1 | 重要弹窗 display/click、次要模块 display | **按需写** |
| P2 | stay、load、hover、纯装饰模块 display | **默认不写** |

**事件块合并规则**：
- 同一模块/元素的 click 事件用 `click_target` 属性枚举区分按钮，**不为每个按钮建事件**
- 弹窗关闭统一归入 click 事件：`click_target=close/mask_close/auto_close`
- 动作结果通过 click 事件 + `action_type` + `result` 属性表达

**事件级必报属性**：

| 事件类型 | 必带属性 |
|---------|---------|
| 页面级 display | user_status、first_entry |
| 模块级 display | 该模块当前呈现的状态属性（item_status/content_type/count类） |
| click | click_target（区分同模块内不同按钮） |
| 弹窗 display | popup_type、popup_source |
| 弹窗 click | click_target（含 close/mask_close/auto_close 枚举） |
| 动作结果 click | action_type（pay/claim/unlock/subscribe/check_in）、result（success/fail）、fail_reason（fail时） |

### 公共属性（8 项，每个事件必带）

`event_id`、`page_name`、`module_name`、`element_name`、`is_login`、`user_group`、`func_version`、`entry_id`

（详见 [attribute-rules.md](attribute-rules.md) §5.6）

### 漏斗设计（每方案至少 2 个）

| 漏斗类型 | 标准步骤 |
|---------|---------|
| 触达漏斗 | 页面 display → 核心模块 display → 首个 click |
| 参与漏斗 | 核心玩法 display → 玩法 click → click(result=success) |
| 转化漏斗 | 支付模块 display → SKU click → click(action_type=pay, result=success) |
| 回访漏斗 | 首访 display → 次日 display → 第N日 display |

### 本业务禁止

| 禁止 | 说明 |
|------|------|
| 生成得谱平台未定义的 action 类型 | 如 close/result/submit 等，只允许 display/click/stay/load/hover |
| 为每个按钮单独建事件 | 应合并为一个 click 事件 + click_target 属性 |
| 自行编造不在 PRD 中的属性 | 属性必须有业务依据 |
| 将 UI 不可达状态写入枚举 | 枚举可达性规则：locked 态不可点击则 click 枚举不含 locked |
| 单事件超过 8 个自定义属性 | 事件应拆分 |
| 只记录动作不记录结果 | 有动作（claim/pay/unlock 等）必有结果反馈 |
| 上报纯样式/装饰性配置值 | 无分析价值 |
| 添加 target_page / jump_url | 跳转目标由运营配置控制，是实现细节非分析维度 |
| 遗漏核心漏斗定义 | 每方案至少 2 个漏斗 |
| 混用 AI/PDF/增值事件名 | 不使用 `ai_show`/`pdf_xxx_show`/`vas_xxx_show` 等 |

---

## 八、无标准业务

- 公共属性可用模板默认 4 项
- 事件命名自拟，参考通用/位置模型设计 otl

---

## 九、PRD 多关键词时的判定（抽象）

**判定顺序**（不得跳步）：

```
1. 第 1 步已与用户确认「业务归属」→ 以此为准
2. 若未确认且 PRD 跨业务 → 先问用户，不生成
3. 打开本文件对应业务 §节 → 只按该节规则生成
4. PRD 中其他业务的关键词/交互 → 不自动带入命名或事件
```

| 已确认业务归属 | 生成时遵循 | PRD 中其他业务关键词 |
|-------------|-----------|-------------------|
| AI业务 | §二 AI 规则包 | **忽略**其 `{功能}_show` 等命名，不写他业务事件 |
| PDF业务 | §三 PDF 规则包 | **忽略** AI 网关词，不写 `ai_show` 主线（除非用户改归属） |
| 稻壳业务 | §五 稻壳规则包 | **忽略** AI/PDF 命名与属性 |
| 运营活动 | §七 运营活动规则包 | **忽略** AI/PDF/增值事件名，只用 `{功能标识}_{action}` 格式 |

**统一错误模式**：PRD 含多业务关键词 → Agent 按关键词拼凑 → 基本信息填 A 业务、事件名用 B 业务格式。**正确**：全程只用**已确认的那一个**业务规则包。

---

## 十、生成事件时的 Agent 检查单

```
□ 1. 第 1 步「业务归属」已与用户确认（PRD 多业务时尤其重要）
□ 2. 打开本文件 §二~§八 中**仅**对应业务那一节
□ 3. 第 2 步已在线读取该节「读哪份规范」
□ 4. 事件名 100% 符合该节规则（未参考 PRD 中其他业务的关键词）
□ 5. 功能标识只出现在该节允许的位置
□ 6. 公共属性只写该节列出的项
□ 7. PRD 交互按 P0+P1 分级，场景用该节「多场景合并」字段
□ 8. 跑 validate_plan_output.py，失败则按该节「禁止」表修正
```

---

## 十一、相关文档

| 文件 | 用途 |
|------|------|
| [business-specs.md](business-specs.md) | 规范文档链接、读取方式 |
| [attribute-rules.md](attribute-rules.md) §2.4 | 业务规则隔离细则 |
| [attribute-rules.md](attribute-rules.md) §四 | AI 支线事件清单 |
| [attribute-rules.md](attribute-rules.md) §5 | 各业务公共属性 |
