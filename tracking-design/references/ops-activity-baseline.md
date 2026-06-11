# 运营活动组件埋点基线

> 本文件记录所有魔方组件的**现有埋点定义**，作为增量设计的基线参考。
> 新 PRD 修改某个组件时，先从本文件加载该组件的基线，再只输出变更部分。
>
> 数据来源：营销活动埋点总表（Excel）
> 最后更新：2026-05-27

---

## 通用公共组件

### 头图 banner 组件

**展示事件** (`show_rubikwindow`)：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `banner` | 头图展示 | — |
| `share_button` | 分享按钮展示 | — |
| `rule_button` | 规则按钮展示 | — |
| `refresh_button` | 刷新按钮 | — |

---

### 支付组件

**展示事件** (`show_rubikwindow`)：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `topitem_1` | SKU1-大卡展示/tab1展示 | — |
| `topitem_2` | SKU2-小卡展示/tab2展示 | — |
| `topitem_3` | SKU3-小卡展示/tab3展示 | — |
| `coupon_1` | 优惠券展示 | — |
| `coupon_2` | 积分抵现展示 | 无积分时积分引导文案不算展示 |
| `sku_locked_show` | 待解锁状态展示 | 无该状态则不上报 |

> 说明：根据不同上样式，对应一套展示埋点。

---

### 秒杀组件

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `limit_buy` | 秒杀模块展示 | tab 不支持切换，上报到一个字段即可 |

---

### 抽奖组件

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `lottery_type_tab1` | tab1 展示 | 无 tab 时上报到 tab1；`type`=draw（次数抽奖）、point（积分抽奖）、hybrid（混合抽奖） |
| `lottery_type_tab2` | tab2 展示 | — |
| `lottery_type_tab3` | tab3 展示 | — |
| `pop_style_show` | 中奖弹窗展示 | `style` 替换为具体的中奖奖品类型（如优惠券） |

---

### 权益图 banner

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `qyt_1` ~ `qyt_6` | 权益图 1~6 展示 | 有几张图埋几个点，从左到右顺序上报 |

---

### 倒计时组件

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `countdown` | 倒计时展示 | — |

---

### 下飘支付组件

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `bottomitem_1` | 底部下飘展示 | — |
| `member_name` | 会员名称 | 上报展示的会员名称 |

**点击事件** (`click_rubikbtn`)：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `bottomitem` | 底部下飘点击 | — |

---

### 底部下飘组件【H5】

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `bottomitem` | 底部下飘展示 | — |

**点击事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `member_name_click` | 按钮点击 | 格式如 `member_做任务赚积分_click`、`member_花积分_click` |
| `sender_share_pop_click` | 赠送者分享方式弹窗点击 | data1=exclusive（专属礼包）、group（群发好友） |
| `member_wzl_click` | 文字链点击 | — |

---

### 小程序订阅组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `subscribe` | 红包过期订阅展示 | — |

---

### 红包列表展示组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `packet_list` | 红包展示 | 直接上报具体的红包 id |

---

### 底部引导文案组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `button_1` | 按钮 1 展示 | 有几个按钮上报几个（支持 1~3 个） |
| `button_2` | 按钮 2 展示 | — |
| `button_3` | 按钮 3 展示 | — |

---

### 红包领取组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `packet_receive` | 红包展示 | data1: 1=展示, 2=领取 |

---

### 流量位 banner 组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `main_activity_banner` | 主会场活动入口展示 | — |

---

### 弹窗组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `dialog_show` | 弹窗展示 | 上报弹窗的类型 |
| `dialog_button_show` | 弹窗按钮展示 | — |

---

### 图片组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `photo` | 图片展示 | — |

---

### 限时积分兑换组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `limit_integral` | 商品展示 | — |
| `integral_less` | 积分不足弹窗展示 | — |
| `integral_enough` | 兑换达上限弹窗展示 | — |

---

### 会员信息展示组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `member` | 会员信息展示 | — |

---

### 身份组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `identity_show` | 卡片展示 | — |

---

### 福利领取组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `equity_show_card` | 权益展示 | `equity_show_1`，按照从左到右的顺序，1 代表第一个 |

