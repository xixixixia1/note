# 桌面便签应用 V2 · Desktop Sticky Note App

## 项目概述 Overview

在 V1 基础上迭代，新增**迷你悬浮条模式**：用户可将应用收起为一个始终置顶的竖向长条，固定显示在桌面任意位置，无论前台运行何种程序均不被遮挡。两种模式（完整模式 / 迷你条模式）可随时切换，数据共享同一份 `localStorage`。

技术路径：**Electron**（必选，浏览器网页无法实现窗口置顶 `alwaysOnTop`）

---

## 技术栈 Tech Stack

| 项目 | 说明 |
|------|------|
| **Electron** | 桌面容器，实现 `alwaysOnTop`、无边框窗口、窗口尺寸/位置控制 |
| **前端** | 纯 HTML + CSS + Vanilla JS（单 `index.html`，无需框架） |
| **持久化** | `localStorage`（渲染进程）或 `electron-store`（主进程，可选） |
| **拖拽排序** | SortableJS（CDN） |
| **窗口通信** | `ipcRenderer` ↔ `ipcMain`（模式切换、窗口尺寸、置顶控制） |

---

## 双模式说明 Two Modes

### 模式 A：完整模式 Full Mode（默认启动）

与 V1 完全一致的完整界面：

```
┌─────────────────────────────────────────────────────────┐
│  TOOLBAR: [便签名]  🔍  +  📌  🎨  🗑  [■迷你]  ☰     │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  SIDEBAR     │   MAIN AREA                              │
│  ┌─────────┐ │   · 选中「便签」→ 便签编辑区              │
│  │迷你日历 │ │   · 选中「待办」→ To-Do 列表              │
│  └─────────┘ │                                          │
│  📝 便签     │                                          │
│    · 便签A   │                                          │
│  ✅ 待办事项 │                                          │
│    · 列表A   │                                          │
└──────────────┴──────────────────────────────────────────┘
```

- 窗口尺寸：`900 × 640 px`（可自由缩放）
- 正常窗口层级，不强制置顶

---

### 模式 B：迷你条模式 Mini Strip Mode（新增）

点击工具栏 **[■ 迷你]** 按钮后，窗口缩小为一个竖向长条，**始终显示在所有窗口最顶层**。

```
┌────────────────────┐
│ 便签应用   [□ 展开] │  ← 顶栏（可拖拽移动）
├────────────────────┤
│ 🟡 商户            │  ← 便签条目（点击展开预览）
│ 🔴 论文呢          │
│ ──────────────     │
│ 🟡 待办 1          │  ← 待办条目（勾选框可直接操作）
│   □ 买牛奶         │
│   □ 回邮件         │
│ ──────────────     │
│  [+ 便签]  [+ 待办]│  ← 底部快捷新建按钮
└────────────────────┘
```

**迷你条规格**（参考截图中粉色便签长条比例）：

| 属性 | 值 |
|------|----|
| 宽度 | `220px`（固定，不可横向缩放） |
| 高度 | `动态`，最小 `200px`，最大 `屏幕高度 - 80px` |
| 圆角 | `12px` |
| 背景 | `rgba(255, 255, 255, 0.92)` + 毛玻璃 `backdrop-filter: blur(12px)` |
| 阴影 | `0 8px 32px rgba(0,0,0,0.18)` |
| 层级 | `alwaysOnTop: true`（Electron 主进程设置） |
| 位置 | 上次关闭时记忆位置（存入 `localStorage`），默认右侧居中 |

---

## 迷你条交互细节 Mini Strip Interactions

### 顶栏（Header）

```
┌────────────────────┐
│ ≡ 便签应用  [□]    │
└────────────────────┘
```

- **拖拽**：鼠标按住顶栏任意位置可拖动整个窗口（Electron: `titleBarStyle: 'hidden'` + `-webkit-app-region: drag`）
- **[□ 展开] 按钮**：切换回完整模式（发送 `ipc: switch-to-full`）
- 顶栏高度：`36px`

### 便签列表区（Notes Section）

- 每个便签显示为一行：`[色块] [便签名] [→]`
- **点击便签名**：在迷你条内展开一个小预览气泡（`max-height: 180px`，可滚动），显示便签前 200 字内容，点击气泡外关闭
- **[→] 按钮**：切换到完整模式并直接打开该便签

### 待办列表区（To-Do Section）

- 每个待办列表显示列表名，下方展开前 5 条未完成条目
- 每条条目：`[复选框] [文字]`，直接勾选即可标记完成，**无需切换到完整模式**
- 超出 5 条显示「+N 项」，点击跳转完整模式

### 底部快捷按钮

- `[+ 便签]`：直接新建便签（弹出迷你命名输入框，无需打开完整模式）
- `[+ 待办]`：直接新建待办列表

### 迷你命名输入框（Mini Create Popover）

点击底部 [+ 便签] 或 [+ 待办] 后，在按钮上方弹出：

```
┌─────────────────┐
│ 名称: [______]  │
│ 颜色: ■■■■■■   │
│  [取消]  [创建] │
└─────────────────┘
```

