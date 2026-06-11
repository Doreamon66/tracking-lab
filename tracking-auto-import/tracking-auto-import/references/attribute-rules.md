# 埋点属性与事件填充规则

> 属性与事件的**唯一权威来源**。生成方案时，事件名和属性都必须能在业务规范（见 [business-specs.md](business-specs.md)）或本文件兜底清单中找到依据。

---

## 一、属性来源分级（白名单制）

| 优先级 | 来源 | 判定标准 | 动作 |
|--------|------|---------|------|
| **P0** | 业务规范标记 **"必报"** / **"能获取必报"** | 明确标注 | **必须生成**，不可遗漏 |
| **P1** | 业务规范标记 **"按需上报，建议都报"** | 明确标注 | **默认生成**，仅当与功能完全无关时跳过 |
| **P2** | 业务规范标记 **"按需"** 且与功能相关 | 结合 PRD 判断 | 谨慎生成，必须有 PRD 依据 |

**禁止行为**：
- 生成不在以上三级范围内的属性
- 为"描述更丰富"而编造属性、自行组合规范未定义的属性名+属性值
- 规范找不到对应属性时只在备注标注"建议补充规范"，不得自行编造

---

## 二、事件范围约束（与属性同级，核心红线）

| 情形 | 来源 | 动作 |
|------|------|------|
| **允许** | 业务规范 ksheet / otl 云文档中**已登记** **且** PRD 有对应交互 | 写入方案 |
| **禁止** | PRD 文案、Toast、delper 其他 project、Agent 推断（规范中无此事件名） | **不得添加** |
| **例外** | 用户**明确要求**新增（如「加一个 xxx 事件」） | 可添加，备注「用户要求新增，需规范登记」 |

