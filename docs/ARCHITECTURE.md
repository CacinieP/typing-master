# 技术文档（架构与实现）

> 面向贡献者。用户侧文档见 [manuals/user-guide.md](../manuals/user-guide.md)，发布与签名公证流程见 [RELEASE.md](RELEASE.md)。
> 与代码不同步时以代码为准，并欢迎 PR 修正本文。

## 1. 概述

Typing Master 是一个**纯本地**的多语言打字练习桌面应用：无远程服务、无遥测、无网络请求（词库、统计数据、偏好全部落在本机 localStorage）。技术栈刻意保持最小：

| 层 | 选型 | 说明 |
|---|---|---|
| 运行时 | Electron 43.8.7 | 仅用 BrowserWindow 加载本地文件 |
| 渲染层 | 原生 HTML/CSS/JS | 无框架、无构建步骤、无打包器 |
| 持久化 | localStorage | 统计 + 自定义词库 + 偏好 |
| 打包 | electron-builder | NSIS（Windows）/ DMG（macOS） |
| CI | GitHub Actions | 双平台矩阵构建，tag 触发 release |

进程模型一句话：**主进程只负责开窗口，所有业务都在渲染进程**。

```
main.js（主进程）
  └─ BrowserWindow (nodeIntegration:false, contextIsolation:true)
       └─ index.html
            ├─ js/keyboard.js    → window.VirtualKeyboard（无模块系统，全局类）
            ├─ js/stats.js       → window.StatsManager
            ├─ <inline>          → var WORD_DATA = WORD_DATA || {}
            ├─ words/*.js        → WORD_DATA['fr'|'es'|...]（词库，7 个文件按序追加）
            └─ js/renderer.js    → IIFE，全部业务逻辑
```

## 2. 目录结构

```text
├── main.js                  # Electron 主进程：窗口/图标/生命周期
├── index.html               # 应用壳（无 CSP，见 issue #12）
├── css/style.css            # 全部样式
├── js/
│   ├── renderer.js          # 业务核心：状态机/输入判定/词汇管理/手册 HTML 生成
│   ├── keyboard.js          # 虚拟键盘：LAYOUTS 三套布局 + ACCENT_SEQUENCES + isDeadKeyCombo
│   ├── stats.js             # StatsManager：记录/聚合/渲染 + SVG 趋势图
│   ├── csv.js               # CsvUtils：parseCSV（引号内换行）/escapeCSV（公式防护）/escapeHtml
│   └── vocab-templates.js   # CSV 模板唯一事实来源（templates/*.csv 由其生成）
├── words/                   # 内置词库（全局脚本向 WORD_DATA 追加，**会打进安装包**）
│   ├── fr.js es.js it.js pt.js ru.js de.js   # 欧洲语言格式
│   └── ja.js                                 # 日语格式（多 reading/romaji/level 字段）
├── manuals/                 # 仓库版手册（**打进安装包但应用内无入口**，见 §7）
├── templates/               # CSV 模板（由 scripts/gen_templates.js 从 js/vocab-templates.js
│                            #   生成，CI 用 git diff 防漂移；应用内模板按钮直接用单源文件）
├── build/
│   ├── icon.png / icon.icns / icon-mac.png   # 打包图标
│   └── notarize.js          # afterSign 钩子：Apple 公证（凭证缺失时跳过）
├── scripts/                 # validate_words / test_units / gen_templates / dedupe_words / smoke_e2e
├── docs/                    # 本文档 + RELEASE.md
└── .github/workflows/build.yml
```

## 3. 数据契约

### 3.1 词库格式（`words/*.js`）

每个文件第一行 `var WORD_DATA = WORD_DATA || {}` 保证加载顺序无关，随后向 `WORD_DATA[lang]` 整体赋值。**导入自定义词库会整体替换 `WORD_DATA[lang]`**（见 §5.2）。

欧洲语言词条：

```js
{ word:'bonjour', meaning:'你好', phonetic:'/bɔ̃ʒuʁ/', category:'salutations', difficulty:1 }
// difficulty: 1=A1 … 5=C1；category 必须在 categories 中声明（键为内部 id，值为「中文 外文」显示名）
```

日语词条：

```js
{ word:'私', reading:'わたし', romaji:'watashi', meaning:'我', level:'N5', category:'noun_basic', difficulty:1 }
// level: N5…N1；目标输入串 = romaji（罗马字模式）或 reading（假名模式）
```

### 3.2 localStorage 键一览