---

### 引导指南组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `task_list` | 指南列表展示 | `task_1`，代表从上到下第一个指南 |

---

### 认证页组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `act_verify` | 认证页展示 | — |

---

### 续订获赠信息组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `show` | 展示 | — |

---

### 权益发放组件

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `equity_show` | 展示 | — |
| `equity_pop_type_show` | 领取弹窗展示 | `type`=modal（主动弹出领取弹窗）、confirm（确认手机号弹窗）、reject（不满足领取条件弹窗）、unbound（未绑定手机号弹窗）、success（领取成功）、fail（领取失败） |

---

### 权益发放弹窗组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `pop_show` | 弹窗展示 | — |
| `pack_id` | 人群包 id | 上报命中的人群包 id |

---

### 订阅组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `subscribe_show` | 展示 | — |

---

### 签约订单新展示组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `show` | 展示 | — |

---

### 折扣弹窗组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `discount_show` | 领取折扣弹窗展示 | — |

---

### 组队裂变组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `show` | 车队展示 | — |

---

### 周年庆奖励组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `reward_show` | 页面展示 | — |

---

### 周年礼领取组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `reward_pop_show` | 领取弹窗展示 | — |

---

### 实物礼盒领取组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `gift_show` | 展示 | — |

---

### 底部固定菜单组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `bar_show` | 展示 | — |

---

### 收货地址弹窗组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `address_show` | 弹窗展示 | — |

---

### 扫码挽留组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `scan_show` | 展示 | — |

---

## 学生认证相关组件

### 学生认证支付组件

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `topitem_1` | tab1 展示 | — |
| `topitem_2` | tab2 展示 | — |
| `topitem_3` | tab3 展示 | — |
| `verify` | 学生认证弹窗展示 | — |
| `inContract` | 已有签约商品弹窗展示 | — |
| `toggleAccount` | 企业用户弹窗展示 | — |
| `qyt_tab` | 权益图卡片标识 | `qyt_1_1`：第一个数字代表 tab，第二个数字代表权益图卡片 |

### 学生认证头部登录组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `banner` | banner 展示 | — |
| `official_button` | 去认证按钮展示 | — |
| `follow_button` | 已认证按钮展示 | — |

---

## 权益对比页组件

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `comparison_show` | 权益展示 | position=privilege_detail（pc会员官网）、more（pc收银台）、mac_see_rights / pc_see_rights（个人中心-商品卡入口）、mac_compare / pc_compare（个人中心-商品名称入口）、mac_sku_detail / pc_sku_detail（个人中心-左侧个人权益） |
| `comparison_hide` | 页面关闭 | position=同上；data1=页面停留时长（时间戳 - 秒） |
| `comparison_read_finish` | 阅读完成标识 | position=同上 |

---

## 分 tab 组件

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `type_order_click` | tab 展示 | `type_1`，按照从左到右的顺序，1 代表第一个展示 |
| `card_order_type_click` | 卡片展示 | order=1/2/3（1=日历卡片，2=四宫格ai卡片，3=三宫格简历卡片）；type=1/2/3/4 |

---

## 预热订阅邀请组件

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `tab_num_show` | tab 展示 | 按照从左到右依次 1、2、3，如 `tab_1_show` |
| `share_show` | 分享部分展示 | — |
| `pop_show` | 订阅弹窗展示 | — |

---

## 升级支付组件

### H5 端

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `level_card_order_show` | 卡片展示 | `order` 替换成具体卡片顺序，从上到下依次 1、2、3 |
| `undertake_show` | 兜底图展示 | — |
| `pack_id` | 人群包 id | 上报命中的人群包 id |
| `upgrade_pay_show_h5` | 升级支付组件展示 | data1=1（单卡样式）、2（横条样式）；data2=unauth/unpurchase/purchased/not_matched；data3=升级前 sku；data4=升级目标 sku；data5=升级月数 |
| `upgrade_pay_success_show_h5` | 升级支付成功弹窗展示 | data1=1/2（样式）；data2=升级前 sku；data3=升级目标 sku；data4=升级月数 |

