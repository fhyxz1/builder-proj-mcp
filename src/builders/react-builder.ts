import { ProjectBuilder, ProjectConfig, BuilderResult } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ReactBuilder implements ProjectBuilder {
  supportedFrameworks = ['react', 'react-vite', 'react-cra'];

  async build(config: ProjectConfig): Promise<BuilderResult> {
    const { projectName, framework, options = {}, outputPath } = config;
    const basePath = outputPath || process.cwd();
    const projectPath = path.resolve(basePath, projectName);

    try {
      await fs.mkdir(projectPath, { recursive: true });

      const useTypeScript = options.typescript !== false;
      const useVite = framework === 'react-vite' || framework === 'react';

      if (useVite) {
        await this.createViteReactProject(projectPath, projectName, useTypeScript, options);
      } else {
        await this.createCRAProject(projectPath, projectName, useTypeScript, options);
      }

      return {
        success: true,
        message: `React project '${projectName}' created successfully`,
        files: ['package.json', 'src/App.tsx', 'src/main.tsx', 'index.html']
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create React project',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async createViteReactProject(projectPath: string, projectName: string, useTypeScript: boolean, options: any): Promise<void> {
    const tsConfig = useTypeScript ? 'ts' : 'js';
    const tsxExt = useTypeScript ? '.tsx' : '.jsx';
    const tsExt = useTypeScript ? '.ts' : '.js';

    const packageJson = {
      name: projectName,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        lint: 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0'
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0'
      },
      devDependencies: {
        '@types/react': '^18.2.43',
        '@types/react-dom': '^18.2.17',
        '@vitejs/plugin-react': '^4.2.1',
        'eslint': '^8.55.0',
        'eslint-plugin-react-hooks': '^4.6.0',
        'eslint-plugin-react-refresh': '^0.4.5',
        'typescript': '^5.2.2',
        'vite': '^5.0.8'
      }
    };

    await fs.writeFile(path.join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2));

    const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`;
    await fs.writeFile(path.join(projectPath, `vite.config.${tsExt}`), viteConfig);

    const tsconfig = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
`;
    if (useTypeScript) {
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

    await this.createReactSourceFiles(projectPath, useTypeScript, tsxExt, tsExt);
    await this.createIndexHtml(projectPath, projectName);
    await this.createGitignore(projectPath);
  }

  private async createCRAProject(projectPath: string, projectName: string, useTypeScript: boolean, options: any): Promise<void> {
    const tsxExt = useTypeScript ? '.tsx' : '.jsx';
    const tsExt = useTypeScript ? '.ts' : '.js';

    const packageJson = {
      name: projectName,
      version: '0.1.0',
      private: true,
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-scripts': '5.0.1',
        'web-vitals': '^2.1.4'
      },
      scripts: {
        start: 'react-scripts start',
        build: 'react-scripts build',
        test: 'react-scripts test',
        eject: 'react-scripts eject'
      },
      eslintConfig: {
        extends: ['react-app', 'react-app/jest']
      },
      browserslist: {
        production: ['>0.2%', 'not dead', 'not op_mini all'],
        development: ['last 1 chrome version', 'last 1 firefox version', 'last 1 safari version']
      }
    };

    await fs.writeFile(path.join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2));

    if (useTypeScript) {
      const tsconfig = `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}`;
      await fs.writeFile(path.join(projectPath, 'tsconfig.json'), tsconfig);
    }

    await this.createReactSourceFiles(projectPath, useTypeScript, tsxExt, tsExt);
    await this.createPublicFolder(projectPath, projectName);
    await this.createGitignore(projectPath);
  }

  private async createReactSourceFiles(projectPath: string, useTypeScript: boolean, tsxExt: string, tsExt: string): Promise<void> {
    const srcPath = path.join(projectPath, 'src');
    await fs.mkdir(srcPath, { recursive: true });

    const appContent = `import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App${tsxExt}'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App${tsxExt}</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
`;
    await fs.writeFile(path.join(srcPath, `App${tsxExt}`), appContent);

    const mainContent = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App${tsxExt}'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;
    await fs.writeFile(path.join(srcPath, `main${tsxExt}`), mainContent);

    const cssContent = `:root {
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

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}
a:hover {
  color: #535bf2;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}
button:hover {
  border-color: #646cff;
}
button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

@media (prefers-color-scheme: light) {
  :root {
    color: #213547;
    background-color: #ffffff;
  }
  a:hover {
    color: #747bff;
  }
  button {
    background-color: #f9f9f9;
  }
}
`;
    await fs.writeFile(path.join(srcPath, 'index.css'), cssContent);

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
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
    await fs.writeFile(path.join(projectPath, 'index.html'), content);
  }

  private async createPublicFolder(projectPath: string, projectName: string): Promise<void> {
    const publicPath = path.join(projectPath, 'public');
    await fs.mkdir(publicPath, { recursive: true });

    const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Web site created using create-react-app" />
    <title>${projectName}</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
`;
    await fs.writeFile(path.join(publicPath, 'index.html'), indexHtml);
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
