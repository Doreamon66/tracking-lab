# 运营活动业务埋点规范

> 本规范适用于所有运营活动类需求的埋点方案设计。活动类需求包括但不限于：新人专区、备考专区、大促活动、签到打卡、任务体系、福利中心等。本文件是活动业务的**完整规范**，设计埋点方案时严格遵循此文件中的所有规则。

---

## 一、适用范围

符合以下任一特征的 PRD，归类为"活动业务"：

- 有明确的活动周期或上线时间窗口
- 页面内容大量由运营后台配置驱动
- 核心关注用户身份分层（新人/老客/付费/非付费/企业）
- 包含奖励/签到/任务/优惠等激励机制
- 弹窗密集（首访引导、身份拦截、奖励领取、工具调用）
- 页面结构为单页多模块纵向排列
- 活动目标为拉新/促活/转化/留存

---

## 二、模型类型

活动业务统一使用**位置模型**，按三层结构组织：

```
功能 (feature_id)
├── 页面 (page_name)
│   ├── 模块 (module_name)
│   │   └── 元素 (element_name)
```

---

## 三、事件命名规范

### 3.1 事件名格式

```
{功能标识}_{action}
```

所有同功能事件共享事件名，靠位置属性（page_name / module_name / element_name）区分具体点位。

### 3.2 action 取值（与得谱平台统一）

| action | 含义 | 适用场景 |
|--------|------|---------|
| display | 曝光/展示 | 页面/模块/弹窗进入可视区域 |
| click | 点击/操作 | 用户主动点击、滑动、擦除等交互行为；弹窗关闭；操作结果反馈 |
| stay | 停留 | 用户在页面/模块的停留时长（需上报 stay_duration） |
| load | 加载 | 页面/模块数据加载完成（需上报 load_result、load_duration） |
| hover | 悬浮 | 鼠标悬浮触发内容变化（仅PC活动） |

> 以上为得谱平台标准事件类型，活动业务必须使用平台统一的 action，不可自行创建新类型。

### 3.3 活动场景的 action 使用建议

| 活动场景 | 使用的 action | 说明 |
|---------|-------------|------|
| 页面/模块/弹窗曝光 | display | 核心事件，活动最高频 |
| 按钮点击/表单提交/弹窗操作 | click | 核心事件，用 click_target 区分具体操作 |
| 弹窗关闭（按钮/蒙版/超时） | click | 用 click_target=close/mask_close/auto_close 区分关闭方式 |
| 支付/领取/签到等操作结果 | click | 用属性 action_type + result 记录动作结果（详见第七章） |
| 页面停留时长 | stay | 按需使用，需要分析用户停留时才添加 |
| 异步数据加载完成 | load | 按需使用，需要分析加载性能时才添加 |
| 鼠标悬浮交互 | hover | 仅PC活动按需使用 |

### 3.4 活动中低频使用的 action

| action | 活动中何时使用 |
|--------|-------------|
| stay | 需要分析用户在某页面/模块的停留时长与转化关系时使用 |
| load | 活动页有复杂异步加载（如动态配置加载）且需要监控加载成功率时使用 |
| hover | PC活动有悬浮交互（如进度条节点hover展示详情）时使用 |

### 3.4 功能标识命名

格式：`{业务缩写}_{功能英文}`

| 示例 | 说明 |
|------|------|
| vas_newbie_zone | 增值_新人专区 |
| vas_beikao_zone | 增值_备考专区 |
| vas_618_promotion | 增值_618大促活动 |
| ops_checkin_center | 运营_签到中心 |

---

## 四、位置模型层级规范

### 4.1 层级定义

| 层级 | 定义 | 命名格式 | 示例 |
|------|------|---------|------|
| 页面 | PRD中的独立页面/视图/Tab | snake_case | main_page、reward_page、knowledge_tab |
| 模块 | PRD需求详情中的功能区块 | snake_case | header_banner、daily_check_in、todo_management |
| 元素 | 模块内功能独立的子区域（有独立属性集和交互逻辑） | snake_case | scratch_card、sku_card、map_piece |

### 4.2 元素判断标准

元素**不是**按钮/链接等UI控件。元素是模块内可以细分出的**功能独立子区域**。

**应建为元素**（有独立的属性集/状态/交互）：

- 刮卡区域（有自己的状态：locked/unlocked）
- SKU卡片（有商品ID/价格等独立属性）
- 排列元素（有序号/完成状态等独立属性）
- 弹窗（模块内触发的弹窗）

**不应建为元素**（用 click_target 属性值区分）：

- 同一模块内的多个按钮（登录、退出、分享、规则）
- 同类操作的不同入口
- 弹窗内的不同按钮

### 4.3 弹窗定位规则