**点击事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `upgrade_pay_click_h5` | 支付按钮点击 | data1=1/2（样式）；data2=unauth/unpurchase/purchased；data3=升级前 sku；data4=升级目标 sku；data5=升级月数 |
| `upgrade_pay_coupon_click_h5` | 优惠券使用点击 | data1=1/2；data2=unpurchase/purchased；data3=升级前 sku；data4=升级目标 sku；data5=升级月数；data6=use/cancel |
| `upgrade_pay_success_click_h5` | 支付成功按钮点击 | data1=1/2；data2=升级前 sku；data3=升级目标 sku；data4=升级月数 |

### PC 端

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `upgrade_pay_show_pc` | 升级支付组件展示 | data1=unauth/unpurchase/purchased/not_matched；data2=升级前 sku；data3=升级目标 sku；data4=升级月数 |
| `upgrade_pay_success_show_pc` | 升级支付成功弹窗展示 | data1=升级前 sku；data2=升级目标 sku；data3=升级月数 |

**点击事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `upgrade_pay_click_pc` | 支付按钮点击 | data1=unauth/unpurchase/purchased；data2=升级前 sku；data3=升级目标 sku；data4=升级月数 |
| `upgrade_pay_coupon_click_pc` | 优惠券使用点击 | data1=unpurchase/purchased；data2=升级前 sku；data3=升级目标 sku；data4=升级月数；data5=use/cancel |
| `upgrade_pay_success_click_pc` | 支付成功按钮点击 | data1=升级前 sku；data2=升级目标 sku；data3=升级月数 |

> 注意：H5 端 data 字段比 PC 端多一个 data1（样式），导致后续字段编号错位。

---

## 多 sku 秒杀组件

### H5 端

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `session_order_show` | 场次展示 | `order` 从左到右依次 1、2、3，如 `session_2_show` 代表 tab2 |
| `free_button_show` | 赠品弹窗展示 | — |

### PC 端

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `pc_session_order_show` | 场次展示 | 同 H5，加 `pc_` 前缀 |
| `pc_free_button_show` | 赠品弹窗展示 | — |

---

## 分享好友领取权益组件

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `share_reward_show_type` | 分享领取权益组件（分享方） | `type` 替换：entry（主动进入）、share（好友分享图片打开） |
| `share_limit_popup_type` | 分享已达上限弹窗 | `type` 同上 |
| `help_limit_popup_type` | 助力已达上限弹窗 | `type` 同上 |
| `reward_pic_save_type` | 图片保存页 | `type` 同上 |

---

## 免单兑换组件

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `free_coupon_show` | 免单兑换展示 | — |

---

## 图片展示组件（PC）/ 轮播图

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `benefit_type_show` | 权益展示 | `type` 按照从左到右的顺序替换，1 代表第一个展示，如 `benefit_1_show` |

---

## 分享领取权益组件

### PC 端 / 通用

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `share_button_type_show` | 分享按钮展示 | `type` 按对应状态替换：状态1=首次分享；状态2=非首次且可有分享次数；状态3=无分享次数 |

---

## 分享后支付组件（PC）

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `sku_locked_show` | 待解锁状态展示 | — |
| `sku_card_show` | 商品卡片展示 | `card` 从左到右替换，如 `sku_1_show` |
| `sku_card_coupon_show` | 优惠券展示 | `card`、`coupon` 从左到右替换，如 `sku_1_1_show` |
| `points_show` | 积分展示 | — |

---

