# 埋点方案示例

基于【PC】新人专区 PRD 生成的埋点方案（节选），展示从 PRD 到埋点方案的转化过程。

## 功能基本信息

| 字段 | 值 |
|------|-----|
| 应用归属 | WPS Office |
| 业务归属 | 增值业务 |
| 应用终端 | PC端 |
| 功能名称 | 公共运营_新人专区 |
| 功能标识 | newbie_zone |
| 埋点点位类型 | 位置模型 |

## 页面-模块-元素结构树

> PRD 2.2 节列出页面清单，3.1-3.7 节按模块展开需求详情。

```
公共运营_新人专区 (newbie_zone)
├── 新人专区主页 (main_page)
│   ├── [页面级事件]
│   ├── 首屏身份判定弹窗 (identity_popup)         ← PRD 3.1
│   │   ├── 登录按钮 (login_btn)
│   │   ├── 切换账户按钮 (switch_account_btn)
│   │   └── 跳转福利中心按钮 (redirect_btn)
│   ├── 头图模块 (header_banner)                   ← PRD 3.2
│   │   ├── 用户信息区 (user_info)
│   │   ├── 消息轮播条 (message_carousel)
│   │   ├── 规则按钮 (rule_btn)
│   │   └── 奖励按钮 (reward_btn)
│   ├── 功能体验区 (experience_zone)               ← PRD 3.3
│   │   ├── 地图碎片 (map_piece)
│   │   └── 新人礼包 (gift_pack)
│   ├── 特色功能介绍 (feature_intro)               ← PRD 3.4
│   │   └── 查看权益链接 (view_rights_link)
│   ├── 会员免费试用 (free_trial)                  ← PRD 3.5
│   ├── 新人专享优惠 (newbie_offer)                ← PRD 3.6
│   │   └── SKU卡片 (sku_card)
│   └── 底部引流Banner (bottom_banner)             ← PRD 3.7
│       └── Banner图片 (banner_img)
├── 功能体验弹窗 (experience_popup)
│   ├── [页面级事件]
│   ├── 功能介绍区 (func_intro)
│   └── 去体验按钮 (try_btn)
└── 我的奖品页 (reward_page)
    ├── [页面级事件]
    ├── 优惠券奖品 (coupon_item)
    ├── 会员权益奖品 (vip_item)
    └── 勋章奖品 (medal_item)
```

## 公共属性

| 属性名 | 中文名 | 类型 | 属性值 | PRD依据 |
|--------|--------|------|--------|---------|
| position | 入口来源 | string | direct(直接访问) / push(推送) / banner(Banner引流) / deeplink(外部链接) | 用户从不同渠道进入新人专区 |

## 埋点明细（节选）

### 页面：新人专区主页 (main_page)

#### 页面级事件

| 事件名 | 动作 | 触发时机 | 自定义属性 | PRD依据 |
|--------|------|---------|-----------|---------|
| newbie_zone_display | display | 新人专区主页展示 | user_status(用户身份状态) | 页面加载完成 |

---

#### 模块：首屏身份判定弹窗 (identity_popup) ← PRD 3.1

**模块级事件**

| 事件名 | 动作 | 触发时机 | 自定义属性 | PRD依据 |
|--------|------|---------|-----------|---------|
| newbie_zone_display | display | 弹窗展示 | popup_type(弹窗类型) | 3.1 已登录-企业/非新人时弹窗拦截 |

**元素级事件**

| 元素 | 事件名 | 动作 | 触发时机 | 自定义属性 | PRD依据 |
|------|--------|------|---------|-----------|---------|
| 登录按钮 (login_btn) | newbie_zone_click | click | 未登录用户点击登录 | — | 3.1 点击按钮唤起登录流程 |
| 切换账户按钮 (switch_account_btn) | newbie_zone_click | click | 企业用户点击切换账户 | — | 3.1 点击切换为个人账户 |
| 跳转福利中心按钮 (redirect_btn) | newbie_zone_click | click | 非新人点击跳转 | redirect_type(auto/manual) | 3.1 点击跳转/3秒自动跳转 |

---

#### 模块：功能体验区 (experience_zone) ← PRD 3.3

**模块级事件**

| 事件名 | 动作 | 触发时机 | 自定义属性 | PRD依据 |
|--------|------|---------|-----------|---------|
| newbie_zone_display | display | 功能体验区曝光 | completed_count(已完成数), total_count(总数) | 3.3 功能地图展示 |

**元素级事件**

| 元素 | 事件名 | 动作 | 触发时机 | 自定义属性 | PRD依据 |
|------|--------|------|---------|-----------|---------|
| 地图碎片 (map_piece) | newbie_zone_click | click | 点击地图碎片 | piece_name(碎片名称), piece_index(碎片序号), is_completed(是否已点亮) | 3.3 点击单个地图碎片唤起功能体验弹窗 |
| 地图碎片 (map_piece) | newbie_zone_display | display | 地图碎片曝光 | piece_name, piece_index, is_completed | 3.3 地图区域展示 |
| 新人礼包 (gift_pack) | newbie_zone_click | click | 点击新人礼包 | pack_status(locked/unlocked_unclaimed/claimed) | 3.3 新人礼包点击领取/查看 |

---

#### 模块：新人专享优惠 (newbie_offer) ← PRD 3.6

**模块级事件**

| 事件名 | 动作 | 触发时机 | 自定义属性 | PRD依据 |
|--------|------|---------|-----------|---------|
| newbie_zone_display | display | 优惠模块曝光 | offer_type(newbie_price/renewal_price) | 3.6 根据用户是否开通切换模块 |