---

## 模式切换逻辑 Mode Switch Logic

```
完整模式 ──[点击■迷你]──→ 迷你条模式
                             │
                        alwaysOnTop = true
                        窗口尺寸 → 220 × auto
                        
迷你条模式 ──[点击□展开]──→ 完整模式
                             │
                        alwaysOnTop = false
                        窗口尺寸 → 900 × 640
```

**Electron 主进程（`electron-main.js`）实现要点**：

```js
// 监听渲染进程切换请求
ipcMain.on('switch-to-mini', () => {
  win.setAlwaysOnTop(true);
  win.setSize(220, 500);
  win.setResizable(false);  // 禁止横向拉伸
  // 恢复上次记忆的迷你条位置
});

ipcMain.on('switch-to-full', () => {
  win.setAlwaysOnTop(false);
  win.setSize(900, 640);
  win.setResizable(true);
  win.center();
});

// 创建窗口时
const win = new BrowserWindow({
  width: 900,
  height: 640,
  frame: false,           // 无系统标题栏
  transparent: true,      // 支持毛玻璃/圆角
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false
  }
});
```

---

## 位置记忆 Position Memory

迷你条位置在 `localStorage` 中记录：

```js
// key: "stickyapp_mini_position"
{ "x": 1680, "y": 200 }
```

- 每次拖拽结束后（`ipcMain` 监听 `win.on('moved')`）更新写入
- 下次切换到迷你条时恢复到上次位置

---

## 完整功能需求（继承 V1）Feature Requirements

---

### 1. 侧边栏 Sidebar（完整模式）

#### 1-A 迷你日历 Mini Calendar

- 位置：侧边栏顶部，宽 `144px`，内嵌不弹出
- 显示当月，左右箭头切月
- 今天高亮（圆形填充），有数据日期加小圆点
- 点击日期筛选主区域显示该日创建内容

#### 1-B 分类列表（固定两种）

| 分类 | 图标 |
|------|------|
| 📝 便签 | 每条：色块 + 名称 + [×] |
| ✅ 待办事项 | 每条：色块 + 名称 + [×] |

- 分类标题可折叠/展开，右侧 [+] 新建
- 点击条目→右侧主区域切换，激活态高亮

---

### 2. 顶部工具栏 Toolbar（完整模式）

| 按钮 | 功能 |
|------|------|
| 当前便签名（左侧） | 点击重命名 |
| 🔍 | 全文搜索 |
| ＋ | 新建当前分类条目 |
| 📌 | 置顶当前条目 |
| 🎨 | 自主选色（12色块 + 原生拾色器） |
| 🗑 | 删除当前条目（带确认弹窗） |
| **■ 迷你** | **切换到迷你条模式**（新增） |
| ☰ | 菜单（导出、快捷键） |

---

### 3. 便签区 Note Area（完整模式）

- 背景色：用户自选，非随机
- `contenteditable` 编辑，500ms 防抖自动保存
- 右键菜单：插入图片 / 粘贴图片（Base64）
- 底部右下角：「创建于 YYYY-MM-DD」「更新于 YYYY-MM-DD HH:mm」

---

### 4. 待办事项区 To-Do Area（完整模式）

- 背景色：用户自选
- 复选框条目，勾选→移入已完成折叠区
- 底部常驻输入框（`Enter` 或 ✓ 按钮新增）
- 右键条目：编辑 / 标记放弃 / 删除
- SortableJS 拖拽排序
- 已完成/已放弃区默认折叠，显示数量

---

### 5. 颜色选择器 Color Picker

- 12 预设色块 + `<input type="color">` 原生拾色器
- 用户主动选色，非随机切换
- 选色后实时更新背景，写入 `localStorage`

```
预设色：
#FFB3C6 粉红  #FFF3B0 淡黄  #C1F0C1 薄荷绿
#B3D9FF 天蓝  #E8C6FF 薰衣草 #FFD9B3 浅橙
#FFFFFF 纯白  #F0F0F0 浅灰  #D4F1F4 浅青
#FFDDE1 玫瑰  #FFF9C4 奶油  #E8F5E9 嫩绿
```

---

### 6. 新建 & 命名

- 侧边栏 [+] 或工具栏 ＋ 触发新建弹窗
- 弹窗含：名称输入（默认「便签N」/「待办N」）+ 6个快速色块
- 工具栏名称可点击重命名，`blur`/`Enter` 保存

---

### 7. 删除

- 工具栏 🗑 或侧边栏 × 均触发确认弹窗
- 确认后移除数据，自动切换到同类第一条（无则空态）
- 待办单条条目：右键菜单直接删除，无需确认

---

### 8. 数据结构 Data Schema