## 积分兑换瀑布流组件（H5）

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `gift_list` | 商品列表展示 | data1=商品列表定位（全部、办公、会员等） |
| `lucky_list` | 我的礼品页展示 | — |
| `int_record` | 我的积分页展示 | — |
| `details` | 详情页展示 | data3=商品 ID；data4=商品名称 |
| `order_page` | 订单确认页展示 | data3=商品 ID；data4=商品名称；data5=from_banner（若用户来源为点击 combo_banner） |
| `int_tips` | 积分临期提醒展示 | — |
| `store_pop` | 确认兑换弹窗展示 | — |
| `int_rule_pop` | 积分规则弹窗展示 | — |
| `fail_pop` | 兑换失败弹窗展示 | data3=商品 ID；data4=商品名称 |
| `suc_pop` | 兑换成功弹窗展示 | data3=商品 ID；data4=商品名称 |
| `not_integral_pop` | 积分不足弹窗展示 | data3=商品 ID；data4=商品名称 |
| `not_rank_pop` | 等级不足弹窗展示 | data3=商品 ID；data4=商品名称 |
| `verify_pop` | 兑换验证弹窗展示 | — |

---

## 瓜分组件

### PC 端

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `award_type_show` | 权益展示 | `type` 从左到右替换，1 代表第一个，如 `award_1_show` |
| `award_pop_show` | 瓜分弹窗 | data3=gfconfirm/gfannounce/gfsucceed/gffail；data4=1（确认）/0（取消）；data5=cycle ID |
| `subscribe_type_show` | 瓜分成功订阅 | data3=按楼层标识上报 position；data4=1/0 |
| `next_pop_show` | 下期预告弹窗展示 | — |

### H5 端

**展示事件**（加 `H5_` 前缀）：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `H5_award_type_show` | 权益展示 | 同 PC |
| `H5_award_pop_show` | 瓜分弹窗 | 同 PC |
| `H5_subscribe_type_show` | 瓜分成功订阅 | 同 PC |
| `H5_next_pop_show` | 下期预告弹窗展示 | — |

---

## 福利中心领取组件

### PC 端

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `free_receive_type_show` | 奖品详情展示 | `type` 从左到右依次 1、2、3，如 `free_receive_1_click` |
| `free_receive_pop_show` | 领取弹窗 | data3=lqconfirm/lqoverlimit；data4=1/0 |
| `subscribe_type_show` | 订阅 | data3=按楼层标识上报 position；data4=1/0 |

### H5 端

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `H5_free_receive_type_show` | 奖品详情展示 | 同 PC |
| `H5_free_receive_pop_show` | 领取弹窗 | 同 PC |
| `H5_subscribe_type_show` | 订阅 | 同 PC |

---

## 三方福利领取组件

### PC 端

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `bd_topitem_1_show` | tab 展示 | `tab_1`，从左到右顺序，1 代表第一个 |
| `bd_pages_1_show` | 页面展示 | `pages_1`，从左到右顺序 |
| `bd_pop_show` | 领取弹窗 | data3=sfconfirm/no_Inventory；data4=1/0 |
| `subscribe_type_show` | 订阅 | data3=按楼层标识上报 position；data4=1/0 |

### H5 端

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `H5_bd_topitem_1_show` | tab 展示 | 同 PC |
| `H5_bd_pages_1_show` | 页面展示 | 同 PC |
| `H5_bd_pop_show` | 领取弹窗 | 同 PC |
| `H5_subscribe_type_show` | 订阅 | 同 PC |

---

## 用户信息组件

### PC 端

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `member_show` | 用户信息展示 | — |
| `member_wzl_show` | 用户信息-文字链展示 | — |

### H5 端（用户权益展示组件）

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `member_show` | 用户信息展示 | — |
| `my_gift_show` | 我的礼品展示 | — |
| `member_wzl_show` | 文字链展示 | — |
| `my_badge_show` | 我的徽章展示 | — |

---

## 签到组件

### PC 端（签到领奖励）

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `award_show` | 签到展示 | — |
| `award_details` | 奖励明细展示 | — |
| `award_months_show` | 奖励月份明细展示 | — |
| `tomorrow_show` | 次日签到展示 | — |
| `sign_window_type_times_show` | 签到弹窗展示【待更新】 | data1=弹窗类型（0=当日签到，1=次日待解锁加码，2=次日加码领取，3=次日带解锁累计，4=当日解锁累计领取，5=累计解锁跳转）；data2=加码次数；data3=天策奖品配置；data4=活动策略 id |
| `tomorrow_button_type_show` | 次日签按钮展示【待更新】 | data1=次日签 tag 展示情况（0=未展示，1=展示） |
| `cumulative_sign_progress_show` | Banner 累计签进度展示 | data1=累计签活动完成状态（1=已完成，2=进行中，3=未开始） |

