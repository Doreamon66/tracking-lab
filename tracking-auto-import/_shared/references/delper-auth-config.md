# delper 推送认证配置

## 存储位置

认证文件路径（**固定**）：

```
.cursor/skills/_shared/bin/auth.json
```

示例文件：`_shared/bin/auth.json.example`（复制后改名填写）。

## 首次使用配置

| 参数 | JSON 字段 | 说明 |
|------|-----------|------|
| delper 用户 ID | `uid` | 登录 delper 后获取 |
| API 密钥 | **`x-api-key`** | MCP / 推送 exe 使用（请求头 `X-Api-Key`） |

```json
{
  "uid": "用户ID",
  "x-api-key": "认证密钥"
}
```

> 兼容：读取时同时支持旧字段 `api-key`，但**新配置请只写 `x-api-key`**。

## 读取方式（推荐）

不要在各处重复解析；统一使用：

```bash
python tracking-auto-import/scripts/preflight_check.py
python tracking-auto-import/scripts/push_to_delper.py <文件.xlsx>
```

或在 Python 中：

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(".../tracking-auto-import/scripts")))
from tracking_utils import load_auth, push_xlsx

auth = load_auth()  # {"uid": "...", "x-api-key": "..."}
```

## MCP 请求头格式

```json
"headers": {
  "X-Api-Key": "<x-api-key 的值>",
  "Cookie": "uid=<uid 的值>"
}
```

- Header 名必须为 `X-Api-Key` 与 `Cookie`（大小写固定）
- Cookie 值为 `uid=` + uid，无其他前缀

## 推送 exe

路径：`_shared/bin/tracking_project_create_{windows|darwin|linux}.exe`

| 参数 | 说明 |
|------|------|
| `-xlsx` | 本地 `.xlsx` 绝对路径 |
| `-uid` | 与 auth.json 一致 |
| **`-x-api-key`** | 与 auth.json 一致（**不是** `-api-key`） |

## 推送文件约束

1. **仅支持本地 xlsx**，不支持云文档 URL 直推；ksheet 需先转为 xlsx。
2. MCP 备选方式：将 xlsx 转 base64 传入 `fileBase64`（见 tracking-auto-import SKILL 第6.2.3 节）。

## 安全说明

- `auth.json` 含敏感信息，**勿提交 Git、勿随 skill 公开分发**
- 分发包只带 `auth.json.example` 与三平台 exe
