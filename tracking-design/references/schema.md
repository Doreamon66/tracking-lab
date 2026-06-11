# 数据结构定义

## feature-info.json

```json
{
  "app": "WPS Office",
  "business": "增值业务",
  "terminals": ["PC端"],
  "feature_name": "公共运营_新人专区",
  "feature_id": "newbie_zone",
  "tracking_type": "位置模型",
  "prd_source": "https://365.kdocs.cn/l/ciD5lynLmldu"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| app | string | 是 | 应用归属 |
| business | string | 是 | 业务归属 |
| terminals | string[] | 是 | 应用终端列表 |
| feature_name | string | 是 | 功能名称，格式：`业务_功能` |
| feature_id | string | 是 | 功能标识，英文小写+下划线，作为事件名前缀 |
| tracking_type | string | 是 | 固定值 `位置模型` |
| prd_source | string | 否 | PRD 来源 URL |

## page-tree.json

```json
{
  "pages": [
    {
      "page_name_cn": "新人专区主页",
      "page_name": "main_page",
      "prd_section": "3.1-3.7",
      "modules": [
        {
          "module_name_cn": "首屏身份判定弹窗",
          "module_name": "identity_popup",
          "prd_section": "3.1",
          "elements": [
            {
              "element_name_cn": "登录按钮",
              "element_name": "login_btn",
              "prd_desc": "未登录时点击唤起登录流程"
            },
            {
              "element_name_cn": "切换账户按钮",
              "element_name": "switch_account_btn",
              "prd_desc": "企业用户点击切换为个人账户"
            }
          ]
        }
      ]
    }
  ]
}
```

每个节点附带 `prd_section`（PRD 章节编号）或 `prd_desc`（PRD 原文摘要），保持可溯源。

**唯一性约束**：
- `page_name` 在功能内唯一
- `module_name` 在所属页面内唯一
- `element_name` 在所属模块内唯一

## events.json

```json
{
  "events": [
    {
      "page_name": "main_page",
      "module_name": null,
      "element_name": null,
      "level": "page",
      "action": "display",
      "event_name": "newbie_zone_display",
      "trigger_desc": "新人专区主页展示时触发",
      "prd_basis": "用户进入新人专区页面"
    },
    {
      "page_name": "main_page",
      "module_name": "identity_popup",
      "element_name": "login_btn",
      "level": "element",
      "action": "click",
      "event_name": "newbie_zone_click",
      "trigger_desc": "未登录用户点击登录按钮",
      "prd_basis": "3.1 未登录-点击按钮唤起登录流程"
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| page_name | string | 页面标识 |
| module_name | string\|null | 模块标识，页面级事件为 null |
| element_name | string\|null | 元素标识，页面/模块级事件为 null |
| level | "page"\|"module"\|"element" | 事件层级 |
| action | string | 业务动作 |
| event_name | string | `{feature_id}_{action}` |
| trigger_desc | string | 触发时机 |
| prd_basis | string | PRD 依据（章节号+原文摘要） |

## properties.json

```json
{
  "common_properties": [
    {
      "prop_name": "position",
      "prop_name_cn": "入口",
      "type": "string",
      "values": [
        { "value": "direct", "value_cn": "直接访问" },
        { "value": "push", "value_cn": "推送" }
      ]
    }
  ],
  "custom_properties": [
    {
      "prop_name": "user_status",
      "prop_name_cn": "用户身份状态",
      "type": "string",
      "values": [
        { "value": "not_logged_in", "value_cn": "未登录" },
        { "value": "enterprise", "value_cn": "企业用户" },
        { "value": "personal_new", "value_cn": "个人新人" },
        { "value": "personal_old", "value_cn": "个人非新人" }
      ],
      "prd_basis": "3.1 首屏身份判定：未登录/企业/个人新人/个人非新人",
      "bound_events": [
        {
          "event_name": "newbie_zone_display",
          "page_name": "main_page"
        }
      ]
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| prop_name | string | 属性英文名 |
| prop_name_cn | string | 属性中文名 |
| type | string | 数据类型：string / int / float / boolean |
| values | array | 枚举值列表（非枚举留空） |
| prd_basis | string | PRD 依据 |
| bound_events | array | 仅自定义属性，绑定的事件及位置 |
