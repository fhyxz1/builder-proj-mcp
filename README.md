# Builder Project MCP Server

A powerful Model Context Protocol (MCP) server for building project structures with various frameworks. This tool helps you quickly scaffold projects for Spring Boot, React, Vue, Next.js, Nuxt.js, FastAPI, Django, Flask, Express, Fastify, NestJS, and more.

**Language**: [English](README.md) | [中文](README.zh-CN.md)

## Why Build This?
During daily vibe coding, building projects with different tech stacks often requires using different tools and command combinations, which can lead to unnecessary token overhead. Builder Project MCP Server provides a unified interface that allows you to quickly scaffold project structures by invoking a series of tools, thereby improving development efficiency.

## Features

- **Multiple Framework Support**: Build projects for various tech stacks
- **TypeScript Support**: Full TypeScript implementation
- **Flexible Configuration**: Customize project options
- **MCP Protocol**: Integrates seamlessly with MCP-compatible clients

## Supported Frameworks

### Spring/Java
- `spring-boot` - Spring Boot with Maven
- `spring` - Generic Spring framework
- `spring-mvc` - Spring MVC
- `spring-webflux` - Spring WebFlux

### Frontend (Vite-based)
- `react` - React with Vite
- `react-vite` - React with Vite
- `react-cra` - React with Create React App
- `vue` - Vue 3 with Vite
- `vue3` - Vue 3
- `vue-vite` - Vue with Vite
- `vite` - Vanilla Vite
- `vite-vanilla` - Vanilla Vite
- `vite-ts` - Vite with TypeScript

### Next.js (React SSR/SSG)
- `next` - Next.js with App Router
- `nextjs` - Next.js
- `next-app` - Next.js App Router
- `next-pages` - Next.js Pages Router

### Nuxt.js (Vue SSR/SSG)
- `nuxt` - Nuxt.js 3
- `nuxt3` - Nuxt.js 3

### Python
- `fastapi` - FastAPI with Uvicorn
- `fastapi-uvicorn` - FastAPI with Uvicorn
- `fastapi-gunicorn` - FastAPI with Gunicorn
- `django` - Django
- `django-rest` - Django REST Framework
- `django-cms` - Django CMS
- `flask` - Flask
- `flask-rest` - Flask REST API
- `flask-sqlalchemy` - Flask with SQLAlchemy

### JavaScript/TypeScript Backend
- `express` - Express.js
- `fastify` - Fastify
- `nestjs` - NestJS

## Installation

### Using npx (Recommended)

The easiest way to use Builder Project MCP Server is via npx, which downloads and runs the package automatically:

```bash
# Run directly with npx
npx builder-proj-mcp
```

### From Source

```bash
# Clone the repository
git clone <repository-url>
cd builder-proj-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### Global Installation

You can also install it globally to use it from anywhere:

```bash
# Install globally
npm install -g builder-proj-mcp

# Run the server
builder-proj-mcp
```

## Usage

### As MCP Server

Add to your MCP client configuration:

**Using npx (Recommended):**
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

**Using local installation:**
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

### Available Tools

#### 1. build_project

Build a new project with specified framework.

**Parameters:**
- `projectName` (string, required): Name of the project to create
- `projectType` (string, optional): Type of project (web, api, mobile, desktop)
- `framework` (string, required): Framework to use
- `options` (object, optional): Additional configuration options

**Example:**

```typescript
// Create a React project
{
  "projectName": "my-react-app",
  "framework": "react",
  "options": {
    "typescript": true
  }
}

// Create a Spring Boot project
{
  "projectName": "my-spring-app",
  "framework": "spring-boot",
  "options": {
    "javaVersion": "17",
    "springBootVersion": "3.2.0",
    "groupId": "com.example"
  }
}

// Create a FastAPI project
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

List all supported frameworks for project creation.

**Example:**
```typescript
{
  "name": "list_frameworks"
}
```

## Framework-Specific Options

### Spring Boot
- `javaVersion`: Java version (default: "17")
- `springBootVersion`: Spring Boot version (default: "3.2.0")
- `groupId`: Maven groupId (default: "com.example")
- `artifactId`: Maven artifactId (default: projectName)

### React/Vue/Vite
- `typescript`: Use TypeScript (default: true)

### Python (FastAPI/Django/Flask)
- `pythonVersion`: Python version (default: "3.11")
- `docker`: Include Docker configuration (default: true)
- `tests`: Include test setup (default: true)

## Project Structure

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

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start the server
npm start
```

## Architecture

The project follows a builder pattern with the following components:

- **ProjectBuilder Interface**: Defines the contract for all builders
- **BuilderFactory**: Manages and provides access to all builders
- **Framework Builders**: Individual implementations for each framework
- **MCP Server**: Handles tool registration and request processing

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues and questions, please open an issue on the repository.

---

**Language**: [English](README.md) | [中文](README.zh-CN.md)