### H5 端（签到面板组件）

**展示事件**（与 PC 端结构一致）：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `award_show` | 签到展示 | — |
| `award_details` | 奖励明细展示 | — |
| `award_months_show` | 奖励月份明细展示 | — |
| `tomorrow_show` | 次日签到展示 | — |
| `sign_window_type_times_show` | 签到弹窗展示【待更新】 | 同 PC |
| `tomorrow_button_type_show` | 次日签按钮展示【待更新】 | data1=按钮展示情况（0=未展示，1=展示） |
| `cumulative_sign_progress_show` | Banner 累计签活动进度展示 | data1=同 PC |

---

## 任务组件

### PC 端（任务领奖励）

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `task_list_1_name_show` ~ `task_list_6_name_show` | 活动任务 1~6 展示 | `name` 替换为对应任务名称；排序规则从左到右、从上到下；data1=分享平台（0=小红书，1=微博，2=wps社区）；data2=邀请人数；data3=累计任务完成次数 |
| `task_tips_show` | 任务奖励展示文案 | — |
| `task_details_show` | 任务明细展示弹窗 | — |
| `change_button_show` | 换一批按钮展示【待更新】 | — |

### H5 端（任务中心列表组件）

**展示事件**（与 PC 一致，额外包含）：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `task_list_1_name_show` ~ `task_list_6_name_show` | 同 PC | 同 PC |
| `task_tips_show` | 同 PC | — |
| `task_details_show` | 同 PC | — |
| `change_button_show` | 同 PC【待更新】 | — |
| `share_pop_show` | 分享弹窗展示 | data1=分享平台（0=小红书，1=微博，2=wps社区） |
| `card_collect_show` | 推广任务海报展示 | data1=任务 ID；data2=渠道 ID；data3=素材标题 |

---

## 积分兑换【PC】

**展示事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `tab_order_show` | tab 展示 | 从左到右依次替换 `order` 为 1、2、3... |
| `commodity_show` | 商品展示 | — |

---

## 我的奖品

### PC 端

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `coupon_button_show` | 三方券码查看按钮展示 | data1=券码类型 |
| `inner_check_button_show` | 内部去查看按钮展示 | data1=卡券类型 |
| `check_all_show` | 查看全部按钮展示 | — |
| `coupon_dialog_show` | 卡券弹窗展示 | — |

### H5 端

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `H5_coupon_button_show` | 三方券码查看按钮展示 | data1=券码类型 |
| `H5_inner_check_button_show` | 内部去查看按钮展示 | data1=卡券类型 |
| `H5_check_all_show` | 查看全部按钮展示 | — |
| `H5_coupon_dialog_show` | 卡券弹窗展示 | — |

---

## 礼品卡组件【H5】

**点击事件**（完整流程链）：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `gift_card_group_click` | 礼品卡卡面分组点击 | data1=group_id |
| `gift_card_cover_click` | 礼品卡卡面点击 | data1=cover_id |
| `gift_card_sku_type_click` | 礼品卡套餐类型 tab 点击 | data1=vip_pro（超级会员）、vip_365（大会员） |
| `gift_card_sku_click` | 礼品卡套餐点击 | data1=套餐商品 |
| `gift_card_btn_click` | 购买按钮点击 | data1=vip_pro/vip_365；data2=套餐商品 |
| `gift_card_num_click` | 购买数量点击 | data1=dec（减号）、inc（加号）、value（数值） |
| `gift_card_record_btn_click` | 买赠记录按钮点击 | — |
| `gift_card_group_pop_click` | 卡面弹窗分组点击 | data1=group_id |
| `gift_card_cover_pop_click` | 卡面弹窗卡面点击 | data1=cover_id |
| `gift_card_record_tab_click` | 买赠记录页 | data1=purchased（我购买的）、received（我收到的） |
| `gift_card_record_btn_click` | 买赠记录页按钮点击 | data1=purchased/received；data2=to_be_gifted/gifted/gift_timeout/pending_activation/activated/to_be_regifted/regifted |
| `gift_card_activate_click` | 确认激活弹窗点击 | data1=vip_pro/vip_365；data2=套餐商品 |
| `gift_card_send_btn_click` | 赠送好友按钮点击 | data1=vip_pro/vip_365；data2=套餐商品；data3=心意寄语内容 |
| `gift_card_receiver_btn_click` | 接收者按钮点击 | data1=pending_claim/claimed/already_claimed/gift |