| 弹窗类型 | 定位为 | 判断标准 | 示例 |
|---------|--------|---------|------|
| 全屏弹窗/拦截弹窗 | 独立模块 | 覆盖整个页面，有独立业务逻辑 | 首访引导弹窗、企业拦截弹窗 |
| 模块内触发的功能弹窗 | 该模块下的元素 | 由模块操作唤起，服务于该模块 | 修改项目弹窗、签到月历弹窗 |
| 二次确认弹窗 | 不单独建点位 | 简单确认/取消 | 删除确认、退出确认 |

---

## 五、公共属性

### 5.1 活动业务标准公共属性（8项，每个事件必带）

| 属性名 | 类型 | 说明 | 属性值格式 | 上报策略 |
|--------|------|------|-----------|---------|
| event_id | string | 事件唯一标识 | {动态生成} string | 必报 |
| page_name | string | 页面名称 | {当前页面英文名} string | 必报 |
| module_name | string | 模块名称 | {当前模块英文名} string | 必报 |
| element_name | string | 元素名称 | {当前元素英文名，无则为空} string | 必报 |
| is_login | boolean | 是否登录 | true/false boolean{true/false} | 必报 |
| user_group | string | 用户分群 | enum {new_register/ new_active/ paid_user/ expired_user/ enterprise} | 必报 |
| func_version | string | 活动版本号 | {版本标识} string | 必报 |
| entry_id | string | 入口来源 | {入口标识} string | 必报 |

### 5.2 user_group 标准枚举定义

| 枚举值 | 含义 | 判断逻辑 |
|--------|------|---------|
| new_register | 注册新用户 | 指定日期后新注册且未付费 |
| new_active | 活跃新用户 | 历史注册但从未付费 |
| paid_user | 付费用户 | 当前有效期内会员 |
| expired_user | 过期用户 | 曾付费但已过期 |
| enterprise | 企业用户 | 企业账号登录 |

> 具体活动可按PRD扩展枚举值，但上述5项为基础枚举。

---

## 六、自定义属性规则

### 6.1 属性来源分级

| 优先级 | 来源 | 动作 |
|--------|------|------|
| P0 必报 | 本规范"事件级必报属性清单"中标注的属性 | 必须生成，不可遗漏 |
| P1 建议 | PRD中明确的业务实体/状态/分支 | 默认生成 |
| P2 按需 | PRD中隐含的、需推断的运营分析属性 | 有PRD依据时生成 |

### 6.2 属性设计约束

| 规则 | 说明 |
|------|------|
| 来源于PRD | 每个属性必须有PRD中的业务依据，不可编造 |
| 枚举与可达性一致 | 事件触发时不可能出现的状态不写入枚举。如按钮disabled时不能触发click，则click的枚举不含该状态 |
| 单事件不超过8个 | 一个事件的自定义属性超过8个，说明事件拆分不够细，应拆分 |
| 有动作必有结果 | claim/pay/unlock/subscribe/check_in 类操作必须有结果反馈的 click 事件（带 action_type + result 属性） |
| 配置值选择性上报 | 只上报影响运营决策的配置值（见第九章） |

### 6.3 属性值格式标注

| 格式类型 | 标注方式 | 示例 |
|---------|---------|------|
| 字符串（默认） | string（可省略） | {功能点名称} string |
| 整数 | bigint | 5 bigint |
| 布尔值 | boolean{true/false} | true boolean{true/false} |
| 枚举值 | enum {v1/ v2/ v3} | pay enum {pay/ claim/ unlock} |
| 时间戳 | timestamp | {动态获取} timestamp |

---

## 七、事件级必报属性清单

### 7.1 页面级 display 事件

| 属性 | 类型 | 说明 | 上报策略 |
|------|------|------|---------|
| user_status | string | 用户进入页面时的身份状态 | P0 必报 |
| first_entry | string | 一级入口来源（从哪个渠道/页面进入） | P0 必报 |

### 7.2 模块级 display 事件

模块曝光时，必须携带该模块**当前呈现的状态**属性。常见模式：

| 模块类型 | 必带属性 | 示例 |
|---------|---------|------|
| 有解锁/进度状态的模块 | item_status / progress_status | locked/unlocked/completed |
| 展示不同内容的模块 | content_type / offer_type | newbie_price/renewal_price |
| 有计数/统计的模块 | count类属性 | completed_count/total_count |

### 7.3 click 事件

| 属性 | 类型 | 说明 | 上报策略 |
|------|------|------|---------|
| click_target | string | 点击目标标识（区分同模块/元素内不同按钮） | P0 必报 |

> 一个模块/元素的 click 事件，用 `click_target` 枚举值区分内部所有可点击项，而非每个按钮建一个事件。

### 7.4 弹窗 display 事件

