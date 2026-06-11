# 外部合作业务埋点规范

> 本规范是通用位置模型规范（SKILL.md）的**业务补充**，仅定义外部合作场景的特殊约定。
> 通用规范中的核心概念、执行流程、交互原则等仍然适用，本文不重复。

## 适用范围

涉及**外部渠道合作**的埋点需求，包括但不限于：
- 渠道拉端 / 唤端合作（如网易云、中公教育）
- 联合会员权益领取（如 B 站联合会员）
- 落地页投放与下载引导
- 跨平台授权登录

## 一、功能标识命名补充

在通用规范 `{功能标识}_{业务动作}` 基础上，外部合作场景的 `feature_id` 建议格式：

| 合作类型 | feature_id 示例 | 说明 |
|---------|----------------|------|
| 渠道拉端 | `channel_netease`、`channel_zhonggong` | `channel_{合作方简称}` |
| 联合会员 | `joint_bilibili`、`joint_netease` | `joint_{合作方简称}` |
| 投放落地页 | `landing_exam`、`landing_cloud` | `landing_{场景关键词}` |

## 二、外部合作必备公共属性

以下属性在外部合作场景中**必须作为公共属性**上报，所有事件均需携带：

| 属性名 | 中文名 | 类型 | 说明 | 示例值 |
|--------|--------|------|------|--------|
| `channel` | 合作渠道 | string | 合作方标识，全局统一 | `netease_cloud`、`zhonggong`、`bilibili` |
| `campaign_id` | 活动标识 | string | 本次合作活动的唯一标识 | `2024Q2_netease_swap` |
| `traffic_source` | 流量来源 | string | 用户从哪个入口进入 | `deeplink`、`qrcode`、`banner`、`push` |
| `is_new_user` | 是否新用户 | boolean | 是否为 WPS 新增用户 | `true` / `false` |

## 三、典型页面结构模板

外部合作场景通常包含以下标准页面，设计时优先套用：

### 3.1 落地页（Landing Page）

```
页面：landing_page
├── 模块：hero_banner        ← 头图/核心卖点区
├── 模块：download_section   ← 下载引导区
│   └── 元素：download_btn   ← 下载按钮（可能多端：pc_btn / mobile_btn）
├── 模块：benefit_preview    ← 权益预览区
└── 模块：footer_info        ← 底部信息/协议
```

### 3.2 权益领取页（Benefit Claim Page）

```
页面：benefit_page
├── 模块：auth_section       ← 授权/验证区（手机号验证 or OAuth）
├── 模块：benefit_list       ← 权益列表展示
│   └── 元素：benefit_card   ← 单个权益卡片
├── 模块：claim_section      ← 领取操作区
│   └── 元素：claim_btn      ← 领取按钮
└── 模块：result_section     ← 领取结果展示
```

### 3.3 唤端中间页（Bridge Page）

```
页面：bridge_page
├── 模块：redirect_section   ← 跳转引导区
├── 模块：fallback_section   ← 兜底下载区（未安装场景）
│   └── 元素：install_btn    ← 安装引导按钮
└── 模块：loading_section    ← 加载等待区
```

## 四、外部合作专属事件

除通用规范的 display/click/hover 外，外部合作场景需要关注以下**业务事件**：

| 事件动作 | 触发场景 | 事件名示例 | 层级 |
|---------|---------|-----------|------|
| `download` | 用户点击下载按钮触发下载 | `{fid}_download` | 元素级 |
| `install` | 客户端安装完成首次打开 | `{fid}_install` | 页面级 |
| `deeplink_open` | 通过 deeplink 唤起客户端 | `{fid}_deeplink_open` | 页面级 |
| `authorize` | 用户完成第三方授权登录 | `{fid}_authorize` | 模块级 |
| `claim` | 用户领取权益 | `{fid}_claim` | 元素级 |
| `activate` | 用户激活/使用领取的权益 | `{fid}_activate` | 元素级 |

### 事件属性约定

**download 事件**必须携带：
- `download_type`：`pc` / `mobile` / `mac`
- `download_source`：触发下载的具体位置

**authorize 事件**必须携带：
- `auth_method`：`phone_sms` / `oauth_{平台}` / `qrcode`
- `auth_result`：`success` / `fail` / `cancel`
- `fail_reason`（仅 fail 时）：`timeout` / `denied` / `network_error`

**claim 事件**必须携带：
- `benefit_type`：权益类型，如 `vip_7d` / `super_vip_30d` / `storage_5g`
- `benefit_id`：权益唯一标识
- `claim_result`：`success` / `fail` / `already_claimed`

## 五、核心漏斗

外部合作场景**必须**定义以下漏斗，用于评估转化效率：

### 5.1 渠道拉端漏斗

```
落地页展示 → 点击下载 → 下载完成 → 首次打开 → 注册/登录 → 权益领取
```

对应事件链：
```
{fid}_display(landing_page) → {fid}_download → {fid}_install → {fid}_display(benefit_page) → {fid}_authorize → {fid}_claim
```

### 5.2 唤端漏斗

```
唤端链接点击 → 客户端打开 → 目标页展示 → 核心操作
```

对应事件链：
```
{fid}_deeplink_open → {fid}_display(target_page) → {fid}_click(core_action)
```

### 5.3 联合会员漏斗

```
活动页展示 → 授权登录 → 权益展示 → 权益领取 → 权益激活
```

## 六、属性提取特殊规则

在通用规范的属性提取策略基础上，外部合作场景额外关注：

| PRD 内容 | 属性提取 | 优先级 |
|---------|---------|--------|
| 合作方信息（渠道名、合作方 ID） | `channel`、`partner_id` | 必须 |
| 渠道包 / deeplink 参数 | `deeplink_params`、`channel_code` | 必须 |
| 权益类型和规格 | `benefit_type`、`benefit_duration` | 必须 |
| A/B 实验分组 | `ab_group`、`experiment_id` | 如有则必须 |
| 用户来源平台身份 | `partner_uid`、`partner_vip_status` | 如有则推荐 |
| 兜底策略（未安装 / 已安装） | `app_installed` 布尔属性 | 推荐 |
| 多端适配（PC / 移动 / H5） | `platform`、`device_type` | 必须 |

## 七、命名规范补充

### 页面命名

外部合作场景的页面命名遵循 `{场景}_{页面类型}` 模式：
- `landing_page` — 落地页
- `benefit_page` — 权益领取页
- `bridge_page` — 唤端中间页
- `success_page` — 成功结果页
- `auth_page` — 授权登录页

### 属性枚举值

涉及合作方的枚举值统一使用**小写英文简称**：
- 网易云音乐 → `netease_cloud`
- 中公教育 → `zhonggong`
- B 站 → `bilibili`
- 哔哩哔哩漫画 → `bilibili_comic`

## 八、输出检查清单

外部合作埋点方案在最终输出前，额外检查：

- [ ] 是否包含完整的渠道拉端/唤端漏斗定义
- [ ] 公共属性是否包含 `channel`、`campaign_id`、`traffic_source`、`is_new_user`
- [ ] 下载/安装/授权/领取等关键转化事件是否齐全
- [ ] 授权事件是否区分了 `auth_method` 和 `auth_result`
- [ ] 权益领取是否记录了 `benefit_type` 和 `claim_result`
- [ ] 多端场景是否通过 `platform` / `device_type` 区分
- [ ] deeplink 参数是否作为属性上报
- [ ] 兜底场景（未安装 APP）是否有独立的事件覆盖
