import { ProjectBuilder, ProjectConfig, BuilderResult } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ViteBuilder implements ProjectBuilder {
  supportedFrameworks = ['vite', 'vite-vanilla', 'vite-ts'];

  async build(config: ProjectConfig): Promise<BuilderResult> {
    const { projectName, framework, options = {}, outputPath } = config;
    const basePath = outputPath || process.cwd();
    const projectPath = path.resolve(basePath, projectName);

    try {
      await fs.mkdir(projectPath, { recursive: true });

      const useTypeScript = framework === 'vite-ts' || options.typescript !== false;

      await this.createViteProject(projectPath, projectName, useTypeScript);

      return {
        success: true,
        message: `Vite project '${projectName}' created successfully`,
        files: ['package.json', 'index.html', 'src/main.js']
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create Vite project',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async createViteProject(projectPath: string, projectName: string, useTypeScript: boolean): Promise<void> {
    const jsExt = useTypeScript ? 'ts' : 'js';

    const packageJson = {
      name: projectName,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      },
      devDependencies: {
        vite: '^5.0.8'
      }
    };

    await fs.writeFile(path.join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2));

    const viteConfig = `import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    open: true
  }
})
`;
    await fs.writeFile(path.join(projectPath, `vite.config.${jsExt}`), viteConfig);

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
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}`;
      await fs.writeFile(path.join(projectPath, 'tsconfig.json'), tsconfig);
    }

    await this.createSourceFiles(projectPath, useTypeScript, jsExt);
    await this.createIndexHtml(projectPath, projectName);
    await this.createGitignore(projectPath);
  }

  private async createSourceFiles(projectPath: string, useTypeScript: boolean, jsExt: string): Promise<void> {
    const srcPath = path.join(projectPath, 'src');
    await fs.mkdir(srcPath, { recursive: true });

    const mainContent = `import './style.css'

document.querySelector('#app').innerHTML = \`
  <h1>Hello Vite!</h1>
  <a href="https://vitejs.dev/guide/features.html" target="_blank">Documentation</a>
\`
`;
    await fs.writeFile(path.join(srcPath, `main.${jsExt}`), mainContent);

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
  }

  private async createIndexHtml(projectPath: string, projectName: string): Promise<void> {
    const content = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
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