- **AI 业务**事件权威来源：[国内WPS-AI埋点汇总-修订版.ksheet](https://365.kdocs.cn/l/co81oG5lGNXz)（`wps_docs` ET，按终端 Sheet）+ 知识库 otl `cmLAMbbOA88L`。
- **不得**用 delper「业务字典」（MCP `tracking_list_business` 的 `processes`）作为事件来源：该字典含**历史废弃事件**（如 `ai_remind`/`ai_remindclick`/`ai_finishsession` 早已停用），仅可用于查 application/business/terminal 的 code，**不可**当事件白名单。
- **PRD 有交互但规范无对应事件**（用户未要求新增）：按该业务可用的事件类型 + 属性枚举覆盖（见 §2.2 各业务合并手段）；或在备注标注「建议联系数据BP新增事件」，**不得**自行发明事件名。

### 2.1 PRD 交互分级（全业务，决定写哪些事件块）

生成前先给 PRD 交互分级，**默认只写 P0 + P1**；P2 除非用户明确要求，否则不写入方案。

**通用定义**：

| 级别 | 范围 | 默认动作 |
|------|------|---------|
| **P0** | 规范已登记的**主链路/核心转化**事件，且 PRD 有对应流程 | **必写** |
| **P1** | 规范已登记、PRD 有**产品差异化**交互，且 P0 事件的属性**无法区分** | **按需写**；同类合并为少量事件块 |
| **P2** | 规范允许但非 MVP 分析优先级：次要曝光、辅助操作、反馈/时长类 | **默认不写**；用户明确要求时再写 |

**禁止**（全业务）：把 PRD 每个 UI 组件/文案都映射成独立事件块；为「看起来完整」默认加入 P2 事件。

**各业务 P0 / P1 / P2 示例**：

| 业务 | P0 主链路 | P1 差异化支线 | P2 默认不写（除非用户要求） |
|------|----------|--------------|---------------------------|
| **AI** | `ai_show` → `ai_click` → `ai_open` → `ai_clickrequest` → `ai_createrequest` → `ai_requestresult` → `ai_resultuse` → `ai_finishrequest` | 技能切换、数据详情面板、报告编辑（`ai_funcshow`/`ai_funcclick` 合并块） | 上传区/推荐问题/图表卡片等纯曝光、`ai_feedback`、`ai_newfile` |
| **增值 / PDF** | `{vas\|pdf}_{功能}_show` → `click` → `use` → `result`（PRD 有则写 `close`） | 收银台/权益弹窗等规范已登记、且 `act`/`button_name` 无法覆盖的独立流程 | 次要按钮曝光、装饰性 show、非核心 toast |
| **稻壳** | 核心页面的 `display` + `click`（入口→核心操作） | 关键模块 `stay`/`load`（如列表加载、详情停留） | 每个 icon/装饰元素的独立 display；全页面 stay 扫街 |
| **图片** | `photo_{功能}_show` → `click` → `use`/`result`（按规范业务过程） | PRD 强依赖且 P0 属性无法区分的独立模块 | 次要控件曝光、非核心辅助 click |
| **运营活动** | 页面 `display` → 核心模块 `display` → 操作 `click` → 结果反馈 `click`（action_type+result） | 重要弹窗 display/click、次要模块 display | stay、load、hover、纯装饰模块 display |

> 无标准业务：按用户确认的模型，参照上表「主链路 + 少量差异化 + 默认不写次要交互」原则设计。

### 2.2 事件块合并规则（全业务）

**同一事件类型**下，用**规范已有的属性枚举**区分场景，而不是为每个 UI 组件单独建事件块。

**通用原则**：
- 一级/二级分类（或页面/模块/元素）按**业务模块**组织，不按单个控件组织。
- 同一事件类型、同一上报时机、同一必报属性集合 → **合并为 1 个事件块**，差异写在属性值列。
- 仅当**上报时机**或**必报属性集合**与已有块明显不同时，才新增事件块。

**各业务合并手段**：

| 业务 | 用什么区分（写在属性值列） | 推荐 | 禁止 |
|------|---------------------------|------|------|
| **AI** | `func_name`、`page_name`、`button_writing` | 1 块 `ai_funcclick` + `func_name` 枚举覆盖技能切换/报告编辑 | 每个 UI 组件各建一块 `ai_funcshow`/`ai_funcclick` |
| **增值 / PDF** | `act`、`button_name`、`page_name`（按规范字段） | 同一 `show`/`click`/`use` 事件 + `act` 枚举覆盖多按钮 | 为每个按钮发明 `{func}_click_xxx` 新事件名 |
| **稻壳** | `page_name`、`module_name`、`element_name`、`klm` | 模块级 `display`/`click`，元素差异写在位置属性 | 每个 icon 单独一行 display（同模块同触发逻辑时） |
| **图片** | `page_name`、`button_name` | 同一 `show`/`click` + 属性枚举 | 每个小控件单独建事件块 |
| **运营活动** | `page_name`、`module_name`、`element_name`、`click_target` | 模块级 `display`/`click`，同一 click 用 `click_target` 枚举区分按钮；弹窗用 `popup_type` 区分 | 每个按钮/链接单独建事件（应合并为同一 click + click_target 枚举） |

**PRD 交互在规范中无对应事件名时**（用户未要求新增）：
- **AI** → `ai_funcshow` / `ai_funcclick` + `func_name`
- **增值/PDF** → 已有 `show`/`click`/`use` + `act` / `button_name`
- **稻壳** → `display` / `click` + `page_name` / `module_name` / `element_name`
- **图片** → `show` / `click` + `page_name` / `button_name`

### 2.3 通用模型：一事件一块（硬性）

> 适用于模型类型为**通用模型**的方案（含 AI 业务、无标准业务等）。位置模型见 §2.2 各业务 KLM/位置属性合并规则。

**核心规则**：埋点方案 Sheet 中，**每个事件名称（C 列）在整个方案里只出现 1 次**，即只建 **1 个事件块**。块内按属性逐行填写（公共属性 + 自定义属性）属于正常结构，**不**算「多条事件记录」。

| 要求 | 说明 |
|------|------|
| **一事件名一块** | `ai_open`、`ai_funcclick`、`vas_xxx_show` 等每个规范事件名各 **1 块**，禁止同名重复出现 |
| **展示/点击不拆块** | 功能展示（`show`/`funcshow`/`display`）、功能点击（`click`/`funcclick`）等前端操作，**不因**不同页面、模块、按钮、Tab、弹层各建一块 |
| **场景进属性值** | 所有可区分场景合并写入规范字段的**属性值列（H 列）**：英文枚举、`/` 分隔；中文释义写在属性值描述列（I 列） |
| **一级/二级分类** | A/B 列按业务模块组织可读性，**不得**用来把同一事件名拆成多块 |

**示例（AI · 通用模型）**：

| 错误 ❌ | 正确 ✅ |
|--------|--------|
| 3 块 `ai_funcclick`（分别对应技能切换、报告编辑、详情面板） | 1 块 `ai_funcclick`，`func_name` 属性值列填 `skill_switch/report_edit/detail_panel/...` |
| 2 块 `ai_show`（首页入口 / 侧边栏入口） | 1 块 `ai_show`，`open_position` 或规范字段枚举覆盖各入口 |
| 每个按钮一行独立「事件块」且 C 列事件名相同 | 1 块 + `button_writing` / `func_name` / `act` 等属性值枚举 |

**判定**：输出前统计 C 列每个事件名出现次数；**任意事件名出现 >1 次即不合格**，须合并为 1 块并将场景迁入属性值列。

### 2.4 业务规则隔离（禁止混用，核心）

> **业务归属一旦确认，整套方案只跟该业务规范走。** 禁止把 A 业务的业务归属 + B 业务的事件命名 + 模板默认公共属性拼在一起。  
> **Agent 生成事件时的操作入口**：[business-generation-guide.md](business-generation-guide.md)（按业务分节，比本节更易执行）。

#### 2.4.1 各业务事件命名边界（Agent 必背）

| 业务 | 事件名从哪来 | 功能标识写在哪 | 禁止 |
|------|-------------|---------------|------|
| **AI** | 规范**固定**事件名：`ai_show`、`ai_click`、`ai_open`、…、`ai_finishrequest`；支线见 §四 | `function_code`、`ai_app`、`open_position`、`func_name` 等**属性值** | 把功能标识拼进事件名；用增值/PDF 的 `{功能}_show/click` 格式 |
| **增值/PDF** | `{vas\|pdf}_{功能标识}_{show\|click\|use\|result\|close}` | 事件名前缀中的功能段 + `act`/`button_name` | 用 `ai_show` 主线或 AI 公共属性 |
| **稻壳** | `docer_{功能标识}_display/click/stay/load` + KLM 位置属性 | `page_name`/`module_name`/`element_name` | 用 AI 主线或通用模型默认 4 项公共属性 |
| **图片** | `photo_{功能}_{show\|click\|...}` | `page_name`/`button_name` | 混用 AI / 增值事件名 |
| **运营活动** | `{功能标识}_{display\|click\|stay\|load\|hover}`，同功能共享事件名 | 位置属性 `page_name`/`module_name`/`element_name` + `click_target` | 生成得谱未定义的 action；为每个按钮建事件；混用 AI/PDF/增值事件名 |

#### 2.4.2 混用错误模式（抽象，与具体产品无关）

**根因**：PRD 含多个业务关键词，但生成时未严格遵循**第 1 步已确认的那一个**业务规范，而从 PRD 其他关键词或他业务规则拼接方案。

| 错误模式 | 表现 | 正确做法 |
|---------|------|---------|
| **归属 A + 命名 B** | 基本信息填 A 业务，事件名用 B 业务的 `{前缀}_{功能}_{show/click}` | 全程只用 A 业务的规则包（见 [business-generation-guide.md](business-generation-guide.md)） |
| **功能标识错位** | 功能标识写进当前业务不允许的位置（如 AI 拼进事件名） | 按该业务规范：AI→属性；PDF/稻壳→事件名 |
| **分类体系错配** | 用 B 业务的二级分类（如「功能展示/点击」）组织 A 业务事件 | 用 A 业务的链路/模块分类（如 AI「入口链路」「AI请求链路」） |
| **公共属性错配** | 套通用模板默认项或他业务公共属性 | 只写该业务规范白名单 |
| **主链路缺失** | 已确认 A 业务，却只写展示/点击，缺 A 规范要求的 P0 主线 | 按 A 业务 §2.1 P0 补全主链路 |

#### 2.4.3 PRD 多业务关键词时的规则

| 情况 | 动作 |
|------|------|
| 第 1 步已确认业务归属 | **只遵循该业务规范生成**；PRD 中其他业务词**不**带入命名或事件 |
| PRD 跨业务且未确认归属 | **先问用户**选定本次业务，不得凭关键词混写 |
| 判定业务流程类型（选归属时参考） | 走 AI 网关/VLM → AI业务；纯 PDF 工具无 AI 主线 → PDF业务；不确定 → 问用户 |

**禁止**：从 PRD 多个关键词各取一条规则拼接——**业务归属与事件/属性/公共属性必须成对、成套匹配**。

#### 2.4.4 AI 业务事件白名单（生成与校验用）

以 [ksheet 修订版](https://365.kdocs.cn/l/co81oG5lGNXz) 对应终端 Sheet 为准；下表为常见登记事件，**不在表内且非用户明确要求新增 → 不得写入**：

`ai_show`、`ai_click`、`ai_open`、`ai_clickrequest`、`ai_createrequest`、`ai_requestresult`、`ai_resultuse`、`ai_finishrequest`、`ai_funcshow`、`ai_funcclick`、`ai_feedback`、`ai_newfile`、`ai_funcshow_duration`、`ai_funcload_duration`、`ai_funcresult`、`ai_blacklist_show`、`ai_blacklist_click`、`ai_realnameshow`、`ai_realnameclick`

**硬性排除**（AI 业务出现即不合格）：
- 匹配 `^ai_[a-z0-9_]+_(show|click|use|result|close)$` 且**不在**上表（即 `{功能标识}` 拼进 AI 事件名的 PDF 式命名）
- 事件名包含基本信息中的**功能标识** + 业务过程后缀（`{功能标识}_show` 等）
- 出现 `pdf_`/`vas_`/`docer_`/`photo_` 前缀事件（跨业务混用）

---

## 三、事件类型级必报属性清单

> 兜底表。业务规范中有独立定义的事件以规范为准。

### 通用业务（增值/PDF/图片）

| 事件类型 | 必带属性 |
|---------|---------|
| show | page_name（图片业务） |
| click | button_name、page_name（图片业务） |
| use | act（增值/PDF）、button_name、page_name（图片业务） |
| result | result（success/fail）、time、number（成功时）、fail_reason（失败时） |
| close | close_type（confirm/cancel/escape） |

### AI 业务

| 事件 | 必带属性 |
|---------|---------|
| ai_show | function_code（按需）、function_name（按需）、open_position |
| ai_click | function_code（按需）、function_name（按需） |
| ai_open | function_code（必报）、function_name（按需）、track_id |
| ai_clickrequest | function_code（必报）、function_name（按需）、request_source（必报）、track_id、action_id |
| ai_createrequest | intention_code（必报）、request_id（必报）、track_id、action_id、function_code（必报）、function_name（按需）、ai_request_content（能获取必报）、**skill_info（能获取必报，claw类型产品）** |
| ai_requestresult | result（必报）、is_show_success（能获取必报）、product_name（必报）、request_id、duration（必报）、request_source（必报）、intention_code（必报）、function_code（必报）、response_content（能获取必报）、**skill_info（能获取必报，claw类型产品）** |
| ai_resultuse | answer_use（必报）、request_id、track_id、action_id |
| ai_finishrequest | track_id、action_id、function_code（必报）、scene（必报，ET组件）、total_duration（必报）、discontinue_type（必报）、discontinue_reason（能获取必报）、**skill_info（能获取必报，claw类型产品）** |

**AI ID 透传规则**：

| ID | 生成事件 | 透传至 |
|----|---------|--------|
| track_id | ai_open | ai_clickrequest、ai_createrequest、ai_requestresult、ai_resultuse、ai_finishrequest |
| action_id | ai_clickrequest | ai_createrequest、ai_requestresult、ai_resultuse、ai_finishrequest |
| request_id | ai_createrequest | ai_requestresult、ai_resultuse、ai_finishrequest |
| session_id | ai_createrequest（多轮对话时） | ai_createrequest、ai_requestresult、ai_resultuse、ai_finishrequest |

### 稻壳业务

| 事件 | 必带属性 |
|---------|---------|
| display | event_id、page_name、module_name、element_name、element_type、klm、func_version、is_login、member_identity、entry_id |
| click | （同 display） |
| stay | （同 display）+ stay_duration |
| load | （同 display）+ load_result、load_duration |

### 运营活动业务

**公共属性（8 项，每个事件必带）**：`event_id`、`page_name`、`module_name`、`element_name`、`is_login`、`user_group`、`func_version`、`entry_id`

| 事件类型 | 额外必带属性 |
|---------|---------|
| 页面级 display | user_status、first_entry |
| 模块级 display | 该模块当前呈现的状态属性（item_status/progress_status/content_type/count类） |
| click | click_target（区分同模块/元素内不同按钮） |
| 弹窗 display | popup_type、popup_source |
| 弹窗 click/close | click_target（含 close/mask_close/auto_close 枚举） |
| 动作结果反馈 click | action_type（enum: pay/claim/unlock/subscribe/check_in）、result（enum: success/fail）、fail_reason（fail 时）、result_detail（success 时建议） |
| stay | stay_duration |
| load | load_result、load_duration |

---

## 四、AI 业务事件参考清单（主线 + 支线）

> 完整事件集以 [ksheet 修订版](https://365.kdocs.cn/l/co81oG5lGNXz) 对应终端 Sheet 为准；下表为常见参考，生成前对照 ksheet 确认。

**主线（PRD 有 AI 请求链路时应包含）**：

`ai_show` → `ai_click` → `ai_open` → `ai_clickrequest` → `ai_createrequest` → `ai_requestresult` → `ai_resultuse` → `ai_finishrequest`

**支线（按 §2.1 分级选用，非默认全量）**：

| 事件 | 默认级别 | 何时纳入 |
|------|---------|---------|
| `ai_funcshow` / `ai_funcclick` | **P1** | 产品差异化交互；**合并为少量事件块**，用 `func_name`/`page_name` 区分（§2.2） |
| `ai_newfile` | **P2** | PRD 有新建文件/新建对话，且 `ai_open` 无法覆盖；或用户明确要求 |
| `ai_feedback` | **P2** | PRD 有点赞/点踩；或用户明确要求满意度分析 |
| `ai_funcshow_duration` / `ai_funcload_duration` | **P2** | PRD 要求曝光/加载时长；或用户明确要求 |
| `ai_funcresult` | **P2** | PRD 有功能结果展示；或用户明确要求 |
| `ai_blacklist_show` / `ai_blacklist_click` | **P1/P2** | PRD 有黑名单弹窗 |
| `ai_realnameshow` / `ai_realnameclick` | **P1/P2** | 接入 N 合一且需权益/登录弹窗 |

---

## 五、公共属性清单

> 公共属性同时写入「公共属性 Sheet」和各事件埋点方案 Sheet。**有规范业务**以规范为准；下表为兜底/核对，**不可替代规范正文**。

### 5.1 模板默认项（仅「无标准业务」可用）

模板内置 `func_version`、`is_login`、`member_identity`、`entry_id` **仅适用于无标准业务**。**AI / 增值 / PDF / 稻壳 / 图片** 有规范时**不得**因模板示例写入上述字段（除非规范明确要求）。

### 5.2 AI 业务公共属性（白名单）

| 属性 | 上报策略 | 说明 |
|------|---------|------|
| `project` / `comp` | 必报其一 | Web/金山文档用 `project`；PC/移动客户端用 `comp` |
| `ai_app` | standalone 必报 | AI 独立应用 ID；**仅当 `comp` 或 `project` = `standalone` 时上报**，填功能标识，**不得**写入 `comp`/`project` |
| `open_position` | 必报，全链路透传 | AI 入口；**勿用已废弃的 `position`** |
| `integritycheckvalue` | 能获取必报 | 文档唯一 ID |
| `cloud_file_id` | 能获取必报 | 云文档 ID |
| `intention_code` | 能获取必报 | 计费意图编码，需运营登记 |
| `ai_type` | 选择性 | AI 产品形态 |
| `ai_theme` | 选择性 | AI 功能主题 |
| `skill_info` | 能获取必报（claw类型） | skills 信息，JSON：`{"skill_id":"x","skill_name":"x"}` |
| `rp` | 概率上报时必报 | 上报概率（如 ai_show 可为 1000） |

**`comp` / `project` / `ai_app` 填写红线（独立应用易错）**：

| 场景 | 填什么 | 禁止 |
|------|--------|------|
| 独立应用（Web/PC 均可能） | `comp` 或 `project` 属性值 = **`standalone`**（字典固定值） | 把功能标识 `ai_xxx` 写入 `comp`/`project` |
| 同上 | `ai_app` 属性值 = **功能标识**（如 `ai_{功能英文}`） | 把 `standalone` 写入 `ai_app` |
| 端侧选择 | Web/金山文档优先 `project`；PC/移动客户端用 `comp`（**二选一**） | 同时写 `comp`+`project` 或照搬 delper 错误 project 的枚举 |

属性值必须来自规范 **属性字典**（AI ksheet 修订版 / 知识库 otl），**不得**凭功能标识发明 `comp` 新枚举。参考同类已上线独立应用 project 时，只对照字段结构，**枚举仍以字典为准**。

**AI 公共属性 Sheet 不得写入**：
- `position`（已废弃，改用 `open_position`）、`client`（非 AI 清单）
- `func_version` / `is_login` / `member_identity` / `entry_id`（通用模板默认，非 AI 规范）
- `track_id` / `action_id` / `request_id` / `session_id`（事件级 ID，按事件填在埋点方案 Sheet）
- `function_code` / `function_name` / `request_source`（自定义属性，按事件按需）

### 5.3 增值 / PDF

| 属性 | 上报策略 |
|------|---------|
| func_version | 必报 |
| plugin_version | 能获取必报 |
| comp | 能获取必报 |
| first_entry | 必报 |
| src | 能获取必报 |

### 5.4 图片

`src`、`pic_id`、`pic_size`、`classification`、`pic_format`、`pic_volume`（均必报）。

### 5.5 稻壳

`func_version`、`is_login`、`member_identity`、`entry_id`（均必报）；位置属性按 KLM 规范，**不得**混用 AI 事件链路或 AI 公共属性。

### 5.6 运营活动

| 属性 | 类型 | 上报策略 | 说明 |
|------|------|---------|------|
| event_id | string | 必报 | 事件唯一标识（动态生成） |
| page_name | string | 必报 | 当前页面英文名（snake_case） |
| module_name | string | 必报 | 当前模块英文名（snake_case） |
| element_name | string | 必报 | 当前元素英文名（无则为空） |
| is_login | boolean | 必报 | 是否登录（true/false） |
| user_group | string | 必报 | 用户分群（enum: new_register/new_active/paid_user/expired_user/enterprise） |
| func_version | string | 必报 | 活动版本号 |
| entry_id | string | 必报 | 入口来源标识 |

**user_group 标准枚举**：

| 枚举值 | 含义 |
|--------|------|
| new_register | 注册新用户（指定日期后新注册且未付费） |
| new_active | 活跃新用户（历史注册但从未付费） |
| paid_user | 付费用户（当前有效期内会员） |
| expired_user | 过期用户（曾付费但已过期） |
| enterprise | 企业用户（企业账号登录） |

**运营活动公共属性 Sheet 不得写入**：AI 业务属性（`comp`/`project`/`ai_app`/`open_position`）、`position`（运营活动用 `entry_id`）。

### 5.6 属性值与描述填充校验

**枚举描述一一对应**（通用/位置模型均适用）：

- H 列（属性值）与 I 列（属性值描述）用 `/` 分隔时，**分段数量必须相等、顺序对应**
- 禁止用整段概括替代逐枚举释义（如 `func_name` 写「功能展示/点击场景名」）

**生成实现建议**：枚举用 `(英文, 中文)` 列表维护，脚本自动 `join` 写入 H/I 列，避免手写漏项。

---

## 六、输出前自检清单

- [ ] 业务归属与模型类型与用户确认一致
- [ ] 已**在线读取**规范（AI 见 [ksheet 修订版](https://365.kdocs.cn/l/co81oG5lGNXz) + 知识库 otl）
- [ ] **每个事件名**均能在规范中找到；无凭 PRD 自行发明的事件；规范外事件仅在用户明确要求时出现且已备注
- [ ] **PRD 交互分级**（§2.1）：默认仅 P0 主链路 + P1 差异化支线；P2 未在用户要求下出现
- [ ] **事件块合并**（§2.2）：未按 UI 组件过度拆块；同类场景用该业务规定的属性枚举区分（AI→`func_name`；增值/PDF→`act`/`button_name`；稻壳→KLM 位置属性；图片→`page_name`/`button_name`）
- [ ] **通用模型一事件一块**（§2.3）：通用模型下 C 列每个事件名仅出现 1 次；展示/点击/funcshow/funcclick 未重复建块；场景差异已在 H 列属性值枚举
- [ ] 公共属性 Sheet 每行均有规范依据；无 `position`、`client`、模板默认 4 项（有规范业务）
- [ ] 各事件属性 ⊆ 规范「必报/能获取必报/按需」+ PRD 相关 P2
- [ ] 产品枚举已标注登记责任方（`open_position` 需数据BP登记、`intention_code` 需运营登记），若 PRD 未给最终值
- [ ] **`comp`/`project`/`ai_app`**（§5.2）：独立应用为 `comp`或`project`=`standalone` + `ai_app`=功能标识；枚举均在字典内
- [ ] **枚举描述一一对应**（§5.6）：所有 `/` 分隔枚举的 H/I 列数量一致；`func_name` 等无概括性描述
- [ ] **运营活动业务**（§5.6）：公共属性 8 项均有；每方案至少 2 个漏斗；action 仅 display/click/stay/load/hover；click 事件有 click_target；有动作必有结果反馈
- [ ] **业务规则隔离**（§2.4）：未混用他业务事件命名/公共属性；AI 业务无 `{功能标识}_show/click`、无模板默认 4 项；PRD 有 AI 请求链路时含 P0 主线
