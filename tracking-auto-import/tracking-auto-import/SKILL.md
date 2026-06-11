---
name: tracking-auto-import
display_name: 一键生成埋点方案并导入
description: 自动解析PRD文档，结合用户选择的业务与终端信息，匹配对应埋点规范，生成标准埋点方案Excel（对齐delper系统模板），并一键导入delper埋点管理系统。单次只生成一个业务下一个功能的1份方案。全流程覆盖：基本信息采集、规范匹配、事件设计、属性填充、模板输出、系统导入。触发条件：用户提供PRD文档并要求生成埋点方案，或要求创建/导入埋点设计到delper系统。关键词：'埋点方案导入'、'导入delper'、'埋点自动生成'、'tracking import'、'一键埋点'、'埋点设计导入'。
version: 1.3.2
---

# 埋点方案自动生成与delper一键导入

解析PRD文档 → 匹配业务规范 → 生成埋点事件与属性 → 输出标准Excel → 导入delper系统。

## 工作流总览

```
环境自检(preflight) → 前置 配置认证 → 第0步 文档类型识别 → 第1步 基本信息(MCP) → 第2步 业务规范 → 第3步 生成事件 → 第4步 填充属性 → 第5步 输出Excel → 第6步 确认后推送delper
```

## 团队分发与稳定性（必读）

给他人使用前，先阅读 [SETUP.md](SETUP.md)，并运行环境自检：

```bash
python "<skill目录>/scripts/preflight_check.py"
```

**Agent 必须遵守的稳定实践**：