---

## 砍价组件

### H5 端

**点击事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `reduce_price_btn_type_click` | 去砍价按钮点击 | `type`=卡片位置编号，如 `reduce_price_btn_1_click`；data1=商品 sku 名称；data2=砍价金额 |
| `reduce_price_bug_btn_click` | 直接买按钮点击 | data1=商品 sku 名称；data2=下单金额 |
| `reduce_price_invite_btn_click` | 邀人帮砍按钮点击 | data1=商品 sku 名称 |

### PC 端

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `reduce_price_btn_type_click` | 砍价模块点击 | 同 H5 |

---

## 亲友卡（内邀折扣）组件【H5】

**点击事件**（完整流程链）：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `friend_card_pop_click` | 赠送者权益弹窗点击 | data1=confirm/cancel |
| `friend_card_btn_click` | 组件送好友按钮点击 | data1=self（送自己）、friend（送好友） |
| `friend_card_self_pop_click` | 送自己确认弹窗点击 | data1=confirm/cancel |
| `friend_card_share_pop_click` | 分享方式弹窗点击 | data1=exclusive（专属礼包）、group（群发好友）、partner（办公搭子）、cancel |
| `friend_card_partner_confirm_click` | 办公搭子确认弹窗 | data1=allow/cancel |
| `friend_card_partner_pop_click` | 办公搭子弹窗 | data1=send/cancel |
| `friend_card_history_pop_click` | 赠送记录弹窗点击 | data1=send（我送出的）、reward（我获得的） |
| `friend_card_receive_pop_click` | 领取者弹窗点击 | data1=confirm/cancel |
| `friend_card_receive_btn_click` | 领取者组件点击 | data1=unauth/unclaimable_ungiftable/unclaimable_giftable/limit_exceeded/received_view/received_thank；data2=领取的权益内容 |
| `friend_card_thank_pop_click` | 答谢好友弹窗点击 | data1=thank/topic/cancel |
| `friend_card_topic_pop_click` | 分享话题弹窗点击 | data1=分享渠道/cancel |

---

## 福利中心裂变组件【PC】

**点击事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `welfare_share_0_type_click_pc` | 裂变组件邀请点击 | data1=裂变商品 id；data2=商品状态（0/1/2=进行中/已领取/已失效） |
| `welfare_share_pop_btn_click_pc` | 分享弹窗按钮点击 | — |
| `welfare_assistance_pop_btn_click_pc` | 助力弹窗按钮点击 | — |

---

## 进度条组件【H5】

**点击事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `progress_click` | 进度值点击 | data1=用户当前进度值；data2=用户点击进度值 |
| `progress_tip_click` | 提示信息点击 | data1=用户当前进度值 |

---

## 图片抽奖组件【H5】

**点击事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `lottery_pic_session` | 抽奖场次点击 | data1=场次 id |
| `lottery_pic_btn_click` | 抽奖按钮点击 | data1=场次 id；data2=time/point/hybrid |
| `lottery_pic_my_prize` | 我的奖品 | — |
| `lottery_pic_pop_btn_click` | 弹窗按钮点击 | data1=场次 id；data2=奖品 id |

---

## 红包雨抽奖组件【H5 & PC】

**点击事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `red_envelope_lottery_click` | 红包雨入口点击 | data1=icon（浮标）、banner（展示位） |
| `red_envelope_lottery_pop_click` | 红包雨弹窗点击 | data1=场次 id |
| `red_envelope_lottery_info_pop_click` | 红包雨半屏信息曝光 | data1=not_start/in_progress；data2=session（场次中奖按钮）、btn（底部按钮） |