**元素级事件**

| 元素 | 事件名 | 动作 | 触发时机 | 自定义属性 | PRD依据 |
|------|--------|------|---------|-----------|---------|
| SKU卡片 (sku_card) | newbie_zone_click | click | 点击开通/续费按钮 | sku_id, sku_name(商品名), offer_type, price(价格) | 3.6 点击立即开通/续费按钮唤起支付 |
| SKU卡片 (sku_card) | newbie_zone_display | display | SKU卡片曝光 | sku_id, sku_name, offer_type, price | 3.6 SKU展示 |

---

### 页面：功能体验弹窗 (experience_popup)

#### 页面级事件

| 事件名 | 动作 | 触发时机 | 自定义属性 | PRD依据 |
|--------|------|---------|-----------|---------|
| newbie_zone_display | display | 功能体验弹窗展示 | func_name(功能名称), func_index(功能序号) | 3.3 点击碎片唤起弹窗 |

#### 元素级事件

| 元素 | 事件名 | 动作 | 触发时机 | 自定义属性 | PRD依据 |
|------|--------|------|---------|-----------|---------|
| 去体验按钮 (try_btn) | newbie_zone_click | click | 点击去体验 | func_name, func_index, is_completed(是否已完成), task_type(任务类型) | 3.3 点击去体验按钮跳转功能页 |

## 自定义属性汇总

| 属性名 | 中文名 | 类型 | 枚举值 | PRD依据 |
|--------|--------|------|--------|---------|
| user_status | 用户身份状态 | string | not_logged_in / enterprise / personal_new / personal_old | 3.1 四种身份状态 |
| popup_type | 弹窗类型 | string | enterprise_redirect / non_newbie_redirect | 3.1 两种拦截弹窗 |
| redirect_type | 跳转方式 | string | auto(自动) / manual(手动点击) | 3.1 3秒自动跳转或点击跳转 |
| piece_name | 碎片名称 | string | 动态值 | 3.3 功能地图碎片 |
| piece_index | 碎片序号 | int | 1-6 | 3.3 功能点总个数6个 |
| is_completed | 是否已完成 | boolean | true / false | 3.3 用户是否已点亮该碎片 |
| pack_status | 礼包状态 | string | locked / unlocked_unclaimed / claimed | 3.3 未解锁/已解锁未领取/已领取 |
| completed_count | 已完成功能数 | int | 0-6 | 3.3 已点亮碎片数 |
| total_count | 功能总数 | int | 6 | 3.3 功能点总个数 |
| func_name | 功能名称 | string | 动态值（如PDF转Word） | 3.3 单个功能点名称 |
| func_index | 功能序号 | int | 1-6 | 3.3 功能点顺序 |
| task_type | 任务类型 | string | 动态值 | 3.3 关联任务类型 |
| offer_type | 优惠类型 | string | newbie_price(新人价) / renewal_price(续费价) | 3.6 根据是否已开通切换 |
| sku_id | 商品ID | string | 动态值 | 3.6 SKU配置 |
| sku_name | 商品名称 | string | 动态值 | 3.6 SKU配置 |
| price | 价格 | float | 动态值 | 3.6 商品价格 |

## 结构化 JSON 示例（tracking-result.json）

以下是与上述 Markdown 方案对应的 `tracking-result.json`（节选前 5 个事件）：

```json
{
  "summary": "公共运营_新人专区埋点方案：3页面9模块16元素，共30个埋点事件",
  "conventions": {
    "eventNaming": "newbie_zone_{action}，同功能共享事件名，靠位置属性区分具体点位",
    "paramNaming": "snake_case，语义明确，枚举值用英文小写"
  },
  "commonParams": [
    { "name": "position", "type": "string", "required": false, "description": "入口来源" }
  ],
  "events": [
    {
      "eventId": "newbie_zone_display_main_page",
      "eventName": "新人专区主页展示",
      "page": "main_page",
      "trigger": "页面加载完成",
      "timing": "display",
      "priority": "P0",
      "params": [{ "name": "user_status", "type": "string", "required": true, "description": "用户身份状态", "example": "personal_new" }]
    },
    {
      "eventId": "newbie_zone_click_login_btn",
      "eventName": "点击登录按钮",
      "page": "main_page",
      "trigger": "未登录用户点击登录",
      "timing": "click",
      "priority": "P0",
      "params": []
    },
    {
      "eventId": "newbie_zone_click_sku_card",
      "eventName": "点击立即开通/续费",
      "page": "main_page",
      "trigger": "点击开通/续费按钮唤起支付",
      "timing": "click",
      "priority": "P0",
      "params": [
        { "name": "sku_id", "type": "string", "required": true, "description": "商品ID", "example": "sku_001" },
        { "name": "price", "type": "float", "required": true, "description": "商品价格", "example": "9.9" }
      ]
    }
  ],
  "funnels": [
    { "name": "功能体验到礼包领取", "steps": ["newbie_zone_display_experience_zone", "newbie_zone_click_map_piece", "newbie_zone_click_gift_pack"] },
    { "name": "页面访问到付费转化", "steps": ["newbie_zone_display_main_page", "newbie_zone_click_sku_card"] }
  ],
  "gaps": ["PRD未说明会员免费试用模块的具体点击交互"]
}
```

**注意**：完整 JSON 应包含所有事件（对应 Markdown 方案中每一行事件），此处仅展示 3 个事件作为结构示范。
