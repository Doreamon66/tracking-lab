const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, 'screenshots')

function imgTag(filename) {
  const imgPath = path.join(OUT, filename)
  if (!fs.existsSync(imgPath)) return '<p style="color:#999;">截图未找到</p>'
  const b64 = fs.readFileSync(imgPath).toString('base64')
  return `<img src="data:image/png;base64,${b64}" alt="${filename}" />`
}

const slides = [
  // 0 - Cover
  {
    class: 'slide-cover',
    html: `
      <h1>Tracking Lab</h1>
      <p class="subtitle">埋点 Skill 调优平台</p>
      <p class="meta">组内功能分享</p>
      <div class="tags">
        <span>PRD 文档管理</span>
        <span>AI 埋点生成</span>
        <span>Skill 版本管理</span>
        <span>版本对比</span>
      </div>
    `
  },
  // 1 - Problem + Workflow
  {
    html: `<div class="slide-inner">
      <h2>背景与工作流</h2>
      <div class="two-col" style="margin-bottom: 20px;">
        <div class="col col-red">
          <h3>之前的痛点</h3>
          <ul>
            <li>改了 Skill 直接覆盖文件，<b>改坏了没法回退</b></li>
            <li>不知道某次生成<b>用的是哪一版 Skill</b></li>
            <li>想对比效果<b>只能靠人肉看</b></li>
            <li>改 Skill 和生成埋点<b>来回切换很低效</b></li>
          </ul>
        </div>
        <div class="col col-green">
          <h3>现在能做到</h3>
          <ul>
            <li>Skill 每次修改自动存版本，<b>随时回退</b></li>
            <li>每次生成自动记录版本，<b>全程可追溯</b></li>
            <li>选两个版本一键对比，<b>差异一目了然</b></li>
            <li>编辑→保存→生成→对比<b>同一页面完成</b></li>
          </ul>
        </div>
      </div>
      <div class="flow">
        <div class="flow-step"><div class="step-num" style="background:#667eea">1</div><div class="step-t">选择 PRD</div><div class="step-d">进入工作台</div></div>
        <div class="flow-arrow">→</div>
        <div class="flow-step"><div class="step-num" style="background:#7c5cbf">2</div><div class="step-t">自动加载 Skill</div><div class="step-d">按分类匹配</div></div>
        <div class="flow-arrow">→</div>
        <div class="flow-step"><div class="step-num" style="background:#00b42a">3</div><div class="step-t">用 v1 生成</div><div class="step-d">AI 生成埋点</div></div>
        <div class="flow-arrow">→</div>
        <div class="flow-step"><div class="step-num" style="background:#ff7d00">4</div><div class="step-t">编辑 Skill</div><div class="step-d">保存为草稿 v2</div></div>
        <div class="flow-arrow">→</div>
        <div class="flow-step"><div class="step-num" style="background:#f53f3f">5</div><div class="step-t">用 v2 生成</div><div class="step-d">对比两版效果</div></div>
        <div class="flow-arrow">→</div>
        <div class="flow-step"><div class="step-num" style="background:#165dff">6</div><div class="step-t">确认满意</div><div class="step-d">发布到文件</div></div>
      </div>
    </div>`
  },
  // 3 - 文档管理
  {
    html: `<div class="slide-inner">
      <h2><span class="fn">功能 1</span> 文档管理 — 分类与 Skill 绑定</h2>
      <div class="feature-row">
        <div class="feature-text">
          <p>支持从金山文档导入、文本粘贴、文件拖拽等方式导入 PRD。</p>
          <p>文档按业务方向分类（如「外部合作」「积分活动」），每个分类可以绑定专属的业务 Skill，进入工作台时<b>自动加载</b>。</p>
          <div class="highlights"><span>多方式导入</span><span>分类管理</span><span>Skill 自动绑定</span></div>
        </div>
        <div class="feature-img">${imgTag('01-doc-management.png')}</div>
      </div>
    </div>`
  },
  // 4 - 生成埋点
  {
    html: `<div class="slide-inner">
      <h2><span class="fn">功能 2</span> 生成埋点 — 选版本、一键生成</h2>
      <div class="feature-row">
        <div class="feature-text">
          <p>进入工作台后，顶部信息栏显示当前使用的 Skill 和版本。</p>
          <p>通过下拉框可以<b>随时切换到任意历史版本</b>，切换后下次生成自动使用新版本。左侧预览 PRD 内容，右侧查看 AI 生成的埋点方案。</p>
          <div class="highlights"><span>版本切换</span><span>AI 生成</span><span>实时预览</span></div>
        </div>
        <div class="feature-img">${imgTag('02-generate-tracking.png')}</div>
      </div>
    </div>`
  },
  // 5 - 规范编辑器
  {
    html: `<div class="slide-inner">
      <h2><span class="fn">功能 3</span> 规范编辑器 — 在线编辑、草稿保存</h2>
      <div class="feature-row">
        <div class="feature-text">
          <p>点击「编辑规范」打开抽屉式编辑器，直接修改 Skill 内容。</p>
          <p>改完后点「保存为新版本」仅存入数据库作为草稿，<b>不会影响团队正在使用的文件</b>。等调优满意后再到版本管理页发布到文件。</p>
          <div class="highlights"><span>在线编辑</span><span>草稿与发布分离</span><span>版本浏览</span></div>
        </div>
        <div class="feature-img">${imgTag('03-spec-editor.png')}</div>
      </div>
    </div>`
  },
  // 6 - 版本管理
  {
    html: `<div class="slide-inner">
      <h2><span class="fn">功能 4</span> 版本管理 — 版本历史与发布</h2>
      <div class="feature-row">
        <div class="feature-text">
          <p>左侧展示所有版本历史（版本号、备注、创建时间、生成次数）。</p>
          <p>点击任意版本可预览完整内容。确认某个版本是最终方案后，点击<b>「发布到文件」</b>即可覆盖磁盘上的 Skill 文件，供团队统一使用。</p>
          <div class="highlights"><span>版本列表</span><span>内容预览</span><span>一键发布</span></div>
        </div>
        <div class="feature-img">${imgTag('04-skill-versions.png')}</div>
      </div>
    </div>`
  },
  // 7 - 版本对比
  {
    html: `<div class="slide-inner">
      <h2><span class="fn">功能 5</span> 版本对比 — Skill 内容 + 生成结果</h2>
      <div class="feature-row">
        <div class="feature-text">
          <p>开启对比模式后，选择两个版本标记为 A 和 B，左右面板对比查看。</p>
          <p>支持两种维度：<b>「规范内容对比」</b>看 Skill 本身改了什么，<b>「生成结果对比」</b>看两版各自生成的埋点方案区别。直观判断调优是否有效。</p>
          <div class="highlights"><span>A/B 对比</span><span>内容 diff</span><span>结果 diff</span></div>
        </div>
        <div class="feature-img">${imgTag('05-compare-mode.png')}</div>
      </div>
    </div>`
  },
  // 8 - 底层 + 价值
  {
    html: `<div class="slide-inner">
      <h2>底层实现 & 价值总结</h2>
      <div class="tech-row">
        <div class="tech-item"><h4>前端</h4><p>Vue 3 + TypeScript + Element Plus</p></div>
        <div class="tech-item"><h4>存储</h4><p>SQLite，版本和记录全部持久化</p></div>
        <div class="tech-item"><h4>核心改动</h4><p>版本表支持多文件、运行记录关联版本</p></div>
        <div class="tech-item"><h4>AI 接入</h4><p>通过 AI Gateway 对接大模型</p></div>
      </div>
      <div class="value-grid">
        <div class="vc"><div class="vc-icon" style="background:#e8f3ff">⏱️</div><h4>调优效率提升</h4><p>编辑→保存→生成→对比全在一个页面，单轮调优从 10 分钟缩到 2 分钟</p></div>
        <div class="vc"><div class="vc-icon" style="background:#e8ffea">🔒</div><h4>改了不怕回不去</h4><p>每次修改自动存版本，团队文件只在发布时更新</p></div>
        <div class="vc"><div class="vc-icon" style="background:#fff7e8">📊</div><h4>效果可量化</h4><p>两版埋点方案放在一起对比，哪个好一目了然</p></div>
        <div class="vc"><div class="vc-icon" style="background:#f0e8ff">🔗</div><h4>全程可追溯</h4><p>每次生成都记录使用的 Skill 版本，完整还原上下文</p></div>
      </div>
    </div>`
  },
  // 9 - Thank you
  {
    class: 'slide-cover',
    html: `
      <h1>Thank You</h1>
      <p class="subtitle">Tracking Lab — 让埋点 Skill 调优更高效、更可控</p>
    `
  }
]