---

## 阶梯权益领取组件【PC】

**点击事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `progress_benefit_btn_click` | 组件按钮点击 | data1=unauth/auth；data2=已获得的进度值 |
| `progress_benefit_pop_click` | 弹窗按钮点击 | data1=权益内容 |

---

## 分享海报组件（H5）

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `share_poster_click` | 分享海报组件点击 | data1=分享渠道 |

---

## 组合商品 n 选 x

### H5 端

**点击事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `multiselect_pay_click_h5` | 支付按钮点击 | data1=unauth/ineligible/unpurchased/purchased/limit；data2=sku |
| `multiselect_pay_promotion_click_h5` | 优惠信息点击 | data1=point/coupon；data2=sku |
| `multiselect_pay_success_pop_click_h5` | 支付成功弹窗点击 | data1=sku；data2=赠品内容；data3=primary/secondary |

### PC 端

**点击事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `multiselect_pay_click_pc` | 支付按钮点击 | 同 H5 |
| `multiselect_pay_promotion_click_pc` | 优惠信息点击 | 同 H5 |
| `multiselect_pay_success_pop_click_pc` | 支付成功弹窗点击 | 同 H5 |

---

## 积分盲盒抽奖（H5）

**点击事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `Integral_blindbox_click` | 组件浮标点击 | — |
| `Integral_blindbox_pop_click` | 开启弹窗按钮点击 | data1=open/close |
| `Integral_blindbox_result_click` | 开启结果弹窗点击 | data1=open/close；data2=抽取的积分倍数；data3=消耗的积分数 |

---

## 消息滚动组件（H5）

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `message_scroller_click` | 组件点击 | data1=open（跳转按钮）、close（关闭按钮） |

---

## 消息轮播组件

| 平台 | event_name | 描述 | data 字段 |
|------|-----------|------|----------|
| H5 | `noticeCarousel_click_h5` | 消息按钮点击 | data1=1、2、3...（按消息序号顺序） |
| PC | `noticeCarousel_click_pc` | 消息按钮点击 | 同 H5 |

---

## 功能介绍组件

| 平台 | event_name | 描述 | data 字段 |
|------|-----------|------|----------|
| H5 | `func_view_click_h5` | 组件热区点击 | data1=1、2、3...（按热区序号顺序） |
| PC | `func_view_click_pc` | 组件热区点击 | 同 H5 |

---

## 福利卡片容器组件【福利中心】【PC & H5】

**点击事件**：

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `benefit_dist_click` | 福利卡片容器组件按钮点击 | data1=当前点击的权益 sku 名称；data2=unclaimed/claimed/ineligible/pending/out_of_stock |
| `totalPay_click` | 右上角续费点击 | — |

---

## 限量秒杀组件【福利中心】【PC & H5】

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `subscribe_click` | 限量秒杀组件开关点击 | data1=0（关闭）、1（打开） |

---

## 站内支付-先用后付提示

### PC 端

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `pay_bnpl_tip_close_click_pc` | 关闭提示弹窗 | — |
| `pay_bnpl_tip_manage_click_pc` | 点击【管理先有后付】 | — |
| `pay_bnpl_tip_continue_click_pc` | 点击【继续购买】 | — |

### H5 端

| event_name | 描述 | data 字段 |
|-----------|------|----------|
| `pay_bnpl_tip_close_click_h5` | 关闭提示弹窗 | — |
| `pay_bnpl_tip_manage_click_h5` | 点击【管理先有后付】 | — |
| `pay_bnpl_tip_continue_click_h5` | 点击【继续购买】 | — |

---

## 附录：position 与订单关联关系

点击事件中 position 字段的取值说明：

| 组件 | position 取值 |
|------|-------------|
| 支付组件 | `pay_button_1`（卡片1购买）、`pay_button_2`（卡片2购买）、`pay_button_3`（卡片3购买） |
| 秒杀组件 | `limit_buy`（组件购买）、`pop_buy`（兜底弹窗购买） |
| 下飘支付组件 | `bottomitem_1`（下飘购买） |
