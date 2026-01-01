# Quick Start Guide - 快速开始指南

## 🚀 快速启动

### 方式一：使用 npx 直接运行（推荐）

如果已经将项目发布到 npm，可以直接使用 npx 运行，无需本地构建：

```json
{
  "mcpServers": {
    "builder-proj": {
      "command": "npx",
      "args": ["-y", "builder-proj-mcp"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 方式二：本地运行

```bash
cd builder-proj-mcp
npm install
npm run build
```

### 3. 配置MCP客户端

将以下配置添加到你的MCP客户端配置文件中：

#### 方式一：使用 mcpconfig.json（npx 方式，推荐）

直接复制以下配置到你的MCP客户端配置：

```json
{
  "mcpServers": {
    "builder-proj": {
      "command": "npx",
      "args": ["-y", "builder-proj-mcp"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

#### 方式二：本地构建后运行

```json
{
  "mcpServers": {
    "builder-proj": {
      "command": "node",
      "args": ["q:\\mco\\builder-proj-mcp\\dist\\index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

#### 方式三：使用完整配置

查看 `mcpconfig-full.json` 获取包含所有支持框架和快速开始示例的完整配置。

### 3. 重启MCP客户端

配置完成后，重启你的MCP客户端以加载新的服务器。

## 📦 使用示例

### 创建Express项目

```typescript
{
  "projectName": "my-express-api",
  "framework": "express",
  "options": {
    "typescript": true,
    "docker": true,
    "tests": true
  }
}
```

### 创建Fastify项目

```typescript
{
  "projectName": "my-fastify-api",
  "framework": "fastify",
  "options": {
    "typescript": true,
    "docker": true,
    "tests": true
  }
}
```

### 创建NestJS项目

```typescript
{
  "projectName": "my-nest-app",
  "framework": "nestjs",
  "options": {
    "docker": true,
    "tests": true
  }
}
```

### 创建Spring Boot项目

```typescript
{
  "projectName": "my-spring-app",
  "framework": "spring-boot",
  "options": {
    "javaVersion": "17",
    "springBootVersion": "3.2.0",
    "groupId": "com.example"
  }
}
```

### 创建React项目

```typescript
{
  "projectName": "my-react-app",
  "framework": "react",
  "options": {
    "typescript": true
  }
}
```

### 创建Vue项目

```typescript
{
  "projectName": "my-vue-app",
  "framework": "vue",
  "options": {
    "typescript": true
  }
}
```

### 创建FastAPI项目

```typescript
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

### 创建Django项目

```typescript
{
  "projectName": "my-django-app",
  "framework": "django",
  "options": {
    "docker": true
  }
}
```

### 创建Flask项目

```typescript
{
  "projectName": "my-flask-app",
  "framework": "flask",
  "options": {
    "docker": true,
    "tests": true
  }
}
```

## 🎯 可用工具

### 1. build_project
创建新项目

**必需参数：**
- `projectName`: 项目名称
- `framework`: 框架名称

**可选参数：**
- `projectType`: 项目类型（web, api, mobile, desktop）
- `options`: 配置选项

### 2. list_frameworks
列出所有支持的框架

## 📋 支持的框架

### Node.js Backend
- `express` - Express框架
- `express-ts` - Express + TypeScript
- `express-rest` - Express REST API
- `fastify` - Fastify框架
- `fastify-ts` - Fastify + TypeScript
- `fastify-rest` - Fastify REST API
- `nestjs` - NestJS框架
- `nest` - NestJS（别名）
- `nestjs-rest` - NestJS REST API
- `nestjs-graphql` - NestJS + GraphQL

### Frontend
- `react` - React + Vite
- `vue` - Vue 3 + Vite
- `vite` - Vanilla Vite

### Spring/Java
- `spring-boot` - Spring Boot
- `spring` - Spring框架
- `spring-mvc` - Spring MVC
- `spring-webflux` - Spring WebFlux

### Python
- `fastapi` - FastAPI
- `django` - Django
- `flask` - Flask

## 🔧 配置选项

### 通用选项
- `docker`: 包含Docker配置（默认：true）
- `tests`: 包含测试设置（默认：true）

### Node.js Backend
- `typescript`: 使用TypeScript（默认：true）

### Spring Boot
- `javaVersion`: Java版本（默认："17"）
- `springBootVersion`: Spring Boot版本（默认："3.2.0"）
- `groupId`: Maven groupId（默认："com.example"）

### Python
- `pythonVersion`: Python版本（默认："3.11"）

## 📚 更多信息

查看 [README.md](./README.md) 获取详细文档。

## ❓ 常见问题

**Q: 如何查看所有支持的框架？**
A: 使用 `list_frameworks` 工具

**Q: 项目创建后如何运行？**
A: 每个框架都有不同的启动方式，查看生成的项目中的README或package.json

**Q: 如何自定义项目配置？**
A: 使用 `options` 参数传递配置选项

**Q: 支持哪些数据库？**
A: 大多数框架默认使用SQLite/H2，可以通过配置切换到PostgreSQL、MySQL等

## 🎉 开始使用

现在你已经准备好使用 builder-proj-mcp 了！通过MCP客户端调用工具即可快速创建项目。
