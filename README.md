# TTS Vue Next

一个基于 Microsoft Edge TTS 服务的桌面文本转语音（TTS）应用程序，采用 Vue 3、Vuetify 和 Tauri 构建。

## 功能特性

### 1. 文本转语音（TTS）
- 支持实时文本输入和语音转换
- 可调节语速、音调和音量
- 多种音色选择（基于 Edge TTS 支持的语音）
- 内置音频播放器，支持播放、暂停、停止
- 生成后可保存音频文件（支持 MP3、WAV、OGG、FLAC 格式）

### 2. 批量转换
- 支持批量上传文本文件（.txt、.md、.markdown、.docx）
- 拖拽上传文件
- 可配置并发转换数量
- 实时查看转换进度
- 支持单文件重试
- 自定义输出格式和保存路径

### 3. 个性化设置
- **输出设置**
  - 自定义保存路径
  - 默认输出格式（MP3、WAV、OGG、FLAC）
  - 显示语言切换（简体中文/English）
  - 转换后自动播放开关

- **处理设置**
  - 最大重试次数（1-10 次）
  - 文件并发数（1-5）
  - 分段并发数（1-5）

### 4. 界面特性
- 现代化的玻璃拟态（Glassmorphism）设计
- 支持深色/浅色主题切换
- 自定义窗口标题栏
- 响应式布局
- 国际化支持（i18n）

## 技术栈

### 前端
- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript
- **Vuetify 3** - Material Design 组件库
- **Vue Router** - 官方路由管理器
- **Pinia** - Vue 状态管理库
- **Vue I18n** - 国际化插件

### 后端（Tauri）
- **Rust** - 系统级编程语言
- **Tauri 2** - 跨平台桌面应用框架
- **Tokio** - 异步运行时
- **reqwest** - HTTP 客户端
- **FFmpeg** - 音频格式转换

### 其他
- **Vite** - 下一代前端构建工具
- **Vitest** - 单元测试框架
- **Happy DOM** - 轻量级 DOM 实现

## 运行项目

### 环境要求

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Rust** >= 1.70.0
- **系统依赖**
  - Windows: 无需额外依赖
  - Linux: `libwebkit2gtk-4.0-dev`, `build-essential`, `curl`, `file`, `x11-utils`, `libxdo-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`
  - macOS: Xcode Command Line Tools

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd tts-vue-next

# 安装前端依赖
pnpm install

# 同步 FFmpeg 二进制文件（自动执行）
pnpm ffmpeg:sync
```

### 开发模式

```bash
# 启动开发服务器
pnpm tauri dev
```

这将会：
1. 启动 Vite 开发服务器（http://localhost:1420）
2. 编译并运行 Tauri 应用窗口

### 生产构建

```bash
# 构建前端
pnpm build

# 构建桌面应用
pnpm tauri build
```

构建产物位于 `src-tauri/target/release/bundle/` 目录。

### 运行测试

```bash
# 运行单元测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage
```

## 项目结构

```
tts-vue-next/
├── src/                        # 前端源代码
│   ├── components/            # Vue 组件
│   │   ├── batch/            # 批量转换组件
│   │   ├── layout/           # 布局组件
│   │   └── tts/              # TTS 组件
│   ├── locales/              # 国际化文件
│   ├── plugins/              # Vue 插件
│   ├── router/               # 路由配置
│   ├── stores/               # Pinia 状态管理
│   ├── types/                # TypeScript 类型定义
│   ├── utils/                # 工具函数
│   ├── views/                # 页面视图
│   ├── App.vue               # 根组件
│   └── main.ts               # 入口文件
├── src-tauri/                 # Tauri 后端源代码
│   ├── src/
│   │   ├── commands/         # Tauri 命令
│   │   │   ├── audio.rs      # 音频处理命令
│   │   │   ├── file.rs       # 文件操作命令
│   │   │   ├── tts.rs        # TTS 转换命令
│   │   │   └── voices.rs     # 语音列表命令
│   │   ├── edge_tts/         # Edge TTS 核心逻辑
│   │   ├── audio/            # 音频处理
│   │   └── utils/            # 工具函数
│   ├── binaries/             # 二进制文件（FFmpeg）
│   ├── Cargo.toml            # Rust 依赖配置
│   └── tauri.conf.json       # Tauri 配置
├── docs/                      # 项目文档
├── package.json               # Node.js 依赖配置
├── tsconfig.json              # TypeScript 配置
└── vite.config.ts             # Vite 配置
```

## 核心功能说明

### Edge TTS 集成

项目通过 WebSocket 连接 Microsoft Edge TTS 服务，实现了完整的文本转语音功能：

1. **语音获取** - 获取 Edge TTS 支持的所有可用语音
2. **DRM 认证** - 处理服务器的 DRM 挑战响应
3. **SSML 构建** - 构建标准化的语音合成标记语言
4. **文本分段** - 自动将长文本分割为适合处理的片段
5. **重试机制** - 内置重试逻辑，提高转换成功率

### 音频处理

- 使用 FFmpeg 进行音频格式转换
- 支持多种输出格式（MP3、WAV、OGG、FLAC）
- 临时文件自动清理

### 状态管理

- **TTS Store** - 管理单个文本转换状态
- **Batch Store** - 管理批量转换队列和进度
- **Voices Store** - 管理可用语音列表
- **Settings Store** - 管理用户设置（持久化）

## 开发建议

### 推荐的 IDE

- **VS Code** + 以下扩展：
  - [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
  - [Vetur](https://marketplace.visualstudio.com/items?itemName=Vue.volar)（可选）

### 代码规范

项目遵循以下代码规范：
- 使用 TypeScript 进行类型检查
- 组件采用 Composition API 和 `<script setup>` 语法
- 状态管理使用 Pinia
- 样式使用 Vuetify 和 scoped CSS

## 许可证

本项目采用 MIT 许可证。

## 贡献

欢迎提交 Issue 和 Pull Request！
