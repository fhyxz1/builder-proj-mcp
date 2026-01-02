import { ProjectBuilder, ProjectConfig, BuilderResult, FrontendOptions } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class NuxtBuilder implements ProjectBuilder {
  supportedFrameworks = ['nuxt', 'nuxt3'];

  async build(config: ProjectConfig): Promise<BuilderResult> {
    const { projectName, framework, options = {}, outputPath } = config;
    const basePath = outputPath || process.cwd();
    const projectPath = path.resolve(basePath, projectName);

    try {
      await fs.mkdir(projectPath, { recursive: true });

      const frontendOptions = options as FrontendOptions;
      const useTypeScript = frontendOptions.typescript !== false;

      await this.createNuxtProject(projectPath, projectName, useTypeScript, frontendOptions);

      return {
        success: true,
        message: `Nuxt.js project '${projectName}' created successfully`,
        files: ['package.json', 'nuxt.config.ts', 'app.vue', 'pages/index.vue']
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create Nuxt.js project',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async createNuxtProject(projectPath: string, projectName: string, useTypeScript: boolean, options: FrontendOptions): Promise<void> {
    const ext = useTypeScript ? '.ts' : '.js';

    const { tailwind = false, stateManagement = 'none', eslint = true, prettier = true, testing = false } = options;

    const packageJson: any = {
      name: projectName,
      version: '0.1.0',
      private: true,
      scripts: {
        build: 'nuxt build',
        dev: 'nuxt dev',
        generate: 'nuxt generate',
        preview: 'nuxt preview',
        postinstall: 'nuxt prepare'
      },
      dependencies: {
        'nuxt': '^3.9.0',
        'vue': '^3.4.0',
        'vue-router': '^4.2.5'
      },
      devDependencies: {
        '@nuxt/devtools': 'latest',
        'typescript': '^5.3.3'
      }
    };

    if (stateManagement === 'pinia') {
      packageJson.dependencies['pinia'] = '^2.1.7';
      packageJson.devDependencies['@pinia/nuxt'] = '^0.5.1';
    }

    if (tailwind) {
      packageJson.devDependencies['@nuxtjs/tailwindcss'] = '^6.10.1';
    }

    if (eslint) {
      packageJson.devDependencies['@nuxt/eslint'] = '^0.1.0';
      packageJson.devDependencies['eslint'] = '^8.56.0';
    }

    if (prettier) {
      packageJson.devDependencies['prettier'] = '^3.1.1';
    }

    if (testing) {
      packageJson.devDependencies['@vue/test-utils'] = '^2.4.3';
      packageJson.devDependencies['vitest'] = '^1.1.0';
      packageJson.devDependencies['@nuxt/test-utils'] = '^3.9.0';
    }

    await fs.writeFile(path.join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2));

    const nuxtConfig = `export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [${
    tailwind ? "'@nuxtjs/tailwindcss'," : ''
  }${stateManagement === 'pinia' ? "\n    '@pinia/nuxt'," : ''}
  ],
  typescript: {
    strict: true
  },
  css: ['~/assets/css/main.css'],
})
`;
    await fs.writeFile(path.join(projectPath, `nuxt.config.${ext}`), nuxtConfig);

    if (useTypeScript) {
      const tsConfig = `{
  "extends": "./.nuxt/tsconfig.json"
}
`;
      await fs.writeFile(path.join(projectPath, 'tsconfig.json'), tsConfig);
    }

    await this.createNuxtSourceFiles(projectPath, useTypeScript, ext, options);
    await this.createGitignore(projectPath);
  }

  private async createNuxtSourceFiles(projectPath: string, useTypeScript: boolean, ext: string, options: FrontendOptions): Promise<void> {
    const { tailwind = false, stateManagement = 'none' } = options;

    const appContent = `<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
`;
    await fs.writeFile(path.join(projectPath, 'app.vue'), appContent);

    const pagesPath = path.join(projectPath, 'pages');
    await fs.mkdir(pagesPath, { recursive: true });

    const indexPageContent = `<template>
  <div>
    <h1>Nuxt.js 3</h1>
    <p>Welcome to your Nuxt.js application!</p>
    <nav>
      <NuxtLink to="/">Home</NuxtLink> |
      <NuxtLink to="/about">About</NuxtLink> |
      <NuxtLink to="/counter">Counter</NuxtLink>
    </nav>
  </div>
</template>

<script setup${useTypeScript ? ' lang="ts"' : ''}>
const title = ref('Home Page')
useHead({
  title: title.value,
})
</script>
`;
    await fs.writeFile(path.join(pagesPath, `index.vue`), indexPageContent);

    const aboutPageContent = `<template>
  <div>
    <h1>About Page</h1>
    <NuxtLink to="/">Back to Home</NuxtLink>
  </div>
</template>

<script setup${useTypeScript ? ' lang="ts"' : ''}>
const title = ref('About Page')
useHead({
  title: title.value,
})
</script>
`;
    await fs.writeFile(path.join(pagesPath, `about.vue`), aboutPageContent);

    const counterPagePath = path.join(pagesPath, 'counter');
    await fs.mkdir(counterPagePath, { recursive: true });

    const counterPageContent = `<template>
  <div>
    <h1>Counter</h1>
    <p>Count: ${stateManagement === 'pinia' ? '{{ counter.count }}' : '{{ count }}'}</p>
    <button @click="increment">Increment</button>
    <button @click="decrement">Decrement</button>
    <br />
    <NuxtLink to="/">Back to Home</NuxtLink>
  </div>
</template>

<script setup${useTypeScript ? ' lang="ts"' : ''}>
${stateManagement === 'pinia'
  ? `import { useCounterStore } from '~/stores/counter'
const counter = useCounterStore()`
  : `const count = ref(0)
const increment = () => count.value++
const decrement = () => count.value--`
}

const title = ref('Counter')
useHead({
  title: title.value,
})
</script>
`;
    await fs.writeFile(path.join(counterPagePath, `index.vue`), counterPageContent);

    const layoutsPath = path.join(projectPath, 'layouts');
    await fs.mkdir(layoutsPath, { recursive: true });

    const defaultLayoutContent = `<template>
  <div>
    <header>
      <slot />
    </header>
  </div>
</template>
`;
    await fs.writeFile(path.join(layoutsPath, `default.vue`), defaultLayoutContent);

    const assetsPath = path.join(projectPath, 'assets');
    await fs.mkdir(path.join(assetsPath, 'css'), { recursive: true });

    const cssContent = tailwind ? `@tailwind base;
@tailwind components;
@tailwind utilities;
` : `:root {
  --primary-color: #00C160;
}

body {
  margin: 0;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

nav {
  margin: 20px 0;
}

nav a {
  color: #00C160;
  text-decoration: none;
  margin: 0 10px;
}

nav a:hover {
  text-decoration: underline;
}

button {
  background: #00C160;
  color: white;
  border: none;
  padding: 8px 16px;
  margin: 5px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  opacity: 0.9;
}
`;
    await fs.writeFile(path.join(assetsPath, 'css', 'main.css'), cssContent);

    if (stateManagement === 'pinia') {
      const storesPath = path.join(projectPath, 'stores');
      await fs.mkdir(storesPath, { recursive: true });

      const piniaStoreContent = `import { defineStore } from 'pinia'

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
      await fs.writeFile(path.join(storesPath, `counter.${ext}`), piniaStoreContent);
    }

    const publicPath = path.join(projectPath, 'public');
    await fs.mkdir(publicPath, { recursive: true });

    const faviconContent = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" fill="#00C160" rx="4"/>
  <text x="50%" y="55%" text-anchor="middle" fill="white" font-size="16" font-weight="bold">N</text>
</svg>
`;
    await fs.writeFile(path.join(publicPath, 'favicon.svg'), faviconContent);
  }

  private async createGitignore(projectPath: string): Promise<void> {
    const content = `# Nuxt dev/build outputs
.output
.data
.nuxt
.nitro
.cache
dist

# Node dependencies
node_modules

# Logs
logs
*.log

# Misc
.DS_Store
.fleet
.idea

# Local env files
.env
.env.*
!.env.example
`;
    await fs.writeFile(path.join(projectPath, '.gitignore'), content);
  }
}