| 属性 | 类型 | 说明 | 上报策略 |
|------|------|------|---------|
| popup_type | string | 弹窗类型标识 | P0 必报 |
| popup_source | string | 触发来源（什么操作/条件唤起了弹窗） | P0 必报 |

### 7.5 弹窗 click/close 事件

| 属性 | 类型 | 说明 | 上报策略 |
|------|------|------|---------|
| click_target | string | 弹窗内操作 | P0 必报 |

click_target 必须包含关闭方式枚举：`close`（按钮关闭）/ `mask_close`（点击蒙版）/ `auto_close`（超时自动关闭）

### 7.6 动作结果反馈（通过 click 事件 + 结果属性实现）

当用户操作有异步结果（支付/领取/签到/解锁等），使用 click 事件搭配以下结果属性：

| 属性 | 类型 | 说明 | 上报策略 |
|------|------|------|---------|
| action_type | string | 动作类型 enum {pay/claim/unlock/subscribe/check_in} | P0 必报 |
| result | string | 结果 enum {success/fail} | P0 必报 |
| fail_reason | string | 失败原因（仅 fail 时上报） | P1 fail时必报 |
| result_detail | string | 结果详情（如奖励类型/金额，仅 success 时） | P1 success时建议 |

> 说明：得谱平台没有独立的 "result" action 类型。动作结果统一通过 click 事件上报，靠 action_type + result 属性区分是"触发操作"还是"结果反馈"。

---

## 八、标准事件链路

### 8.1 活动业务标准事件链路

```
{功能}_display → {功能}_click → {功能}_click(结果反馈)
     曝光            交互操作        动作结果（属性区分）
```

活动中所有"关闭"和"结果"统一归入 click 事件，靠属性区分：
- 关闭：click_target = close / mask_close / auto_close
- 结果：click 事件 + action_type + result 属性

典型场景的事件链路：

| 模块类型 | 事件链路 | 说明 |
|---------|---------|------|
| 纯展示模块（头图/Banner） | display → click | click_target区分不同按钮 |
| 功能交互模块（签到/任务） | display → click(操作) → click(结果) | 结果click带action_type+result |
| 支付转化模块（SKU/开通） | display → click(操作) → click(结果) | action_type=pay |
| 弹窗（引导/拦截/奖励） | display → click | click_target含close枚举 |
| 信息输入模块（表单/选择） | display → click | click_target含confirm/cancel |

### 8.2 常见弹窗类型与事件链

| popup_type | 场景 | popup_source 示例 | 典型 click_target |
|-----------|------|------------------|------------------|
| first_visit | 首访引导弹窗 | page_load | skip / confirm / close |
| identity_block | 身份拦截弹窗 | login_check | switch_account / close / redirect |
| reward | 奖励发放弹窗 | check_in / task_complete / unlock | view_rewards / close |
| confirm | 二次确认弹窗 | delete_click / submit_click | confirm / cancel |
| tool_invoke | 工具调用弹窗 | tool_card_click | use_tool / go_download / close |
| payment | 支付相关弹窗 | sku_click | pay / cancel |
| calendar | 月历/日历弹窗 | calendar_button_click | switch_month / select_day / close |
| form | 表单编辑弹窗 | add_click / edit_click | confirm / cancel |

---

## 九、配置驱动属性判断标准

活动内容大量由运营后台配置，判断是否需要作为属性上报：

### 9.1 应上报的配置值

| 配置内容 | 上报理由 | 属性名示例 |
|---------|---------|-----------|
| SKU ID / 商品名称 | 分析哪个商品转化率高 | sku_id / sku_name |
| 奖励类型 / 金额 | 分析哪种奖励激励效果好 | reward_type / reward_amount |
| 功能点名称 / 序号 | 分析哪个功能体验路径更优 | func_name / func_index |
| ~~跳转链接目标~~ | 不上报：跳转目标由运营后台配置控制，属于实现细节，不是分析维度 | — |
| 考试类型 / 活动主题 | 分析不同主题的参与度 | exam_type / theme |
| 优惠类型（新人价/续费价） | 分析不同定价策略效果 | offer_type |

### 9.2 不应上报的配置值

| 配置内容 | 不上报理由 |
|---------|-----------|
| 跳转链接 / 目标页URL | 由运营配置控制的实现细节，不是分析维度 |
| 背景图URL | 纯展示，不影响运营决策 |
| 按钮颜色 / 圆角 / 动画 | 样式类，非业务数据 |
| 布局 / 间距细节 | 视觉设计范畴 |
| 纯装饰性配置 | 无分析价值 |
| 规则说明文案 | 静态内容 |

### 9.3 判断原则

**核心问题**：这个配置值的变化是否会影响运营决策？
- 是 → 上报为属性
- 否 → 不报

---

## 十、活动时效属性

