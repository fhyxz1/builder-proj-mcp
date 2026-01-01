import { ProjectBuilder, ProjectConfig, BuilderResult, FrontendOptions } from '../types.js';
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

      const useTypeScript = (options as FrontendOptions).typescript !== false;
      const frontendOptions = options as FrontendOptions;

      await this.createVueProject(projectPath, projectName, useTypeScript, frontendOptions);

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

  private async createVueProject(projectPath: string, projectName: string, useTypeScript: boolean, options: FrontendOptions): Promise<void> {
    const tsExt = useTypeScript ? '.ts' : '.js';
    const vueExt = useTypeScript ? '.vue' : '.vue';

    const { tailwind = false, stateManagement = 'none', router = false, eslint = true, prettier = true } = options;

    const packageJson: any = {
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

    if (stateManagement === 'pinia') {
      packageJson.dependencies['pinia'] = '^2.1.7';
    }

    if (router) {
      packageJson.dependencies['vue-router'] = '^4.2.5';
    }

    if (tailwind) {
      packageJson.devDependencies['tailwindcss'] = '^3.3.6';
      packageJson.devDependencies['postcss'] = '^8.4.32';
      packageJson.devDependencies['autoprefixer'] = '^10.4.16';
    }

    if (eslint) {
      packageJson.devDependencies['eslint'] = '^8.55.0';
      packageJson.devDependencies['eslint-plugin-vue'] = '^9.19.2';
      packageJson.devDependencies['@vue/eslint-config-typescript'] = '^12.0.0';
    }

    if (prettier) {
      packageJson.devDependencies['prettier'] = '^3.1.0';
      packageJson.devDependencies['prettier-plugin-vue'] = '^1.1.0';
    }

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

    if (tailwind) {
      await this.createTailwindConfig(projectPath, useTypeScript);
    }

    await this.createVueSourceFiles(projectPath, useTypeScript, tsExt, options);
    await this.createIndexHtml(projectPath, projectName, router);
    await this.createGitignore(projectPath);
  }

  private async createVueSourceFiles(projectPath: string, useTypeScript: boolean, tsExt: string, options: FrontendOptions): Promise<void> {
    const srcPath = path.join(projectPath, 'src');
    await fs.mkdir(srcPath, { recursive: true });

    const { tailwind = false, stateManagement = 'none', router = false } = options;

    let appContent = '';
    let mainContent = '';

    if (router) {
      const routerContent = `import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import About from '../views/About.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/about', name: 'About', component: About }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
`;
      const viewsPath = path.join(srcPath, 'views');
      await fs.mkdir(viewsPath, { recursive: true });

      const homeViewContent = `<template>
  <div class="home">
    <h1>Home Page</h1>
    <router-link to="/about">Go to About</router-link>
  </div>
</template>
`;
      await fs.writeFile(path.join(viewsPath, 'Home.vue'), homeViewContent);

      const aboutViewContent = `<template>
  <div class="about">
    <h1>About Page</h1>
    <router-link to="/">Go Home</router-link>
  </div>
</template>
`;
      await fs.writeFile(path.join(viewsPath, 'About.vue'), aboutViewContent);

      const routerPath = path.join(srcPath, 'router');
      await fs.mkdir(routerPath, { recursive: true });
      await fs.writeFile(path.join(routerPath, `index${tsExt}`), routerContent);

      appContent = `<script setup${useTypeScript ? ' lang="ts"' : ''}>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div>
    <nav>
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>
    </nav>
    <h1>{{ count }}</h1>
    <button type="button" @click="count++">count is {{ count }}</button>
    <router-view />
  </div>
</template>

<style scoped>
nav {
  padding: 1rem;
}

nav a {
  color: #2c3e50;
  text-decoration: none;
}

nav a.router-link-exact-active {
  color: #42b983;
}

button {
  font-weight: bold;
  margin: 0.5rem;
}
</style>
`;
      mainContent = `import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')
`;
    } else {
      appContent = `<script setup${useTypeScript ? ' lang="ts"' : ''}>
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
      mainContent = `import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')
`;
    }

    await fs.writeFile(path.join(srcPath, 'App.vue'), appContent);
    await fs.writeFile(path.join(srcPath, `main${tsExt}`), mainContent);

    const styleContent = tailwind ? `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}
` : `:root {
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

    if (stateManagement === 'pinia') {
      await this.createPiniaStore(srcPath, tsExt);
    }
  }

  private async createTailwindConfig(projectPath: string, useTypeScript: boolean): Promise<void> {
    const ext = useTypeScript ? '.ts' : '.js';
    const configContent = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;
    await fs.writeFile(path.join(projectPath, `tailwind.config${ext}`), configContent);

    const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;
    await fs.writeFile(path.join(projectPath, 'postcss.config.js'), postcssConfig);
  }

  private async createPiniaStore(srcPath: string, tsExt: string): Promise<void> {
    const storesPath = path.join(srcPath, 'stores');
    await fs.mkdir(storesPath, { recursive: true });

    const storeContent = `import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)

  function increment() {
    count.value++
  }

  function decrement() {
    count.value--
  }

  function reset() {
    count.value = 0
  }

  return { count, increment, decrement, reset }
})
`;
    await fs.writeFile(path.join(storesPath, `counter${tsExt}`), storeContent);
  }

  private async createIndexHtml(projectPath: string, projectName: string, hasRouter: boolean = false): Promise<void> {
    const scriptSrc = hasRouter ? '/src/main.ts' : '/src/main.ts';
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
    <script type="module" src="${scriptSrc}"></script>
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
