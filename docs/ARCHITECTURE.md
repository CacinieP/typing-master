# 技术文档（架构与实现）

> 面向贡献者。用户侧文档见 [manuals/user-guide.md](../manuals/user-guide.md)，发布与签名公证流程见 [RELEASE.md](RELEASE.md)。
> 与代码不同步时以代码为准，并欢迎 PR 修正本文。

## 1. 概述

Typing Master 是一个**纯本地**的多语言打字练习桌面应用：无远程服务、无遥测、无网络请求（词库、统计数据、偏好全部落在本机 localStorage）。技术栈刻意保持最小：

| 层 | 选型 | 说明 |
|---|---|---|
| 运行时 | Electron 43 | 仅用 BrowserWindow 加载本地文件 |
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
│   ├── keyboard.js          # 虚拟键盘：LAYOUTS 三套布局 + ACCENT_SEQUENCES 死键映射
│   └── stats.js             # StatsManager：记录/聚合/渲染 + SVG 趋势图
├── words/                   # 内置词库（全局脚本向 WORD_DATA 追加，**会打进安装包**）
│   ├── fr.js es.js it.js pt.js ru.js de.js   # 欧洲语言格式
│   └── ja.js                                 # 日语格式（多 reading/romaji/level 字段）
├── manuals/                 # 仓库版手册（**打进安装包但应用内无入口**，见 §7）
├── templates/               # CSV 模板（**不打包**，仅供源码用户参考；应用内模板由
│                            #   renderer.js generateTemplate() 硬编码生成 —— 双源漂移，见 issue #6）
├── build/
│   ├── icon.png / icon.icns / icon-mac.png   # 打包图标
│   └── notarize.js          # afterSign 钩子：Apple 公证（凭证缺失时跳过）
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

设计取舍与已知限制：

- **不设 maxLength**：给死键中间态和 IME 组合留空间，但结算条件没有对应的死键防护 → 死键字符落框瞬间即触发整词结算（issue #3）
- **Backspace 整词重置**（`onKeyDown`）：逐字符回退在死键/假名组合下位置同步脆弱，故清空重打；计数器只在整词结算时变动，不受影响
- 词与词间隔 150ms `setTimeout(showCurrentWord)`，回调未检查 `gameActive`（issue #4 的竞态项）
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

已知问题：导入内容的 category/word 经 `innerHTML` 进入 DOM 未转义（issue #7）；引号内换行不支持；替换不可逆且无恢复入口；配额溢出静默失败（均见 issue #11）。

### 5.2 导出（受信输出）

`exportVocab()` → `escapeCSV()`（逗号/引号/换行）→ Blob 下载，带 UTF-8 BOM 保证 Excel 识别。缺公式注入防护（issue #7）。

### 5.3 模板（双源，待统一）

- 应用内「下载模板」：`generateTemplate()` 硬编码字符串（法/西语等仅 5-7 行示例）
- 仓库 `templates/*.csv`：26 行完整模板，**不打包**
- 俄语/西语/葡语模板的 category key 与各语言内置词库错位（issue #6）

## 6. 打包与签名链路

### 6.1 electron-builder 配置（package.json `build` 字段）

- `files` 白名单：`index.html / main.js / css / js / words / manuals / assets` —— `templates/`、`build/` 不进包（`main.js` 引用 `build/icon-*.png` 在打包后为空图标，走 no-op 分支，依赖 `.app` 自带图标）
- `afterSign: build/notarize.js`：`@electron/notarize`（notarytool）公证；凭证缺失（三变量不全）时打日志跳过 —— 本地无凭证构建可直接成功
- macOS：dmg × (x64 + arm64)，`build/icon.icns`；Windows：nsis x64，可改安装目录
- ⚠ electron-builder 25 内置公证（检测 `APPLE_ID` 等环境变量）会先公证一次，afterSign 再公证一次 —— **CI 上每 arch 双重公证**（issue #8 附 v1.4.0 日志证据）

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
  └─ build (matrix: windows-latest→win, macos-latest→mac)
       ├─ npm install（ELECTRON_MIRROR=npmmirror）
       ├─ [mac] Configure signing env：CSC_LINK secret 非空才导出 CSC_*（shell 内判断，可靠）
       │    ⚠ "Prepare macOS signing certificate" 步骤的 if 引用同 step 的 env，恒 false，从不执行（issue #8）
       ├─ [win] npm run build:win
       ├─ [mac，非 PR] npm run build:mac（注入 APPLE_ID 等 → 内置公证 + afterSign 双公证）
       └─ upload artifacts dist/**
  └─ release（仅 tag）：下载 artifacts → softprops/action-gh-release 上传 exe/dmg
```

注意：

- **PR 不构建 macOS**（`if: github.event_name != 'pull_request'`）—— PR 无 secrets 时 notarize.js 报错的权宜规避，代价是 macOS 侧回归只能等合并后暴露
- release job 只有 tag 触发，`generate_release_notes: true`

## 8. 已知技术债索引

| Issue | 主题 |
|---|---|
| #3 | 死键中间态导致重音词提前判错（主路径必现） |
| #4 | 常错字符统计失效（errorRate 恒 100%）+ Esc 空会话入统计 + 150ms 竞态 |
| #5 | 词库 112 个重复词，建议加 CI 数据校验 |
| #6 | CSV 模板 category key 错位 + 模板双源漂移 |
| #7 | CSV 导入 innerHTML XSS + 导出公式注入 + 引号内换行 |
| #8 | CI 死步骤 + 双重公证 |
| #9 | Windows 未签名 + DMG 未 staple |
| #10 | electron 43.8.7 / electron-builder 26 / @electron/notarize 显式声明 |
| #11 | 词库导入不可逆 + 配额静默失败 |
| #12 | CSP / 导航防护 / 菜单移除 |

其他备忘：

- `manuals/` 打进安装包但应用内手册是 `renderer.js` 内置 HTML 生成（`getUSInternationalManual` 等），两套内容人工同步
- `main.js` 用 `setMenuBarVisibility(false)` 隐藏菜单，Windows 按 Alt 仍可唤出（issue #12 建议 `Menu.setApplicationMenu(null)`）
- 无测试、无 lint；CI 只验证「能打包」不验证「词库数据健康」（issue #5 附带校验脚本建议）