| 规则 | 说明 |
|------|------|
| 用脚本推送 | 调用 `scripts/push_to_delper.py`，禁止手写 `-api-key`（exe 只认 `-x-api-key`） |
| 模板用绝对路径 | `assets/通用模型模板.xlsx`、`assets/位置模型模板.xlsx`；**勿用 Glob 判断是否存在** |
| 认证读 `_shared/bin/auth.json` | 字段 `uid` + `x-api-key`（兼容读取 `api-key`） |
| 推送前查重 | MCP `tracking_paging_projects` 按功能 `code` 搜索，避免重复 projectId |
| ksheet 源表 | API 常无法导出；优先让用户提供 xlsx，或明确告知需人工/浏览器辅助 |
| 生成后清空空行 | 模板约 480 行示例数据，输出前必须清理（见第5.4节） |
| **业务规范优先** | 有明确业务归属与对应规范时，**必须按业务规范**生成事件与属性；模板只提供列结构，禁止照搬模板示例行或其他 delper project（见 [business-specs.md](references/business-specs.md)、[attribute-rules.md](references/attribute-rules.md)） |
| **事件范围约束** | 只生成**埋点规范文档已登记**且 PRD 有对应交互的事件；**不得自行生成规范要求外的事件**（如凭 PRD 文案发明 `ai_remind` 等）；**除非用户明确要求**新增某事件，方可添加并在备注标注 |
| **PRD 交互分级** | **全业务**：默认只写 P0 主链路 + P1 差异化支线；P2 默认不写，除非用户明确要求（见 [attribute-rules.md](references/attribute-rules.md) §2.1） |
| **事件块合并** | **全业务**：同一事件类型用规范属性枚举区分场景，禁止为每个 UI 组件单独建块（见 [attribute-rules.md](references/attribute-rules.md) §2.2） |
| **通用模型一事件一块** | **通用模型**：每个事件名称在方案中**只出现 1 次**（1 个事件块）；展示/点击/功能展示/功能点击等同理；所有场景差异写在属性值列枚举（见 [attribute-rules.md](references/attribute-rules.md) §2.3） |
| **单次单方案** | 一次请求/一轮生成**只输出 1 份** Excel：**一个业务归属 + 一个功能**；禁止按页面/模块/终端/关键词拆多份；PRD 跨业务或多功能时先让用户选定本次范围（见 [单次生成范围](#单次生成范围硬性限制)） |
| **字典值校验** | 有枚举的属性值（`comp`/`project`/`open_position`/`func_name` 等）必须来自规范属性字典；**禁止**用功能标识冒充 `comp`；输出前跑 §5.5.1 脚本校验 |
| **分业务生成** | PRD 可含多业务关键词，但生成时**只遵循第 1 步所选业务规范**；第 3 步必读 [business-generation-guide.md](references/business-generation-guide.md) 对应一节，禁止跨业务拼接规则 |

共享工具：`scripts/tracking_utils.py`（路径、认证、模板校验、推送封装）。

## 前置步骤：认证配置

在开始埋点方案生成之前，**必须先完成 delper 认证信息配置**。认证信息在整个流程中使用（MCP 查询、delper 导入等）。

### 认证信息

需要用户提供以下两项认证信息：

| 字段 | 说明 | 来源 |
|------|------|------|
| `uid` | delper 用户 ID | delper 系统用户标识 |
| `x-api-key` | delper API 密钥 | 对应 HTTP 头 `X-Api-Key`；推送 exe 参数 `-x-api-key` |

### 配置流程

1. 向用户询问 `uid` 和 `x-api-key`
2. 复制 `_shared/bin/auth.json.example` 为 `_shared/bin/auth.json` 并填写：
   ```json
   {
     "uid": "<用户uid>",
     "x-api-key": "<用户密钥>"
   }
   ```
3. 运行 `python scripts/preflight_check.py` 确认 `[OK] auth`
4. 后续流程直接读取 `auth.json`（`tracking_utils.load_auth()` 兼容旧字段 `api-key`）

> **注意**：`auth.json` 含敏感信息，不随 skill 分发。用户更换认证信息时可重新提供或直接编辑该文件。
> 
> 详细说明见 [delper-auth-config.md](../_shared/references/delper-auth-config.md)

### 已配置检测

每次会话开始时：

1. 运行 `python scripts/preflight_check.py`（或 `--json`）；若有 `FAIL`，先按 [SETUP.md](SETUP.md) 修复
2. `auth.json` 已存在且 preflight 通过 → 进入第0步
3. 不存在 → 引导用户配置后再继续

## MCP配置

delper-tracking MCP 服务地址：`http://delper-api.wps.cn/service/tracking/api/v1/mcp`

**MCP 请求头格式**（所有 delper-tracking MCP 请求必须携带）：

```json
"headers": {
  "Cookie": "uid=<你的uid>",
  "X-Api-Key": "<你的x-api-key>"
}
```

> **重要**：请求头参数名称必须严格使用上述格式，**不要修改参数名称**：
> - `Cookie`（首字母大写），uid 放在 Cookie 字段中，格式为 `uid=<你的uid>`
> - `X-Api-Key`（首字母大写，含连字符）

---

## 第0步：文档类型识别

用户提供的文档可能不是PRD，而是已有的埋点方案。必须在进入工作流前识别文档类型，决定后续流程。

### 0.1 识别规则

| 特征 | 文档类型 | 后续流程 |
|------|---------|---------|
| 包含产品需求描述、功能模块、交互流程、页面结构等内容 | **需求文档（PRD）** | 进入第1步，走完整埋点方案生成流程 |
| 包含埋点事件列表、事件名称、属性定义、触发时机等 | **埋点方案** | 跳转第0.2步，走方案转换+推送流程 |
| 不确定 | **无法判断** | 向用户确认文档类型 |

**识别方式**：
1. 读取文档内容，检查是否包含埋点方案特征关键词（事件名称、属性名称、事件触发时机、公共属性Sheet、埋点方案Sheet等）
2. 检查 Excel 文件的 Sheet 名称（如包含"埋点方案"Sheet）可直接判断为埋点方案
3. 若文档同时包含PRD内容和埋点方案，优先按需求文档处理

### 0.2 埋点方案转换流程

当用户提供的文档识别为**埋点方案**时，执行以下流程：

1. **读取并解析埋点方案**：提取事件列表、属性定义、基本信息等
2. **转换为delper标准模板格式**：将用户埋点方案的内容映射到 [第5步](#第5步输出excel模板) 中定义的标准模板结构（位置模型或通用模型），生成符合delper导入要求的Excel文件
   - 根据方案内容自动判断模型类型（位置模型 / 通用模型）
   - 基本信息 Sheet：从方案中提取应用归属、应用终端、业务归属、功能名称等信息填充；若方案中缺少基本信息，通过 MCP 字典拉取或向用户确认
   - 埋点方案 Sheet：按标准模板列结构重新组织事件和属性数据
   - 公共属性 Sheet：按规范填充公共属性
3. **输出标准Excel文件**：文件命名 `{功能标识}_埋点方案.xlsx`
4. **提示用户确认并推送delper**：展示方案摘要，询问用户是否推送到delper（遵循 [delper推送确认规则](#delper推送确认规则)）

**示例交互**：

```
用户: 帮我把这个埋点方案推送到delper [上传埋点方案.xlsx]
AI: 识别到您提供的是埋点方案（非需求文档），我将把它转换为delper标准模板格式。
    [转换完成，共XX个事件，通用模型]
    [查看埋点方案](<file:///...>)
    是否要推送到delper？
用户: 确认
AI: [执行推送]
```

> **注意**：转换过程中如果发现用户的埋点方案与delper模板结构差异较大（如缺失关键字段、事件命名不规范等），应明确告知用户并给出修复建议，而非强行转换。

---

## 第1步：采集基本信息

通过 delper-tracking MCP 获取选项字典，结合 PRD/埋点方案信息，自动填充基本信息并确认。

### 1.1 信息采集策略

基本信息（行业、应用归属、业务归属、应用终端、功能名称、模型类型）的采集分为两种模式：

| 模式 | 适用场景 | 说明 |
|------|---------|------|
| **自动填充** | 已提供 PRD/埋点方案文档 | 根据文档内容自动识别并填充，给出建议值供用户确认 |
| **字典选择** | 文档信息不足或需要人工确认 | 拉取 delper 最新字典数据，展示选项供用户选择 |

> **优先自动填充**：根据需求文档/埋点方案信息自动识别业务归属、应用归属、应用终端，生成功能中英文名称建议值。当文档信息不足以自动判断时，再拉取 delper 字典供用户选择。

### 1.2 基本信息字段说明

#### 1.2.1 行业归属（默认值）

**默认选择「效率行业」**，无需用户手动选择。直接使用「效率行业」的 ID 作为后续 MCP 调用的 `industryId` 参数。

#### 1.2.2 应用归属、业务归属、应用终端

这三个字段按以下优先级确定：

1. **从文档自动识别**：解析 PRD/埋点方案内容，根据业务类型、产品名称、终端平台等关键词自动匹配
2. **拉取 delper 字典确认**：当文档信息不足时，调用 delper-tracking MCP 拉取最新字典数据供用户选择

**PRD 多业务关键词（统一原则）**：PRD 标题/正文可同时出现 AI、PDF、稻壳等多个业务词，但**业务归属只能选一个**，且后续第 2～5 步**全程只遵循该业务规范**生成事件名、公共属性与合并字段；**禁止**因 PRD 出现其他业务词而拼接他业务的命名或事件。详见 [business-generation-guide.md](references/business-generation-guide.md) §〇、§八。

**MCP 字典调用链**（行业已默认确定，直接从应用归属开始）：

```
tracking_list_application(industryId) → tracking_list_business(applicationId) → tracking_list_terminal(applicationId)
```

| 步骤 | MCP工具 | 必填参数 | 返回 | 自动识别依据 |
|------|---------|---------|------|-------------|
| 2a | `tracking_list_application` | `industryId`（效率行业ID） | 应用列表（id + code + name） | PRD 中的产品名称（如 WPS、金山文档等） |
| 2b | `tracking_list_business` | `applicationId`（来自2a） | 业务列表（id + code + name） | PRD 中的业务描述（如 AI、增值、PDF 等） |
| 2c | `tracking_list_terminal` | `applicationId`（可选，来自2a） | 终端列表（id + code + name） | PRD 中的平台信息（如 PC、Android、iOS 等） |

**链式规则**：
- 行业已默认为「效率行业」，直接用其 ID 调 `tracking_list_application`
- 应用归属确定后 → 用应用ID调 `tracking_list_business` 和 `tracking_list_terminal`（可并行）
- 所有选项均展示中文名称，同时记录 id 和 code 用于后续填充和导入

**自动识别失败处理**：当无法从文档中识别时，拉取对应层级的字典数据，展示全部选项供用户手动选择。

#### 1.2.3 功能名称与功能标识（自动生成）

根据 PRD/埋点方案内容自动生成功能名称和功能标识建议值，展示给用户确认。

| 字段 | 格式规范 | 自动生成规则 | 示例 |
|------|---------|-------------|------|
| 功能名称 | `{业务}_{功能名}` | 根据 PRD 中的业务归属 + 功能模块自动生成 | `AI_AI排版`、`稻壳_商城`、`稻壳_云字体` |
| 功能标识 | `{业务英文}_{功能英文}` | 功能名称转英文，与功能名称保持同结构 | `ai_layout`、`docer_mall`、`docer_font` |
| 模型类型 | 位置模型 或 通用模型 | 根据业务类型和第2步匹配的规范自动判断 | 位置模型、通用模型 |

**功能标识注意事项**：
1. **功能标识是否进事件名，取决于业务**（见 [business-generation-guide.md](references/business-generation-guide.md) §一）：
   - **AI业务**：不进事件名，写在 `function_code`/`ai_app` 等属性
   - **PDF/增值/稻壳**：进事件名（如 `pdf_xxx_show`、`docer_mall_display`）
2. 功能审批后功能标识不可修改，需谨慎定义
3. 若用户对建议值不满意，可直接修改

### 1.3 采集完成判断

5项信息（应用归属、应用终端、业务归属、功能名称、模型类型）全部有值后，展示确认摘要。未全部填写时，明确告知用户还需补充哪些字段。

**单次范围确认**（必做）：若 PRD 含多个业务或多个独立功能，在生成前必须让用户明确**本次只生成哪一个业务 + 哪一个功能**；未确认前不得进入第2步。确认后的业务归属是**唯一生成依据**，PRD 中其余业务关键词不自动带入方案。

---

## 第2步：读取业务规范

> **本步只读规范，不生成事件。** 目的是给第 3 步准备好规范正文。

1. 看第 1 步确认的**业务归属**，打开 [business-generation-guide.md](references/business-generation-guide.md) **对应业务那一节**。
2. 按该节「读哪份规范」→ 在线读取（文档链接见 [business-specs.md](references/business-specs.md)）。
3. 记下：**模型类型**、**事件骨架**、**公共属性**、**各事件必报属性**。
4. 复制 `assets/` 模板（仅列结构），**清空**示例行。

**红线**：不套模板示例行 / 其他业务 project；用户改业务归属 → 重读规范并重生成整份方案；ksheet 失败 → 让用户导出 xlsx。

---

## 第3步：解析 PRD，按业务生成事件

> **约束落点在本步。** 必须按 **3.1 → 3.2 → 3.3** 顺序执行，**3.2 完成前不得写事件名**。

### 3.1 读 PRD（只提取交互，还不命名事件）

- 格式：.docx / .pdf / .xlsx / 云文档；ksheet 规范表须 `wps_docs` ET
- 提取：核心流程、页面模块、按钮状态、**是否走 AI 网关/VLM**、上线终端
- 范围：只覆盖第 1 步确认的 **1 业务 + 1 功能**；跨业务且用户未指明 → **先问用户**

### 3.2 加载「业务生成规则包」（写事件名之前必做）

第 1 步已确认业务归属后，**只打开下表对应链接**，这就是本功能的全部生成限制：

| 业务归属 | 规则包（必读） |
|---------|---------------|
| AI业务 | [§二 AI 业务](references/business-generation-guide.md#二ai-业务--生成规则) |
| PDF业务 | [§三 PDF 业务](references/business-generation-guide.md#三pdf-业务--生成规则) |
| 增值功能 | [§四 增值功能](references/business-generation-guide.md#四增值功能--生成规则) |
| 稻壳业务 | [§五 稻壳业务](references/business-generation-guide.md#五稻壳业务--生成规则) |
| 图片业务 | [§六 图片业务](references/business-generation-guide.md#六图片业务--生成规则) |
| 运营活动 | [§七 运营活动业务](references/business-generation-guide.md#七运营活动业务--生成规则) |
| 无标准业务 | [§八 无标准业务](references/business-generation-guide.md#八无标准业务) |

规则包里已写明该业务的：**事件名格式**、**功能标识写在哪**、**P0 主链路**、**公共属性**、**禁止项与错误模式**。

PRD 含多业务关键词时：见规则包 [§〇 统一原则](references/business-generation-guide.md#〇统一原则所有业务适用)、[§九](references/business-generation-guide.md#九prd-多关键词时的判定抽象)。

### 3.3 按规则包写事件骨架

在 **3.2 打开的规则包** 内操作，**不得参考其他业务列**：

```
① PRD 交互分级 P0/P1/P2（默认 P0+P1）     → attribute-rules.md §2.1
② 事件名从规则包抄（AI=ai_show…固定名；PDF=pdf_{功能}_show…）  → 禁止跨业务
③ 同类型合并 1 块，场景写属性枚举         → 规则包「多场景怎么合并」
④ 通用模型每事件名 C 列只 1 次            → attribute-rules.md §2.3
⑤ 对照规则包「本业务禁止」+ §九检查单
```

交付前跑 `validate_plan_output.py`（§5.5.1）；失败则按规则包修正后重跑。

---

## 第4步：填充属性

> 完整规则（分级、白/黑名单、各业务公共属性）见 [attribute-rules.md](references/attribute-rules.md)。本步只列要点。

### 4.1 公共属性

- 同时写入「公共属性 Sheet」和各事件埋点方案 Sheet；排列：公共属性 → 自定义属性；类型列标注「公共属性 / 自定义属性」。
- **有规范业务**：只写 [business-generation-guide.md](references/business-generation-guide.md) 对应业务一节里的「公共属性」列表（细则见 [attribute-rules.md](references/attribute-rules.md) §5）。
- **无标准业务**：公共属性留空；若用通用模型可按 [template-structure.md](references/template-structure.md) 写默认 4 项。

### 4.2 自定义属性

按 P0（必报/能获取必报）/ P1（建议都报）/ P2（按需且与功能相关，需 PRD 依据）分级填充，详见 [attribute-rules.md](references/attribute-rules.md) §一。

**红线**：属性与事件均**不得编造**，须能在规范中找到依据；事件范围另见稳定实践表。

### 4.3 属性值与属性值描述填充规则

生成的埋点方案中，**属性值列（I列/H列）和属性值描述列（J列/I列）**的填充规则如下：

#### 4.3.1 属性值列（I列/H列）填充规则

**核心原则**：属性值生成**英文**。

| 情况 | 属性值列填写内容 | 示例 |
|------|----------------|------|
| **有枚举值**的属性 | 直接填英文枚举值，多个值用 `/` 分隔 | `web/client/noop`、`success/fail`、`page/button/input` |
| **无枚举值**的属性 | 填属性值的数据格式标注 | `string`、`bigint`、`boolean`、`timestamp` |

**格式标注类型**（仅无枚举值时使用）：

| 格式类型 | 标注 | 说明 |
|---------|------|------|
| 字符串（默认） | `string` | 一般属性均默认此类型 |
| 整数 | `bigint` | 整数型属性 |
| 布尔值 | `boolean` | 布尔类型 |
| 时间戳 | `timestamp` | 时间、时长类属性 |

**规则**：
- 有枚举值的属性：直接填所有英文枚举值，用 `/` 分隔，**枚举值之间不留空格**
- 无枚举值的属性：只填格式名称（`string` / `bigint` / `boolean` / `timestamp`）
- `boolean` 类型的枚举值直接填 `true/false`
- 未明确数据类型的属性默认使用 `string`

#### 4.3.2 属性值描述列（J列/I列）填充规则

| 情况 | 属性值描述列填写内容 | 示例 |
|------|-------------------|------|
| **有枚举值**的属性 | 填写所有枚举值的**中文释义**，与属性值一一对应，用 `/` 分隔 | `PC端/Mac端`、`成功/失败`、`页面/按钮/输入框` |
| **无枚举值**的属性 | 填写该属性的**业务描述**（即属性的业务含义说明） | `用户搜索输入的关键词`、`AI生成结果的耗时(毫秒)` |

**规则**：
- 有枚举值时：中文释义与英文枚举值**数量一致、顺序对应**
- 无枚举值时：填写属性在业务中的含义，帮助理解该属性的用途
- 公共属性同样适用此规则

---

## 第5步：输出Excel模板

根据业务类型选择对应模板，严格对齐模板字段结构。

### 5.1 模板选择

| 模型类型 | 模板文件 | 埋点方案列数 |
|---------|---------|------------|
| **位置模型** | `{skill}/assets/位置模型模板.xlsx` | 12列（A-L） |
| **通用模型** | `{skill}/assets/通用模型模板.xlsx` | 11列（A-K） |

校验模板：`python -c "from tracking_utils import validate_template, resolve_template; print(validate_template(resolve_template('common')))"`（在 `scripts/` 目录下执行）。

> 模板文件**不要用 Glob 搜索**；使用 `tracking_utils.resolve_template('common'|'location')` 或 SETUP.md 中的绝对路径。

### 5.2 基本信息 Sheet 填充

| 行 | A列 | B列（中文名称） | C列（英文标识） |
|----|------|---------------|---------------|
| 3 | 应用归属 | 用户选择的中文名称 | 英文code（从MCP返回code字段提取） |
| 4 | 应用终端 | 用户选择的中文名称 | 英文code |
| 5 | 业务归属 | 用户选择的中文名称 | 英文code |
| 6 | 功能名称 | 用户输入的中文名称 | 功能标识 |
| 7 | 需求文档 | 用户提供的云文档中文名称 | 云文档完整 URL |

> **重要**：C列填写 MCP 返回的 **英文 code**（如 `wps`、`pc`、`vas`），**不要填数字 ID**。delper 系统通过 B 列中文名自动匹配对应的数字 ID，C 列的 code 用于标识编码。

> 第7行需求文档：将用户提供的 PRD 云文档链接填入 C7，文档中文名称填入 B7。若用户提供的是本地文件，B7 填文件名，C7 填本地路径。

### 5.3 埋点方案 Sheet 结构

**位置模型**（12列）：页面中文(A) | 模块中文(B) | 元素中文(C) | 事件名称(D) | 事件中文(E) | 属性名称(F) | 属性中文(G) | 属性类型(H) | 属性值(I) | 属性值描述(J) | 属性值备注(K) | 事件触发时机(L)

**通用模型**（11列）：一级分类(A) | 二级分类(B) | 事件名称(C) | 事件中文(D) | 属性名称(E) | 属性中文(F) | 属性类型(G) | 属性值(H) | 属性值描述(I) | 属性值备注(J) | 事件触发时机(K)

**通用模型事件块规则**（见 [attribute-rules.md](references/attribute-rules.md) §2.3）：
- 埋点方案 Sheet 中，**同一事件名称（C 列）只出现 1 次** = 1 个事件块（块内多行属性正常）。
- `show`/`click`/`funcshow`/`funcclick` 等展示、点击、功能展示、功能点击类事件**不得**按页面/按钮/模块拆成多个同名事件块。
- PRD 中各交互场景 → 合并写入对应属性的**属性值列（H 列）**英文枚举，用 `/` 分隔。

详细合并单元格规则和每个事件的标准公共属性行见 [references/template-structure.md](references/template-structure.md)。

### 5.4 输出

- 文件命名：`{功能标识}_埋点方案.xlsx`
- 实现方式：**复制** `assets/` 下对应模板（`shutil.copy` + openpyxl），禁止从零手写 Workbook（易丢列结构与样式）
- **模板空行清理**（必做）：模板含约 480 行示例/空行。复制后：解除合并 → 清空「埋点方案」数据区 → 写入新数据 → 重设合并 → `delete_rows` 删除尾部空行，使 `max_row` 等于实际数据行数

### 5.5 输出前校验（必做）

写入 Excel 前对照 [attribute-rules.md](references/attribute-rules.md) §六 自检清单，至少确认：

1. **事件范围**：每个事件名均能在规范文档中找到；无凭 PRD 自行发明的事件（如 `ai_remind`）；规范外事件仅在有**用户明确要求**时出现；P2 默认未写入；事件块未按 UI 组件过度拆分（§2.1/§2.2）
2. **通用模型一事件一块**（§2.3）：通用模型下每个事件名称仅 1 个事件块；展示/点击类未重复建块；场景差异已在属性值列枚举
3. **公共属性**：公共属性 Sheet 每一行均有规范依据；无 `position`、`client`、模板默认 `func_version/is_login/…`（有规范业务）
4. **属性范围**：各事件属性 ⊆ 规范「必报/能获取必报/按需」+ PRD 相关 P2
5. **字典与枚举描述**（§5.5.1）：`comp`/`project`/`ai_app` 符合独立应用规则；H/I 列枚举数量一致

校验不通过时**修正后再输出**，不得带着自创事件/属性交付用户。

### 5.5.1 输出后自动校验（必跑）

写入 Excel 后、交付用户前，在 `scripts/` 目录执行：

```bash
python -X utf8 "<skill>/scripts/validate_plan_output.py" "<绝对路径>/功能标识_埋点方案.xlsx"
```

脚本检查（失败则 exit 1，须修复后重跑）：
- C 列事件名无重复（通用模型 §2.3）
- 含 `/` 的 H 列属性，I 列分段数与 H 列一致（§5.6）
- AI 业务：`comp`/`project` 若出现，值须为 `standalone` 或字典已知枚举；`ai_app` 不得为 `standalone`
- 禁止有规范业务出现模板默认公共属性名（`func_version` 等）
- AI 业务：禁止 `ai_{功能标识}_{show|click|use|result|close}` 等混用增值/PDF 命名；事件名须在规范白名单内（§2.4）

> **防错要点**：先读规范属性字典再填值；参考 delper 在线 project 只借结构，**不照搬其错误枚举**；独立应用牢记 `comp|project=standalone` + `ai_app=功能标识`。

---

## 第6步：用户确认与delper导入

### 6.1 用户确认

生成Excel后向用户展示埋点方案摘要（事件数量、核心事件列表），等待用户确认方案符合预期。

### 6.2 导入delper系统

用户确认后推送。**优先使用封装脚本**（避免参数名错误）：

```bash
python "<skill>/scripts/push_to_delper.py" "<绝对路径>/功能标识_埋点方案.xlsx"
```

成功标志：stdout 含 `200 OK` 且 exit code 0。然后用 MCP `tracking_paging_projects`（`keywords`=功能标识）核对 projectId。

#### 6.2.1 认证与可执行文件

- 认证：`_shared/bin/auth.json`（`uid` + `x-api-key`），见 [delper-auth-config.md](../_shared/references/delper-auth-config.md)
- exe 路径：`_shared/bin/tracking_project_create_{windows|darwin|linux}.exe`
- exe 参数：`-xlsx`、`-uid`、**`-x-api-key`**（不是 `-api-key`）

Python 内推送：

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path("<skill>/scripts")))
from tracking_utils import push_xlsx, push_ok

result = push_xlsx(r"C:\path\to\功能标识_埋点方案.xlsx")
assert push_ok(result), (result.stdout, result.stderr)
```

#### 6.2.2 推送前查重

调用 `tracking_paging_projects`（`keywords` = 功能标识 `code`）。若已存在同应用+终端+功能：

- 告知用户已有 projectId，避免重复新建
- 需更新时：在 delper 中编辑或确认用户是否要覆盖/新建

#### 6.2.3 HTTP MCP 调用（备选）

若 exe 调用失败，通过 HTTP JSON-RPC 调用 `tracking_project_create` 作为备选。认证参数读取方式同 6.2.1，详见 [delper-auth-config.md](../_shared/references/delper-auth-config.md)。

请求头格式见顶部 [MCP配置](#mcp配置)。推送失败时首先检查请求头是否严格遵守该格式。

#### 6.2.4 推送约束与导入说明

> **重要**：推送 delper 必须遵守以下约束：
>
> 1. **只能推送本地 xlsx 文件**：`tracking_project_create` 仅支持本地 `.xlsx` 文件路径，不支持云文档链接或远程 URL。若用户提供的是云文档链接，必须先下载到本地再推送。
> 2. **推送前将 Excel 文件转为 base64 字符串**：调用 `tracking_project_create` MCP 时，需先将本地 xlsx 文件读取为 base64 编码字符串，传入 `fileBase64` 参数。

**导入说明**：

- delper 系统会自动解析 Excel 中的基本信息 Sheet 和埋点方案 Sheet
- 基本信息（应用归属/终端/业务/功能名称）从 Excel 基本信息 Sheet 中提取
- 事件和属性数据从埋点方案 Sheet 中提取
- 导入成功后返回 delper 系统中的功能 ID（projectId），可用于后续查询
- 常见错误：`xlsx not exists`（路径错误）、`应用终端已存在`（同功能已存在，查重后更新）、`flag ... -api-key`（应改用 `push_to_delper.py` 或 `-x-api-key`）

---

## 单次生成范围（硬性限制）

**每次执行本 skill，最终只交付 1 个文件**：`{功能标识}_埋点方案.xlsx`。

| 允许 | 禁止 |
|------|------|
| 1 个业务归属 + 1 个功能标识 + 1 个应用终端 | 同一次请求输出多份 xlsx |
| 同一份方案内包含多个页面/模块的事件块（合并规则见 §2.2） | 按页面、模块、终端、按钮各建一份方案 |
| PRD 跨业务时，用户选定本次范围后生成 1 份 | 见 PRD 含 AI/PDF/稻壳等关键词就自动拆多份 |
| 用户明确要求重做时，覆盖/替换当前方案文件 | 纠错或迭代时另存 `_v2`/`_v3` 等多版本（除非用户要求保留历史） |

**PRD 跨业务或多功能的处理**：

1. 告知用户：本 skill **一次只生成一个业务下的一个功能**。
2. 列出 PRD 中识别到的业务/功能候选，请用户**选定本次**要生成的业务归属与功能名。
3. 用户确认后，仅针对选定范围执行第2–5步，输出 **1 份** Excel。
4. 其余业务/功能：提示用户**另开一次对话**或再次调用本 skill 单独生成，**不得**在同一次请求中连续生成多份。

---

## 版本交付规则

### 每次输出/更新埋点方案后，必须返回最新文件入口并等待用户确认

生成或修改埋点方案Excel后（无论新建、修改属性、修复样式、转换模型等任何变更），**必须**：

1. 返回最新版本的文件入口（使用 ``<file:///...>`` 链接格式）
2. 附带方案摘要（事件数量、业务类型、模型类型等关键信息）
3. **等待用户确认**方案内容符合预期，再进入下一步操作
4. 不自动执行后续操作（如推送delper、生成JSON等），除非用户明确要求

**文件入口格式**：

```
[查看埋点方案](<file:///绝对路径/xxx_埋点方案.xlsx>)
```

**示例交互**：

```
AI: 埋点方案已生成（37个事件，位置模型），请确认：
    [查看埋点方案](<file:///C:\Users\...\xxx_埋点方案.xlsx>)
用户: 确认
AI: 是否要推送到delper？
```

---

## delper推送确认规则

### 每次输出或转换埋点方案后，必须询问是否推送到delper

在以下场景中，**必须**询问用户是否推送到delper：

| 场景 | 触发时机 |
|------|---------|
| PRD生成埋点方案（标准流程） | 用户确认方案内容后 |
| 埋点方案转换（第0步） | 转换完成并展示方案摘要后 |
| 用户主动要求推送 | 用户明确说"推送到delper"等意图时 |
| 用户指定历史版本推送 | 用户提供旧版本文件路径时 |

**通用规则**：

1. **询问用户**是否要将埋点方案推送到delper系统
2. **默认行为**：推送最新一次生成/转换的版本
3. **指定版本**：如果用户要推送非最新版本，要求用户下载对应版本的Excel文件，然后将文件路径告诉AI

**指定版本处理流程**：
- 用户下载历史版本的表格 -> 将文件拖入对话框或提供本地路径 -> AI读取指定文件并推送

**示例交互**：

```
# 标准流程
AI: 是否要推送到delper？（默认推送最新版本）
用户: 是
AI: [执行推送]

# 埋点方案转换流程（第0步）
AI: 埋点方案已转换为delper标准格式（XX个事件），请确认：
    [查看埋点方案](<file:///...>)
用户: 确认
AI: 是否要推送到delper？
用户: 是
AI: [执行推送]

# 指定版本
AI: 是否要推送到delper？（默认推送最新版本）
用户: 推送上一个版本，文件是 xxx_v1.xlsx
AI: [读取用户指定的文件并推送]
```

## 资源

### scripts/

| 文件 | 说明 |
|------|------|
| [preflight_check.py](scripts/preflight_check.py) | 环境自检（模板、exe、auth、openpyxl） |
| [push_to_delper.py](scripts/push_to_delper.py) | 推送本地 xlsx 到 delper |
| [tracking_utils.py](scripts/tracking_utils.py) | 路径、认证、模板校验、推送封装 |

### 安装说明

| 文件 | 说明 |
|------|------|
| [SETUP.md](SETUP.md) | 团队安装、自检、常见问题 |

### references/

| 文件 | 说明 |
|------|------|
| **[business-generation-guide.md](references/business-generation-guide.md)** | **第3步必读**：分业务生成规则包（事件名/功能标识/公共属性/禁止项） |
| [business-specs.md](references/business-specs.md) | 业务规范**注册表 + 读取方式 + 业务→模型对应** |
| [attribute-rules.md](references/attribute-rules.md) | **属性分级、事件范围、公共属性白/黑名单、AI 事件清单、输出前自检** |
| [template-structure.md](references/template-structure.md) | 模板Sheet结构详细定义 |
| [mcp-field-mapping.md](references/mcp-field-mapping.md) | MCP选项字典与delper导入字段对照表 |

### assets/

| 文件 | 说明 |
|------|------|
| `位置模型模板.xlsx` | 位置模型埋点方案模板 |
| `通用模型模板.xlsx` | 通用模型埋点方案模板 |