活动有生命周期，以下属性按场景添加：

| 属性 | 类型 | 适用场景 | 上报策略 |
|------|------|---------|---------|
| activity_phase | string | 同活动有多期（如618预热/正式/返场） | P1：多期活动必报 |
| visit_sequence | int | 需分析首访vs复访行为差异 | P2：按需添加 |
| check_in_day | int | 签到/打卡类活动（连续第N天） | P1：签到类必报 |
| remaining_hours | int | 需分析倒计时对行为的影响 | P2：按需添加 |
| experiment_id | string | AB实验场景 | P1：有实验时必报 |
| experiment_group | string | AB实验分组 | P1：有实验时必报 |

---

## 十一、漏斗设计规范

每个活动方案**必须**定义以下4类漏斗中的至少2个：

| 漏斗类型 | 标准步骤模板 | 回答的运营问题 |
|---------|------------|-------------|
| 触达漏斗 | 页面 display → 核心模块 display → 首个 click | 有多少人真正"看到"了活动 |
| 参与漏斗 | 核心玩法 display → 玩法 click → click(result=success) | 参与率和完成率 |
| 转化漏斗 | 支付模块 display → SKU click → click(action_type=pay, result=success) | 付费转化率 |
| 回访漏斗 | 首访 display → 次日 display → 第N日 display | 活动粘性/留存 |

---

## 十二、活动页面状态分支设计

PRD中的多状态场景必须用属性区分。常见模式与属性设计：

| PRD中的描述 | 属性设计方案 |
|------------|------------|
| "未登录/已登录展示不同内容" | display 事件的公共属性 is_login 自动区分 |
| "企业用户弹窗拦截" | 拦截弹窗作为独立模块，display 独立追踪 |
| "新人/老客展示不同SKU" | display 带 user_group + offer_type |
| "未完成/已完成任务样式不同" | display 带 task_status enum {todo/done} |
| "未解锁/已解锁/已领取" | display 带 item_status enum {locked/unlocked/claimed} |
| "首次访问/非首次访问" | display 带 visit_type enum {first_visit/returning} |
| "登录后判断是否新人" | 首访弹窗独立追踪 + user_group 属性 |

**枚举可达性规则**：属性的枚举值只包含该事件实际可触发时的状态。例如：
- 礼包有 locked/unlocked/claimed 三态，但 locked 时不可点击
- 所以 click 事件的 item_status 枚举只能是 {unlocked/claimed}
- display 事件可以包含全部三种

---

## 十三、事件设计速查表

| PRD中的描述 | 事件设计 |
|------------|---------|
| "页面展示/进入页面/打开页面" | 页面级 display + user_status + first_entry |
| "模块曝光/出现在视口" | 模块级 display + 模块当前状态属性 |
| "弹窗展示/弹出/唤起" | display + popup_type + popup_source |
| "点击XX按钮/链接/卡片" | click + click_target 属性枚举 |
| "点击后跳转到XX" | click + click_target（跳转目标由配置控制，不作为埋点属性） |
| "领取奖励/解锁/签到成功" | click + action_type + result=success + result_detail |
| "支付/开通/下单" | click + action_type=pay + result + fail_reason(失败时) |
| "弹窗关闭" | click + click_target=close |
| "X秒后自动跳转/关闭" | click + click_target=auto_close |
| "未登录点击→调起登录" | click + click_target=login（公共属性 is_login=false 已标识） |
| "展示不同状态（解锁/未解锁）" | display + item_status enum |
| "运营可配置的SKU/奖励" | display/click 带 sku_id / reward_type |
| "鼠标悬浮显示详情" | hover + 悬浮内容属性 |
| "擦除/滑动/长按等非常规交互" | click（click是所有主动交互的统称）+ click_target 描述具体交互 |
| "模块有登录按钮蒙版" | click + click_target=login（模块处于蒙版态时仅此一个目标） |

---

## 十四、禁止行为

| 禁止行为 | 原因 |
|---------|------|
| 生成得谱平台未定义的 action 类型（如 close/result/submit 等） | 平台统一口径，只允许 display/click/stay/load/hover |
| 为每个按钮单独建事件 | 应合并为一个click事件 + click_target属性 |
| 自行编造不在PRD中的属性 | 属性必须有业务依据 |
| 将 UI 不可达的状态写入事件枚举 | 枚举可达性规则 |
| 单事件超过8个自定义属性 | 事件应拆分 |
| 只记录动作不记录结果 | 有动作必有结果原则 |
| 上报纯样式/装饰性配置值 | 无分析价值 |
| 添加 target_page / jump_url 类跳转目标属性 | 跳转目标由运营配置控制，属于实现细节而非分析维度 |
| 遗漏核心漏斗定义 | 每个方案至少2个漏斗 |