| 键 | 写入方 | 内容 |
|---|---|---|
| `typing-game-stats` | `StatsManager` | 每语言最近 100 次会话 + 常错字符累计 + 分类正确率 |
| `typingmaster_custom_<lang>` | 导入词库回调 | **整份替换后**的词库（含内置词汇是否保留取决于导入内容） |
| `typingmaster_sound` | 音效开关 | `'1'`/`'0'`，默认关 |
| `typingmaster_intro_collapsed` | 语言说明卡折叠状态 | `'1'` 展开 / `'0'` 收起 |

## 4. 核心机制

### 4.1 输入判定模型（renderer.js `onInput`）

以 `<input>` 的 `value` 为唯一事实来源，**每次 `input` 事件**做两件事：

1. 逐字符高亮：`pos = value.length - 1` 处，`typed === target[pos]` → 绿色 + 键盘正确反馈，否则红色 + 抖动 + 计入 `charErrors`
2. 整词结算：`value.length >= target.length` 时逐字符比对，全对 → `correctCount++`；有错 → `wrongCount++` + `precisionErrors` 累加 + 进入 `misspelledWords`（错词重练的数据源）

设计取舍与行为：

- **不设 maxLength**：给死键中间态和 IME 组合留空间；死键中间态由 `isDeadKeyCombo()`（keyboard.js 纯函数）判定——typed 是 expected 的死键前缀时不计错、不推进高亮、不结算，等组合后的 input 事件（v1.5.0 修复，issue #3）
- **Backspace 整词重置**（`onKeyDown`）：逐字符回退在死键/假名组合下位置同步脆弱，故清空重打；计数器只在整词结算时变动，不受影响（charTotals 分母也在结算处计，重打不虚增）
- 词与词间隔 150ms `wordTimer` 定时器，`endGame/goHome/startGame` 清理、回调校验 `gameActive`（v1.5.0 修复竞态，issue #4）
- 日语假名模式依赖系统 JIS 输入法：composition 期间 `value` 变化与 `isComposing` 未区分，实践上以罗马字模式为主路径

### 4.2 虚拟键盘（keyboard.js）

- `LAYOUTS`：`us_international` / `russian`(ЙЦУКЕН) / `japanese_kana`(JIS) 三套，每键 `{key, shift, label, sub?, deadKey?}`
- `ACCENT_SEQUENCES`：重音字符 → 击键序列（如 `'é': ["'", 'e']`），用于高亮死键 + 提示条（`先按 ' 再按 e`）
- `highlightKey()` 按当前语言/模式查表；俄语与假名布局只按 `key` 直查

### 4.3 统计（stats.js `StatsManager`）

- `record()` 每会话追加，超 100 条截断；常错字符跨会话累计
- `getStats()` 聚合均值/最值；`_sparklineSVG()` 用内联 SVG 画最近 20 次 WPM 趋势
- 已知缺陷：`charErrors.total` 与 `errors` 恒等 → 错误率恒 100%（issue #4）

### 4.4 音效（renderer.js `sfx`）

Web Audio 现场合成方波/正弦短音，无音频资源文件；默认关闭，开关状态持久化。

## 5. 词汇管理（输入/输出）

### 5.1 导入（不受信任输入）

`<input type="file">` → `FileReader.readAsText(UTF-8)` → `parseCSV()`（状态机逐行解析，支持引号包裹；BOM 自动剥离；按 header 判断欧洲/日语格式）→ 校验（word/meaning 必填、difficulty 1-5 clamp）→ **整体替换** `WORD_DATA[lang]` → 写 `typingmaster_custom_<lang>`。

安全与健壮性（v1.5.0 修复，issue #7 / #11）：解析/转义集中在 `js/csv.js`（`CsvUtils`，node 可测）；引号内换行支持；导入内容经 DOM 构建 + textContent 渲染，无 innerHTML 注入面；导出对 `= + - @` 开头字段前置单引号防公式注入；导入前 confirm 提示整体替换不可逆；localStorage 配额溢出明确提示；词汇面板提供「恢复内置词库」（`BUILTIN_WORD_DATA` 快照，免重启）。

### 5.2 导出（受信输出）

`exportVocab()` → `escapeCSV()`（逗号/引号/换行）→ Blob 下载，带 UTF-8 BOM 保证 Excel 识别。缺公式注入防护（issue #7）。

### 5.3 模板（单源）

- 唯一事实来源：`js/vocab-templates.js`（完整 26-36 行模板，category key 与各语言内置词库对齐）
- 应用内「下载模板」按钮：`generateTemplate()` 直接返回单源内容（打包在 app 内）
- 仓库 `templates/*.csv`：`node scripts/gen_templates.js` 生成；CI validate job 重新生成后 `git diff --exit-code` 防漂移（v1.5.0 修复双源漂移，issue #6）

