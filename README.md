# Typing Master - 多语言打字练习

一款基于 Electron 的多语言打字练习桌面应用，支持法语、西班牙语、意大利语、葡萄牙语、俄语和日语。

## 功能特性

- **6 种语言**：法语 / 西班牙语 / 意大利语 / 葡萄牙语 / 俄语 / 日语
- **3 种模式**：自由练习、限时挑战、精确模式
- **虚拟键盘**：实时显示当前需要按的键位，支持 US International、俄语 ЙЦУКЕН、日语 JIS 假名布局
- **日语双模式**：罗马字输入 / 假名直接输入
- **难度分级**：欧洲语言 A1-C1 / 日语 JLPT N5-N1
- **词汇管理**：下载模板、导入自定义词汇、导出当前词汇
- **练习统计**：WPM 速度、准确率、分类正确率、易错字符分析

## 安装与运行

### 方式一：直接运行安装版

双击 `Typing Master.exe` 启动。

### 方式二：从源码运行

```bash
cd french-typing-game
npm install
npm start
```

需要 Node.js 18+ 和 Electron。

## 词汇管理

### 下载模板

1. 点击导航栏 📚 按钮
2. 在「下载词汇模板」区域选择语言
3. 浏览器会下载对应的 CSV 模板文件

### 导入自定义词汇

1. 按模板格式填写 CSV 文件
2. 在「导入自定义词汇」区域选择目标语言和文件
3. 点击「导入」，词汇立即生效
4. 自定义词汇自动保存到浏览器本地存储

### 导出词汇

点击「导出 CSV」将当前语言的词汇导出为 CSV 文件，方便编辑和备份。

### CSV 格式

**欧洲语言（法/西/意/葡/俄）：**

```csv
word,meaning,phonetic,category,difficulty
bonjour,你好,/bɔ̃ʒuʁ/,salutations,1
```

| 字段 | 说明 |
|------|------|
| word | 要练习打字的单词 |
| meaning | 中文释义 |
| phonetic | 音标（可选） |
| category | 分类名称 |
| difficulty | 难度 1-5（对应 A1-C1） |

**日语：**

```csv
word,reading,romaji,meaning,level,category,difficulty
私,わたし,watashi,我,N5,noun_basic,1
```

| 字段 | 说明 |
|------|------|
| word | 汉字/假名 |
| reading | 假名读法 |
| romaji | 罗马字 |
| meaning | 中文释义 |
| level | JLPT 等级（N5-N1） |
| category | 分类名称 |
| difficulty | 难度 1-5（对应 N5-N1） |

## 项目结构

```
├── main.js           # Electron 主进程
├── index.html        # 主界面
├── css/style.css     # 样式
├── js/
│   ├── renderer.js   # 游戏逻辑 & 词汇管理
│   ├── keyboard.js   # 虚拟键盘
│   └── stats.js      # 统计管理
├── words/            # 内置词汇数据
│   ├── fr.js         # 法语
│   ├── es.js         # 西班牙语
│   ├── it.js         # 意大利语
│   ├── pt.js         # 葡萄牙语
│   ├── ru.js         # 俄语
│   └── ja.js         # 日语
├── templates/        # CSV 模板文件
│   ├── french_template.csv
│   ├── spanish_template.csv
│   ├── italian_template.csv
│   ├── portuguese_template.csv
│   ├── russian_template.csv
│   └── japanese_template.csv
└── manuals/          # 各语言打字手册
```

## 技术栈

- Electron 33
- 原生 HTML/CSS/JavaScript（无框架依赖）
- localStorage 持久化

## License

MIT