```js
// localStorage key: "stickyapp_data"
{
  "notes": [
    {
      "id": "note-uuid",
      "name": "商户",
      "color": "#FFF3B0",
      "content": "<p>...</p>",
      "pinned": false,
      "createdAt": 1700000000000,
      "updatedAt": 1700000000000
    }
  ],
  "todoLists": [
    {
      "id": "list-uuid",
      "name": "待办 1",
      "color": "#FFF3B0",
      "pinned": false,
      "createdAt": 1700000000000,
      "updatedAt": 1700000000000,
      "items": [
        {
          "id": "item-uuid",
          "text": "买牛奶",
          "done": false,
          "abandoned": false,
          "order": 0,
          "createdAt": 1700000000000
        }
      ]
    }
  ]
}

// localStorage key: "stickyapp_ui"
{
  "activeMode": "full",         // "full" | "mini"
  "activeNoteId": "note-uuid",
  "activeListId": null,
  "miniPosition": { "x": 1680, "y": 200 },
  "fullWindowBounds": { "x": 100, "y": 50, "width": 900, "height": 640 }
}
```

---

## UI 设计规范 Design Spec

### CSS 变量

| 变量 | 值 | 用途 |
|------|----|------|
| `--sidebar-bg` | `#F2F2F2` | 侧边栏背景 |
| `--sidebar-width` | `160px` | 侧边栏宽度 |
| `--toolbar-height` | `44px` | 工具栏高度 |
| `--mini-width` | `220px` | 迷你条宽度 |
| `--mini-radius` | `12px` | 迷你条圆角 |
| `--mini-shadow` | `0 8px 32px rgba(0,0,0,0.18)` | 迷你条阴影 |
| `--mini-bg` | `rgba(255,255,255,0.92)` | 迷你条背景 |
| `--active-highlight` | `rgba(0,0,0,0.08)` | 激活条目背景 |
| `--text-primary` | `#333` | 主文字 |
| `--text-muted` | `#AAA` | 占位符/次要文字 |
| `--border` | `#E0E0E0` | 分割线 |

### 动效

| 场景 | 动效 |
|------|------|
| 完整↔迷你切换 | 窗口尺寸变化由 Electron 处理；前端内容 `opacity 0→1 200ms` |
| 迷你条便签预览展开 | `max-height 0→180px, 250ms ease` |
| 主区域切换 | `opacity 0→1, translateY 8px→0, 150ms` |
| 勾选 Todo | 删除线 `200ms`，颜色渐变 |
| 折叠/展开 | `max-height 300ms ease` |
| 颜色面板弹出 | `scale(0.95→1) + opacity 120ms` |
| 对话框 | 遮罩淡入 `100ms`，卡片弹入 `200ms` |

---

## 文件结构 File Structure

```
sticky-note/
├── index.html           # 全部前端：完整模式 + 迷你条模式 UI（含内联 CSS/JS）
├── electron-main.js     # Electron 主进程：窗口创建、alwaysOnTop、IPC
├── package.json         # electron 依赖
└── (打包后) dist/
    ├── sticky-note.exe  # Windows
    └── sticky-note.dmg  # macOS
```

### `package.json` 最简配置

```json
{
  "name": "sticky-note",
  "version": "2.0.0",
  "main": "electron-main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder"
  },
  "devDependencies": {
    "electron": "^30.0.0",
    "electron-builder": "^24.0.0"
  }
}
```

---

## 开发提示 Dev Notes for AI Coding

1. **Electron 必选**：浏览器网页无法实现 `alwaysOnTop`，迷你条模式需要 Electron `BrowserWindow` 的 `setAlwaysOnTop(true)`。

2. **无边框窗口**：`frame: false` + `transparent: true`，前端自己绘制标题栏，顶栏区域设置 `-webkit-app-region: drag`，按钮区域设置 `-webkit-app-region: no-drag`。

3. **IPC 通信**：
   ```js
   // 渲染进程切换到迷你条
   const { ipcRenderer } = require('electron');
   ipcRenderer.send('switch-to-mini');
   
   // 主进程响应
   ipcMain.on('switch-to-mini', () => {
     win.setAlwaysOnTop(true, 'floating');
     win.setSize(220, 500);
   });
   ```

4. **迷你条高度自适应**：前端内容高度变化时，通过 `ipcRenderer.send('resize-mini', { height })` 通知主进程调整窗口高度；主进程用 `win.setSize(220, height)` 响应。

5. **位置记忆**：主进程监听 `win.on('moved', () => { ... })` 获取坐标，发送到渲染进程写入 `localStorage`；或直接在主进程用 `electron-store` 持久化。

6. **迷你条待办直接勾选**：迷你条中的复选框操作直接修改 `localStorage` 对应 item 的 `done` 字段，无需 IPC。

7. **颜色选择器**：浮层 `position: absolute`，12个色块 `<span>` + `<input type="color">`，点击外部关闭。

8. **SortableJS 拖拽**：`new Sortable(el, { animation: 150, onEnd: saveOrder })`，`saveOrder` 回调更新 items 的 `order` 字段并写入 `localStorage`。

9. **图片 Base64**：`paste` 事件处理 `clipboardData.items`，`file input` 读取后 `FileReader.readAsDataURL`，内联到 `contenteditable`。

10. **数据初始化**：首次启动写入示例便签「欢迎使用」和示例待办「第一个任务」，让用户立即看到效果。
