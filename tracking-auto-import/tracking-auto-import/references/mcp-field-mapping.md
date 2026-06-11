# MCP选项字典与delper导入字段对照

---

## 一、delper-tracking MCP 工具与参数

### 工具清单

| 工具名称 | 说明 | 必填参数 | 可选参数 |
|---------|------|---------|---------|
| `tracking_list_industry` | 获取行业列表 | 无 | 无 |
| `tracking_list_application` | 获取应用列表 | `industryId`(int) | 无 |
| `tracking_list_business` | 获取业务列表 | `applicationId`(int) | 无 |
| `tracking_list_terminal` | 获取终端列表 | 无 | `applicationId`(int), `projectId`(int) |
| `tracking_paging_projects` | 分页查询功能列表 | `current`(int), `size`(int) | `keywords`, `applicationId`(array), `businessId`(array), `terminalId`(array), `status`(array), `self`(bool), `favorite`(bool) |
| `tracking_project_profile` | 查询功能详情 | `projectId`(int) | `terminalId`(int) |
| `tracking_project_events` | 获取功能事件列表 | `projectId`(int) | 无 |
| `tracking_project_event` | 获取事件详情 | `projectId`(int), `eventId`(int) | 无 |
| **`tracking_project_create`** | **快速创建埋点方案** | **`fileBase64`(string)** | 无 |

### 链式调用依赖

```
tracking_list_industry()
  └→ tracking_list_application(industryId)
       ├→ tracking_list_business(applicationId)
       └→ tracking_list_terminal(applicationId)
```

### 导入工具详解：tracking_project_create

将Excel埋点方案文件上传到delper系统，自动解析并创建功能。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `fileBase64` | string | 是 | Excel文件的Base64编码字符串（UTF-8） |

**工作原理**：
1. delper系统接收Base64编码的Excel文件
2. 自动解析基本信息Sheet中的：应用归属、应用终端、业务归属、功能名称/标识
3. 自动解析埋点方案Sheet中的：事件名称、事件中文、属性名称、属性中文、属性类型、属性值等
4. 在delper系统中创建对应的功能和事件
5. 返回创建结果（含projectId）

**调用示例**：

```python
import base64

with open("docer_mall_埋点方案.xlsx", "rb") as f:
    file_base64 = base64.b64encode(f.read()).decode("utf-8")

# 通过MCP调用
result = mcp_call("user-delper-tracking", "tracking_project_create", {
    "fileBase64": file_base64
})
```

---


## 二、基本信息 → delper字段映射

Excel基本信息Sheet中的值会由delper系统自动解析：

| Excel字段 | B列（中文名） | C列（英文code） | delper自动匹配 |
|-----------|-------------|---------------|--------------|
| 应用归属 | 从MCP选择的中文名 | 从MCP返回的code | 自动匹配applicationId |
| 应用终端 | 从MCP选择的中文名 | 从MCP返回的code | 自动匹配terminalId |
| 业务归属 | 从MCP选择的中文名 | 从MCP返回的code | 自动匹配businessId |
| 功能名称 | 用户输入的中文名 | 功能标识 | name + code |

**关键**：
- B列的中文名必须是MCP返回的标准名称（如"WPS Office"、"PC端"、"AI业务"），delper系统通过名称自动匹配对应的数字 ID
- **C列填入MCP返回的英文 code**（如 `wps`、`pc`、`vas`），**不要填数字 ID**（如 `51`、`22`、`49`），否则 delper 会报 `invalid application` 错误

---

## 三、功能标识命名参考

| 功能名称（中文） | 功能标识（英文） | 业务 |
|---------------|---------------|------|
| 稻壳_商城 | docer_mall | 稻壳业务 |
| 稻壳_云字体 | docer_font | 稻壳业务 |
| 稻壳_AI素材库改版 | docer_aimaterial | 稻壳业务 |
| AI_AI排版 | ai_layout | AI业务 |
| AI_AI写作 | ai_writing | AI业务 |
| AI_AI翻译 | ai_translate | AI业务 |
| AI_稻壳_生改素材 | ai_docer_material_generate | AI业务 |
| 增值_会员中心 | vas_member | 增值业务 |

> 功能标识格式建议：`{业务英文编码}_{功能英文简写}`

