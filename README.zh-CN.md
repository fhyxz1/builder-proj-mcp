# Builder Project MCP 服务器

一个强大的模型上下文协议（MCP）服务器，用于构建各种框架的项目结构。此工具可帮助您快速搭建 Spring Boot、React、Vue、FastAPI、Django、Flask、Express、Fastify、NestJS 等框架的项目。

**语言**: [English](README.md) | [中文](README.zh-CN.md)

## 功能特性

- **多框架支持**: 支持多种技术栈的项目构建
- **TypeScript 支持**: 完整的 TypeScript 实现
- **灵活配置**: 自定义项目选项
- **MCP 协议**: 与 MCP 兼容的客户端无缝集成

## 支持的框架

### Spring/Java
- `spring-boot` - Spring Boot + Maven
- `spring` - 通用 Spring 框架
- `spring-mvc` - Spring MVC
- `spring-webflux` - Spring WebFlux

### 前端
- `react` - React + Vite
- `react-vite` - React + Vite
- `react-cra` - React + Create React App
- `vue` - Vue 3 + Vite
- `vue3` - Vue 3
- `vue-vite` - Vue + Vite
- `vite` - 纯 Vite
- `vite-vanilla` - 纯 Vite
- `vite-ts` - Vite + TypeScript

### Python
- `fastapi` - FastAPI + Uvicorn
- `fastapi-uvicorn` - FastAPI + Uvicorn
- `fastapi-gunicorn` - FastAPI + Gunicorn
- `django` - Django
- `django-rest` - Django REST Framework
- `django-cms` - Django CMS
- `flask` - Flask
- `flask-rest` - Flask REST API
- `flask-sqlalchemy` - Flask + SQLAlchemy

## 安装

### 使用 npx（推荐）

使用 npx 是最简单的方式，它会自动下载并运行包：

```bash
# 直接使用 npx 运行
npx builder-proj-mcp
```

### 从源码安装

```bash
# 克隆仓库
git clone <repository-url>
cd builder-proj-mcp

# 安装依赖
npm install

# 构建项目
npm run build
```

### 全局安装

您也可以全局安装以便在任何地方使用：

```bash
# 全局安装
npm install -g builder-proj-mcp

# 运行服务器
builder-proj-mcp
```

## 使用方法

### 作为 MCP 服务器

添加到您的 MCP 客户端配置中：

**使用 npx（推荐）:**
```json
{
  "mcpServers": {
    "builder-proj": {
      "command": "npx",
      "args": ["builder-proj-mcp"]
    }
  }
}
```

**使用本地安装:**
```json
{
  "mcpServers": {
    "builder-proj": {
      "command": "node",
      "args": ["path/to/builder-proj-mcp/dist/index.js"]
    }
  }
}
```

### 可用工具

#### 1. build_project

使用指定框架构建新项目。

**参数说明:**
- `projectName` (string, 必填): 要创建的项目名称
- `projectType` (string, 可选): 项目类型 (web, api, mobile, desktop)
- `framework` (string, 必填): 使用的框架
- `options` (object, 可选): 额外配置选项

**示例:**

```typescript
// 创建 React 项目
{
  "projectName": "my-react-app",
  "framework": "react",
  "options": {
    "typescript": true,
    "tailwind": true,
    "stateManagement": "zustand",
    "router": true
  }
}

// 创建 Vue 项目
{
  "projectName": "my-vue-app",
  "framework": "vue",
  "options": {
    "typescript": true,
    "tailwind": true,
    "stateManagement": "pinia",
    "router": true
  }
}

// 创建 Spring Boot 项目
{
  "projectName": "my-spring-app",
  "framework": "spring-boot",
  "options": {
    "javaVersion": "17",
    "springBootVersion": "3.2.0",
    "groupId": "com.example"
  }
}

// 创建 FastAPI 项目
{
  "projectName": "my-api",
  "framework": "fastapi",
  "options": {
    "pythonVersion": "3.11",
    "docker": true,
    "tests": true
  }
}
```

#### 2. list_frameworks

列出所有支持的项目框架。

**示例:**
```typescript
{
  "name": "list_frameworks"
}
```

## 框架特定选项

### React/Vue/Vite
- `typescript`: 使用 TypeScript（默认: true）
- `tailwind`: 使用 Tailwind CSS（默认: false）
- `stateManagement`: 状态管理库（默认: none）
  - `zustand` - React 状态管理
  - `pinia` - Vue 状态管理
  - `redux` - React 状态管理
- `router`: 包含路由配置（默认: false）
- `eslint`: 包含 ESLint 配置（默认: false）
- `prettier`: 包含 Prettier 配置（默认: false）
- `testing`: 包含测试配置（默认: true）

### Spring Boot
- `javaVersion`: Java 版本（默认: "17"）
- `springBootVersion`: Spring Boot 版本（默认: "3.2.0"）
- `groupId`: Maven groupId（默认: "com.example"）
- `artifactId`: Maven artifactId（默认: 项目名称）
- `docker`: 包含 Docker 配置（默认: true）
- `tests`: 包含测试配置（默认: true）

### Python (FastAPI/Django/Flask)
- `pythonVersion`: Python 版本（默认: "3.11"）
- `docker`: 包含 Docker 配置（默认: true）
- `tests`: 包含测试配置（默认: true）
- `database`: 数据库类型（如 postgresql, mysql, mongodb）

## 项目结构

```
builder-proj-mcp/
├── src/
│   ├── builders/
│   │   ├── spring-boot-builder.ts
│   │   ├── react-builder.ts
│   │   ├── vue-builder.ts
│   │   ├── fastapi-builder.ts
│   │   ├── django-builder.ts
│   │   ├── flask-builder.ts
│   │   ├── vite-builder.ts
│   │   └── index.ts
│   ├── types.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 开发

```bash
# 开发模式运行
npm run dev

# 构建生产版本
npm run build

# 启动服务器
npm start
```

## 架构

项目采用构建者模式，包含以下组件：

- **ProjectBuilder 接口**: 定义所有构建者的契约
- **BuilderFactory**: 管理和提供对所有构建者的访问
- **框架构建者**: 每个框架的独立实现
- **MCP 服务器**: 处理工具注册和请求处理

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 许可证

MIT

## 支持

如有问题和疑问，请在该仓库中开启 issue。

---

**语言切换**: [English](README.md) | [中文](README.zh-CN.md)
