# tracking-auto-import 团队安装与自检

**当前版本**：1.3.2（2026-06-08）

| 版本 | 变更摘要 |
|------|---------|
| 1.3.2 | 规则表述抽象化：PRD 多业务关键词时只遵循所选业务规范；去除具体产品案例，改为统一错误模式 |
| 1.3.1 | 新增 [business-generation-guide.md](references/business-generation-guide.md)：分业务生成规则包；第3步重写为 3.1→3.2→3.3 |
| 1.3.0 | **业务规则隔离**（§2.4）：禁止跨业务混用；校验脚本增加 AI 事件白名单检测 |
| 1.2.9 | **防错校验**：`comp`/`ai_app` 红线、枚举 H/I 一一对应（§5.6）；新增 `validate_plan_output.py`，生成后必跑 |
| 1.2.8 | **通用模型一事件一块**：每个事件名只建 1 块；展示/点击类不拆块，场景全进属性值枚举（§2.3） |
| 1.2.7 | 移除多业务自动拆分；硬性限制**单次只生成 1 个业务 + 1 个功能**的 1 份 Excel；PRD 跨范围时先让用户选定 |
| 1.2.6 | §2.1/§2.2 泛化为**全业务**（AI/增值/PDF/稻壳/图片）；各业务 P0/P1/P2 示例与合并属性对照表 |
| 1.2.5 | 新增 PRD 交互分级（§2.1 P0/P1/P2）与事件块合并规则（§2.2，初版偏 AI） |
| 1.2.4 | 去重整合：删除 `business-spec-generation.md`，内容并入 `business-specs.md`（读取方式）与 `attribute-rules.md`（属性/事件/公共属性/自检）；SKILL 正文限制收敛到稳定实践表 + reference 指针 |
| 1.2.3 | 移除 `ai-tracking-validate` 离线镜像兜底；规范必须在线读 ksheet/otl 或用户导出文件 |
| 1.2.2 | 对齐 ksheet 修订版；事件规则改为「不得自行生成规范要求外事件，除非用户明确要求」 |
| 1.2.0 | 业务规范优先：有规范业务必须按规范生成公共属性与事件，禁止套模板示例 |
| 1.1.0 | 初始团队分发版：preflight、push 脚本、模板路径规范 |

## 1. 目录结构（分发时需完整拷贝）

```
.cursor/skills/
├── tracking-auto-import/
│   ├── SKILL.md
│   ├── SETUP.md
│   ├── assets/
│   │   ├── 通用模型模板.xlsx      ← 必须包含
│   │   └── 位置模型模板.xlsx      ← 必须包含
│   ├── scripts/
│   │   ├── preflight_check.py
│   │   ├── push_to_delper.py
│   │   ├── validate_plan_output.py
│   │   └── tracking_utils.py
│   └── references/
└── _shared/
    └── bin/
        ├── auth.json.example       ← 分发
        ├── auth.json               ← 每人本地配置，勿提交仓库
        ├── tracking_project_create_windows.exe
        ├── tracking_project_create_darwin.exe
        └── tracking_project_create_linux.exe
```

> **注意**：不要用 Cursor Glob 判断模板是否存在；`assets/*.xlsx` 可能被索引忽略，但磁盘路径始终有效。

## 2. 首次配置

### 2.1 Python 依赖

```bash
pip install openpyxl
```

### 2.2 delper 认证

```bash
# Windows 示例
copy %USERPROFILE%\.cursor\skills\_shared\bin\auth.json.example %USERPROFILE%\.cursor\skills\_shared\bin\auth.json
```

编辑 `auth.json`，填写：

```json
{
  "uid": "你的uid",
  "x-api-key": "你的密钥"
}
```

字段名必须为 **`x-api-key`**（兼容旧版 `api-key` 读取，但新建请用 `x-api-key`）。

### 2.3 MCP（Cursor 设置中启用）

| MCP | 用途 |
|-----|------|
| `user-delper-tracking` | 字典、查询、备选推送 |
| `user-wps365` | 读取云文档 PRD / 规范 |

delper-tracking 请求头（由 MCP 配置，勿改字段名）：

- `Cookie`: `uid=<你的uid>`
- `X-Api-Key`: `<你的x-api-key>`

## 3. 环境自检（必跑）

```bash
python "%USERPROFILE%\.cursor\skills\tracking-auto-import\scripts\preflight_check.py"
```

全部 `[OK]` 后再生成/推送。JSON 输出：

```bash
python .../preflight_check.py --json
```

## 4. 推送埋点方案

用户确认 Excel 后：

```bash
python "%USERPROFILE%\.cursor\skills\tracking-auto-import\scripts\push_to_delper.py" "D:\path\to\功能标识_埋点方案.xlsx"
```

Agent 应优先调用此脚本，**不要**手写 `-api-key` 参数（exe 只认 `-x-api-key`）。

## 5. 源文档类型与稳定性

| 类型 | 稳定性 | 建议 |
|------|--------|------|
| `.docx` / `.otl` 云文档 | 高 | 默认 |
| 本地/云 `.xlsx` 埋点方案 | 高 | 走第0步转换 |
| **`.ksheet` 埋点表** | 低 | 建议先导出为 xlsx，或人工确认后再推 |

## 6. 常见问题

| 现象 | 处理 |
|------|------|
| `flag provided but not defined: -api-key` | 改用 `push_to_delper.py` 或 `-x-api-key` |
| `xlsx not exists` | 使用绝对路径、确认已保存为 `.xlsx` |
| `应用终端已存在` | delper 已有同功能；用 MCP 查 `tracking_paging_projects` 后更新而非重复新建 |
| 模板找不到 | 运行 `preflight_check.py`；用 `assets/通用模型模板.xlsx` 绝对路径 |
| 推送成功但多个 projectId | 推送前先按功能标识 `code` 搜索是否已存在 |
| AI 方案出现 `ai_{功能}_show/click` | **业务规则混用**（§2.4）：已确认 AI 业务却套用 PDF/增值命名；应全程遵循所选 AI 规范，功能标识写属性、事件用固定 `ai_show`/… |
| `validate_plan_output.py` 报 AI 事件白名单 | 对照 [attribute-rules.md](references/attribute-rules.md) §2.4.4；不得把功能标识拼进事件名 |

## 7. 分发 zip 包

解压到 `%USERPROFILE%\.cursor\skills\`，应得到 `tracking-auto-import/` 与 `_shared/` 两个目录（与 §1 结构一致）。

```bash
# 解压后必跑
python "%USERPROFILE%\.cursor\skills\tracking-auto-import\scripts\preflight_check.py"
```

> zip 内**不含** `auth.json`（每人本地配置）；请从 `_shared/bin/auth.json.example` 复制并填写。