const totalSlides = slides.length

const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tracking Lab — 功能分享</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; overflow: hidden; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background: #e8e8ec; color: #1d2129; line-height: 1.6;
}

/* ── 幻灯片容器 ── */
.deck { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.slide {
  position: absolute;
  width: 1152px; height: 720px;
  background: #fff;
  border: 1px dashed #c0c0c8;
  border-radius: 6px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 40px 60px;
  opacity: 0; pointer-events: none; transition: opacity 0.35s ease;
  overflow: hidden;
  transform-origin: center center;
}
.slide.active { opacity: 1; pointer-events: auto; }
.slide-inner { width: 100%; margin: 0 auto; }

/* ── 封面 ── */
.slide-cover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff; text-align: center; border: none;
}
.slide-cover h1 { font-size: 52px; font-weight: 700; margin-bottom: 16px; }
.slide-cover .subtitle { font-size: 22px; opacity: 0.92; margin-bottom: 12px; }
.slide-cover .meta { font-size: 15px; opacity: 0.7; margin-bottom: 28px; }
.tags { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.tags span { padding: 6px 16px; background: rgba(255,255,255,0.2); border-radius: 20px; font-size: 14px; }

/* ── 标题 ── */
h2 { font-size: 28px; font-weight: 700; margin-bottom: 20px; text-align: left; width: 100%; }
.fn { display: inline-block; padding: 2px 12px; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; border-radius: 6px; font-size: 14px; font-weight: 600; margin-right: 10px; vertical-align: middle; }
.lead { font-size: 16px; color: #4e5969; margin-bottom: 28px; width: 100%; text-align: left; }

/* ── 痛点/方案双栏 ── */
.two-col { display: flex; gap: 24px; width: 100%; }
.col { flex: 1; border-radius: 12px; padding: 24px; }
.col h3 { font-size: 16px; margin-bottom: 12px; }
.col ul { padding-left: 20px; font-size: 15px; }
.col li { margin-bottom: 6px; }
.col-red { background: #fff4f4; border: 1px solid #fde2e2; }
.col-red h3 { color: #f53f3f; }
.col-green { background: #e8ffea; border: 1px solid #aff0b5; }
.col-green h3 { color: #00b42a; }

/* ── 流程 ── */
.flow { display: flex; align-items: center; justify-content: center; gap: 0; flex-wrap: wrap; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); width: 100%; }
.flow-step { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 14px; }
.step-num { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #fff; font-weight: 700; }
.step-t { font-size: 13px; font-weight: 600; text-align: center; }
.step-d { font-size: 11px; color: #86909c; text-align: center; }
.flow-arrow { font-size: 22px; color: #c9cdd4; }

/* ── 功能详情（上文字 下截图） ── */
.feature-row { display: flex; flex-direction: column; gap: 12px; width: 100%; flex: 1; min-height: 0; }
.feature-text { width: 100%; }
.feature-text p { font-size: 14px; color: #4e5969; margin-bottom: 4px; line-height: 1.6; }
.feature-img { width: 100%; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; }
.feature-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
.highlights { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.highlights span { display: inline-block; background: #f0e8ff; color: #5b4cbf; padding: 3px 12px; border-radius: 6px; font-size: 13px; font-weight: 500; }

/* ── 底层 + 价值 ── */
.tech-row { display: flex; gap: 16px; width: 100%; margin-bottom: 24px; }
.tech-item { flex: 1; background: #fff; border-radius: 10px; padding: 16px 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #e5e6eb; }
.tech-item h4 { font-size: 13px; color: #86909c; margin-bottom: 4px; }
.tech-item p { font-size: 15px; font-weight: 600; }
.value-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; width: 100%; }
.vc { background: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #e5e6eb; display: flex; gap: 14px; align-items: flex-start; }
.vc-icon { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
.vc h4 { font-size: 15px; margin-bottom: 4px; }
.vc p { font-size: 13px; color: #86909c; line-height: 1.5; }

/* ── 导航 ── */
.nav {
  position: fixed; bottom: 8px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 8px; z-index: 100;
  background: rgba(255,255,255,0.92); backdrop-filter: blur(8px); padding: 6px 14px;
  border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); align-items: center;
}
.nav button {
  width: 36px; height: 36px; border: none; border-radius: 8px; cursor: pointer;
  font-size: 18px; background: #f2f3f5; color: #4e5969; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}
.nav button:hover { background: #667eea; color: #fff; }
.nav button:disabled { opacity: 0.3; cursor: default; background: #f2f3f5; color: #4e5969; }
.nav .page-info { font-size: 13px; color: #86909c; padding: 0 8px; min-width: 60px; text-align: center; }

/* ── 进度条 ── */
.progress { position: fixed; top: 0; left: 0; height: 3px; background: linear-gradient(90deg, #667eea, #764ba2); transition: width 0.4s ease; z-index: 100; }
</style>
</head>
<body>

<div class="progress" id="progress"></div>

<div class="deck" id="deck">
${slides.map((s, i) => `  <div class="slide ${s.class || ''} ${i === 0 ? 'active' : ''}" data-idx="${i}">\n${s.html}\n  </div>`).join('\n')}
</div>

<div class="nav">
  <button id="prev" onclick="go(-1)">←</button>
  <span class="page-info" id="pageInfo">1 / ${totalSlides}</span>
  <button id="next" onclick="go(1)">→</button>
</div>

<script>
let cur = 0
const total = ${totalSlides}
const slides = document.querySelectorAll('.slide')
const progress = document.getElementById('progress')
const pageInfo = document.getElementById('pageInfo')
const prevBtn = document.getElementById('prev')
const nextBtn = document.getElementById('next')

function show(idx) {
  if (idx < 0 || idx >= total) return
  slides[cur].classList.remove('active')
  cur = idx
  slides[cur].classList.add('active')
  progress.style.width = ((cur + 1) / total * 100) + '%'
  pageInfo.textContent = (cur + 1) + ' / ' + total
  prevBtn.disabled = cur === 0
  nextBtn.disabled = cur === total - 1
}

function go(d) { show(cur + d) }

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); go(1) }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(-1) }
  if (e.key === 'Home') { e.preventDefault(); show(0) }
  if (e.key === 'End') { e.preventDefault(); show(total - 1) }
})

function rescale() {
  const vw = window.innerWidth, vh = window.innerHeight
  const sw = 1152, sh = 720
  const scale = Math.min(vw * 0.8 / sw, vh * 0.8 / sh)
  slides.forEach(s => { s.style.transform = 'scale(' + scale + ')' })
}
rescale()
window.addEventListener('resize', rescale)

show(0)
</script>

</body>
</html>`

fs.writeFileSync(path.join(__dirname, 'presentation.html'), htmlContent, 'utf-8')
console.log('Done! presentation.html generated with', totalSlides, 'slides.')
