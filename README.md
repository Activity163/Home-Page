# ✨ Astralis

<div align="center">

**一个极简主义的浏览器起始页 / A Minimalist Browser Start Page**

支持中英文 · 深色模式 · 自定义搜索 · 快速访问

[English](#english) | [中文](#中文)

</div>

---

## 中文

### 📖 简介

Astralis 是一个优雅的极简主义浏览器起始页，专注于提供简洁、高效的浏览体验。支持多语言、主题切换和个性化定制。

### ✨ 特性

- 🌐 **国际化支持** - 内置中英文双语，可轻松扩展其他语言
- 🌓 **主题切换** - 支持浅色/深色/跟随系统三种主题模式
- 🔍 **多搜索引擎** - 集成 Google、Baidu、Bing 等主流搜索引擎
- ⚡ **快速访问** - 自定义网站分类和快捷链接
- ✏️ **完全个性化** - 自定义昵称、壁纸、网站标题和图标
- 🎨 **极简设计** - 清爽的界面，专注于内容本身
- 📱 **响应式布局** - 完美适配桌面和移动设备
- 💾 **本地存储** - 所有设置保存在本地，保护隐私

### 🚀 快速开始

#### 前置要求

- Node.js (推荐 v16 或更高版本)
- npm 或 yarn

#### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/yigehaozi/astralis.git
   cd astralis
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **访问应用**
   
   在浏览器中打开 `http://localhost:3000`

#### 构建生产版本

```bash
npm run build
```

构建后的文件将在 `dist` 目录中。

### ⚙️ 自定义配置

#### 修改默认网站

编辑 `constants.ts` 文件中的 `getDefaultCategories` 函数来自定义默认的网站分类和链接：

```typescript
export const getDefaultCategories = (language: Language = 'en'): Category[] => {
  return [
    {
      id: '1',
      title: '常用',
      links: [
        { id: '1', title: '示例网站', url: 'https://example.com' }
      ],
    },
  ];
};
```

#### 修改搜索引擎

在 `constants.ts` 中修改 `DEFAULT_SEARCH_ENGINES` 来添加或修改搜索引擎。

### 📦 技术栈

- **React 19** - UI 框架
- **TypeScript** - 类型安全（`strict` 已开启）
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架（**构建期编译**，非 CDN）
- **Lucide React** - 图标库
- **lunar-typescript** - 农历日期计算（按需动态加载）

### 🧰 开发脚本

```bash
npm run dev         # 启动开发服务器
npm run typecheck   # 类型检查（tsc --noEmit）
npm run lint        # ESLint
npm test            # 归一化层单元测试（Node 原生测试运行器）
npm run build       # 类型检查 + 生产构建
```

`npm run build` 会**先执行类型检查**，类型错误不会进入产物。

### 🚀 部署

构建产物为纯静态文件。若部署到 GitHub Pages 的**项目页**
（`https://<user>.github.io/Home-Page/`），必须指定子路径，否则
`/assets/*` 会 404：

```bash
VITE_BASE=/Home-Page/ npm run build
```

根域名或自定义域名部署无需设置，默认 `base: '/'`。

### 📄 许可证

MIT License

---

## English

### 📖 Introduction

Astralis is an elegant minimalist browser start page focused on providing a clean and efficient browsing experience. It supports multiple languages, theme switching, and personalization.

### ✨ Features

- 🌐 **Internationalization** - Built-in Chinese and English, easily extensible to other languages
- 🌓 **Theme Switching** - Light/Dark/System theme modes
- 🔍 **Multiple Search Engines** - Integrated Google, Baidu, Bing and more
- ⚡ **Quick Access** - Customizable website categories and shortcuts
- ✏️ **Full Personalization** - Customize your name, wallpaper, site title, and icon
- 🎨 **Minimalist Design** - Clean interface focused on content
- 📱 **Responsive Layout** - Perfect for desktop and mobile devices
- 💾 **Local Storage** - All settings saved locally for privacy

### 🚀 Quick Start

#### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn

#### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yigehaozi/astralis.git
   cd astralis
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   
   Visit `http://localhost:3000`

#### Build for Production

```bash
npm run build
```

Built files will be in the `dist` directory.

### ⚙️ Customization

#### Modify Default Websites

Edit the `getDefaultCategories` function in `constants.ts` to customize default website categories and links:

```typescript
export const getDefaultCategories = (language: Language = 'en'): Category[] => {
  return [
    {
      id: '1',
      title: 'Frequently Used',
      links: [
        { id: '1', title: 'Example Site', url: 'https://example.com' }
      ],
    },
  ];
};
```

#### Modify Search Engines

Edit `DEFAULT_SEARCH_ENGINES` in `constants.ts` to add or modify search engines.

### 📦 Tech Stack

- **React 19** - UI Framework
- **TypeScript** - Type Safety (`strict` enabled)
- **Vite** - Build Tool
- **Tailwind CSS** - Styling (**compiled at build time**, not via CDN)
- **Lucide React** - Icons
- **lunar-typescript** - Lunar calendar (lazily loaded on demand)

### 🧰 Scripts

```bash
npm run dev         # Start the dev server
npm run typecheck   # Type check (tsc --noEmit)
npm run lint        # ESLint
npm test            # Unit tests for the normalization layer (Node test runner)
npm run build       # Type check + production build
```

`npm run build` runs the type check **first**, so type errors cannot ship.

### 🚀 Deployment

The build output is fully static. When deploying to a GitHub Pages
**project** page (`https://<user>.github.io/Home-Page/`), you must set the
sub-path or every `/assets/*` URL will 404:

```bash
VITE_BASE=/Home-Page/ npm run build
```

Root-domain and custom-domain deployments need no override (`base: '/'`).

### 📄 License

MIT License