## 6. 打包与签名链路

### 6.1 electron-builder 配置（package.json `build` 字段）

- `files` 白名单：`index.html / main.js / css / js / words / manuals / assets` —— `templates/`、`build/` 不进包（`main.js` 引用 `build/icon-*.png` 在打包后为空图标，走 no-op 分支，依赖 `.app` 自带图标）
- `afterSign: build/notarize.js`：`@electron/notarize`（notarytool，已显式声明 devDependency）公证；凭证缺失（三变量不全）时打日志跳过 —— 本地无凭证构建可直接成功
- `mac.notarize: false`：关闭 electron-builder 内置公证，afterSign 为唯一公证入口（v1.5.0 修复双重公证，issue #8）
- macOS：dmg × (x64 + arm64)，`build/icon.icns`，CI 构建后对 DMG 容器 stapler staple（issue #9）；Windows：nsis x64，可改安装目录

### 6.2 签名现状（2026-11-06 实测 v1.4.0 产物）

| 产物 | 状态 |
|---|---|
| macOS app（两 arch） | Developer ID 签名 + hardened runtime + 公证 + app 内 staple ✅ |
| DMG 容器 | 无 staple（建议 CI 补 `xcrun stapler staple`，issue #9） |
| Windows exe | 无 Authenticode 证书表（完全未签名，issue #9） |

验证命令见 [RELEASE.md](RELEASE.md#5-产物验证)。

## 7. CI 流水线（build.yml）

```
push main / tag v* / PR main
  └─ validate (ubuntu)：词库/模板数据校验 + 单元测试 + 模板生成防漂移（build 的前置门禁）
  └─ build (needs validate; matrix: windows-latest→win, macos-latest→mac)
       ├─ npm install（ELECTRON_MIRROR=npmmirror）
       ├─ [mac] Configure signing env：CSC_LINK secret 非空才导出 CSC_*（base64 由 electron-builder 原生处理）
       ├─ [win] npm run build:win
       ├─ [mac，非 PR] npm run build:mac（APPLE_ID 注入 → afterSign 单次公证）→ Staple notarized DMGs
       └─ upload artifacts dist/**
  └─ release（仅 tag）：下载 artifacts → softprops/action-gh-release 上传 exe/dmg
```

注意：

- **PR 不构建 macOS**（`if: github.event_name != 'pull_request'`）—— PR 无 secrets 时规避公证类失败；代码与数据正确性由 validate job 在 PR 上把关
- release job 只有 tag 触发，`generate_release_notes: true`

## 8. 体检修复记录（v1.5.0，2026-11-06）

2026-11-06 全面体检发现的问题已全部修复（issues #3–#12 → PR #14–#17）：

| Issue | 主题 | 修复 |
|---|---|---|
| #3 | 死键中间态误判（主路径必现） | ✅ #14 `isDeadKeyCombo()` + 单元测试 |
| #4 | 错误率恒 100% / 空会话入统计 / 150ms 竞态 | ✅ #14 charTotals 真实分母等 |
| #5 | 词库 112 条重复 | ✅ #15 去重 + `validate_words.js` CI 门禁 |
| #6 | 模板 key 错位 + 双源漂移 | ✅ #15 `js/vocab-templates.js` 单源 + CI 防漂移 |
| #7 | innerHTML 注入 / 公式注入 / 引号内换行 | ✅ #16 `js/csv.js` + DOM 构建 |
| #8 | CI 死步骤 + 双重公证 | ✅ #17 删死步骤 + `mac.notarize: false` |
| #9 | Windows 未签名 + DMG 未 staple | ◐ DMG staple ✅ #17；Windows 签名需证书，#9 保持开放 |
| #10 | electron / electron-builder / notarize 依赖 | ✅ #17 43.8.7 / 26.18.0 / 显式声明 |
| #11 | 导入不可逆 + 配额静默失败 | ✅ #16 恢复内置词库按钮 + 明确提示 |
| #12 | CSP / 导航防护 / 菜单 | ✅ #16 CSP meta + `Menu.setApplicationMenu(null)` |

其他备忘：

- `manuals/` 打进安装包但应用内手册是 `renderer.js` 内置 HTML 生成（`getUSInternationalManual` 等），两套内容人工同步
- 测试与校验入口：`node scripts/test_units.js`（单元）、`node scripts/validate_words.js`（数据）、`npx electron scripts/smoke_e2e.js`（E2E 冒烟）
