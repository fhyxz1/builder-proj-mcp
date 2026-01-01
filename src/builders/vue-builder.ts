import { ProjectBuilder, ProjectConfig, BuilderResult } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class VueBuilder implements ProjectBuilder {
  supportedFrameworks = ['vue', 'vue3', 'vue-vite'];

  async build(config: ProjectConfig): Promise<BuilderResult> {
    const { projectName, framework, options = {}, outputPath } = config;
    const basePath = outputPath || process.cwd();
    const projectPath = path.resolve(basePath, projectName);

    try {
      await fs.mkdir(projectPath, { recursive: true });

      const useTypeScript = options.typescript !== false;

      await this.createVueProject(projectPath, projectName, useTypeScript, options);

      return {
        success: true,
        message: `Vue project '${projectName}' created successfully`,
        files: ['package.json', 'src/App.vue', 'src/main.ts', 'index.html']
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create Vue project',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async createVueProject(projectPath: string, projectName: string, useTypeScript: boolean, options: any): Promise<void> {
    const tsExt = useTypeScript ? '.ts' : '.js';
    const vueExt = useTypeScript ? '.vue' : '.vue';

    const packageJson = {
      name: projectName,
      version: '0.0.0',
      private: true,
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      },
      dependencies: {
        vue: '^3.3.11'
      },
      devDependencies: {
        '@vitejs/plugin-vue': '^5.0.0',
        typescript: '^5.3.3',
        vite: '^5.0.8'
      }
    };

    await fs.writeFile(path.join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2));

    const viteConfig = `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})
`;
    await fs.writeFile(path.join(projectPath, `vite.config${tsExt}`), viteConfig);

    if (useTypeScript) {
      const tsconfig = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
`;
      await fs.writeFile(path.join(projectPath, 'tsconfig.json'), tsconfig);
      await fs.writeFile(path.join(projectPath, 'tsconfig.node.json'), `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}`);
    }

    await this.createVueSourceFiles(projectPath, useTypeScript, tsExt);
    await this.createIndexHtml(projectPath, projectName);
    await this.createGitignore(projectPath);
  }

  private async createVueSourceFiles(projectPath: string, useTypeScript: boolean, tsExt: string): Promise<void> {
    const srcPath = path.join(projectPath, 'src');
    await fs.mkdir(srcPath, { recursive: true });

    const appContent = `<script setup${useTypeScript ? ' lang="ts"' : ''}>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <h1>{{ count }}</h1>
  <button type="button" @click="count++">count is {{ count }}</button>
</template>

<style scoped>
button {
  font-weight: bold;
}
</style>
`;
    await fs.writeFile(path.join(srcPath, 'App.vue'), appContent);

    const mainContent = `import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')
`;
    await fs.writeFile(path.join(srcPath, `main${tsExt}`), mainContent);

    const styleContent = `:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

#app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

@media (prefers-color-scheme: light) {
  :root {
    color: #213547;
    background-color: #ffffff;
  }
}
`;
    await fs.writeFile(path.join(srcPath, 'style.css'), styleContent);

    const assetsPath = path.join(srcPath, 'assets');
    await fs.mkdir(assetsPath, { recursive: true });
  }

  private async createIndexHtml(projectPath: string, projectName: string): Promise<void> {
    const content = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;
    await fs.writeFile(path.join(projectPath, 'index.html'), content);
  }

  private async createGitignore(projectPath: string): Promise<void> {
    const content = `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
`;
    await fs.writeFile(path.join(projectPath, '.gitignore'), content);
  }
}
