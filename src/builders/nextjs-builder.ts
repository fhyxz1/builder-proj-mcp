import { ProjectBuilder, ProjectConfig, BuilderResult, FrontendOptions } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class NextJSBuilder implements ProjectBuilder {
  supportedFrameworks = ['next', 'nextjs', 'next-app', 'next-pages'];

  async build(config: ProjectConfig): Promise<BuilderResult> {
    const { projectName, framework, options = {}, outputPath } = config;
    const basePath = outputPath || process.cwd();
    const projectPath = path.resolve(basePath, projectName);

    try {
      await fs.mkdir(projectPath, { recursive: true });

      const frontendOptions = options as FrontendOptions;
      const useTypeScript = frontendOptions.typescript !== false;
      const useAppRouter = framework === 'next' || framework === 'nextjs' || framework === 'next-app';

      await this.createNextJSProject(projectPath, projectName, useTypeScript, useAppRouter, frontendOptions);

      return {
        success: true,
        message: `Next.js project '${projectName}' created successfully`,
        files: ['package.json', 'next.config.js', 'src/app/page.tsx', 'src/app/layout.tsx']
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create Next.js project',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async createNextJSProject(
    projectPath: string,
    projectName: string,
    useTypeScript: boolean,
    useAppRouter: boolean,
    options: FrontendOptions
  ): Promise<void> {
    const ext = useTypeScript ? '.ts' : '.js';
    const tsExt = useTypeScript ? '.ts' : '.js';
    const tsxExt = useTypeScript ? '.tsx' : '.jsx';

    const { tailwind = false, stateManagement = 'none', router = true, eslint = true, prettier = true, testing = false } = options;

    const packageJson: any = {
      name: projectName,
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint'
      },
      dependencies: {
        'next': '^14.0.4',
        'react': '^18.2.0',
        'react-dom': '^18.2.0'
      },
      devDependencies: {
        '@types/node': '^20.10.5',
        '@types/react': '^18.2.45',
        '@types/react-dom': '^18.2.18',
        'typescript': '^5.3.3'
      }
    };

    if (useAppRouter) {
      packageJson.dependencies['next'] = '^14.0.4';
    } else {
      packageJson.dependencies['next'] = '^14.0.4';
    }

    if (stateManagement === 'zustand') {
      packageJson.dependencies['zustand'] = '^4.4.7';
    }

    if (stateManagement === 'redux') {
      packageJson.dependencies['@reduxjs/toolkit'] = '^2.0.1';
      packageJson.dependencies['react-redux'] = '^9.0.4';
    }

    if (tailwind) {
      packageJson.devDependencies['tailwindcss'] = '^3.3.6';
      packageJson.devDependencies['postcss'] = '^8.4.32';
      packageJson.devDependencies['autoprefixer'] = '^10.4.16';
    }

    if (eslint) {
      packageJson.devDependencies['eslint'] = '^8.56.0';
      packageJson.devDependencies['eslint-config-next'] = '^14.0.4';
    }

    if (prettier) {
      packageJson.devDependencies['prettier'] = '^3.1.1';
      packageJson.devDependencies['prettier-plugin-tailwindcss'] = '^0.5.7';
    }

    if (testing) {
      packageJson.devDependencies['@testing-library/react'] = '^14.1.2';
      packageJson.devDependencies['@testing-library/jest-dom'] = '^6.1.5';
      packageJson.devDependencies['jest'] = '^29.7.0';
      packageJson.devDependencies['jest-environment-jsdom'] = '^29.7.0';
    }

    await fs.writeFile(path.join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2));

    const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
`;
    await fs.writeFile(path.join(projectPath, `next.config.${ext}`), nextConfig);

    const tsconfig = `{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`;
    if (useTypeScript) {
      await fs.writeFile(path.join(projectPath, 'tsconfig.json'), tsconfig);
    }

    if (tailwind) {
      await this.createTailwindConfig(projectPath, useTypeScript);
    }

    if (useAppRouter) {
      await this.createAppRouterSourceFiles(projectPath, useTypeScript, tsxExt, tsExt, options);
    } else {
      await this.createPagesRouterSourceFiles(projectPath, useTypeScript, tsxExt, tsExt, options);
    }

    await this.createGitignore(projectPath);
    await this.createNextEnvFile(projectPath);
  }

  private async createAppRouterSourceFiles(
    projectPath: string,
    useTypeScript: boolean,
    tsxExt: string,
    tsExt: string,
    options: FrontendOptions
  ): Promise<void> {
    const srcPath = path.join(projectPath, 'src');
    const appPath = path.join(srcPath, 'app');
    await fs.mkdir(appPath, { recursive: true });

    const { tailwind = false, stateManagement = 'none', router = true } = options;

    const layoutContent = `'use client'

import { useState } from 'react'
import Link from 'next/link'
import './globals.${tailwind ? 'css' : 'css'}'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/">Home</Link>
          {router && (
            <>
              | <Link href="/about">About</Link>
              | <Link href="/posts">Posts</Link>
            </>
          )}
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
`;
    await fs.writeFile(path.join(appPath, `layout.tsx`), layoutContent);

    const pageContent = `import { useState } from 'react'
${stateManagement !== 'none' ? "import { useCounterStore } from '@/store/counter'" : ''}

export default function Home() {
  ${stateManagement !== 'none' ? "const count = useCounterStore((state) => state.count)" : 'const [count, setCount] = useState(0)'}
  
  return (
    <div>
      <h1>Next.js App Router</h1>
      <p>Count: ${stateManagement !== 'none' ? '{count}' : '{count}'}</p>
      <button onClick={() => ${stateManagement !== 'none' ? 'useCounterStore.getState().increment()' : 'setCount(c => c + 1)'}}>
        Increment
      </button>
    </div>
  )
}
`;
    await fs.writeFile(path.join(appPath, `page.tsx`), pageContent);

    const globalsCss = tailwind ? `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}
` : `:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}
`;
    await fs.writeFile(path.join(appPath, `globals.css`), globalsCss);

    if (router) {
      const aboutPagePath = path.join(appPath, 'about');
      await fs.mkdir(aboutPagePath, { recursive: true });
      
      const aboutPageContent = `import Link from 'next/link'

export default function AboutPage() {
  return (
    <div>
      <h1>About Page</h1>
      <Link href="/">Back to Home</Link>
    </div>
  )
}
`;
      await fs.writeFile(path.join(aboutPagePath, `page.tsx`), aboutPageContent);

      const postsPath = path.join(appPath, 'posts');
      await fs.mkdir(postsPath, { recursive: true });
      
      const postsPageContent = `import Link from 'next/link'

export default function PostsPage() {
  return (
    <div>
      <h1>Posts</h1>
      <p>Post list coming soon...</p>
      <Link href="/">Back to Home</Link>
    </div>
  )
}
`;
      await fs.writeFile(path.join(postsPath, `page.tsx`), postsPageContent);
    }

    if (stateManagement !== 'none') {
      const storePath = path.join(srcPath, 'store');
      await fs.mkdir(storePath, { recursive: true });

      if (stateManagement === 'zustand') {
        const zustandContent = `import { create } from 'zustand'

interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}))
`;
        await fs.writeFile(path.join(storePath, `counter.${tsExt}`), zustandContent);
      }

      if (stateManagement === 'redux') {
        const storePath2 = path.join(storePath, 'redux');
        await fs.mkdir(storePath2, { recursive: true });
        
        const counterSliceContent = `import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface CounterState {
  value: number
}

const initialState: CounterState = {
  value: 0,
}

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1
    },
    decrement: (state) => {
      state.value -= 1
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload
    },
  },
})

export const { increment, decrement, incrementByAmount } = counterSlice.actions
export default counterSlice.reducer
`;
        await fs.writeFile(path.join(storePath2, `counterSlice.${tsExt}`), counterSliceContent);

        const storeContent = `import { configureStore } from '@reduxjs/toolkit'
import counterReducer from './counterSlice'

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
`;
        await fs.writeFile(path.join(storePath2, `store.${tsExt}`), storeContent);
      }
    }
  }

  private async createPagesRouterSourceFiles(
    projectPath: string,
    useTypeScript: boolean,
    tsxExt: string,
    tsExt: string,
    options: FrontendOptions
  ): Promise<void> {
    const srcPath = path.join(projectPath, 'src');
    const pagesPath = path.join(srcPath, 'pages');
    const publicPath = path.join(projectPath, 'public');
    await fs.mkdir(pagesPath, { recursive: true });
    await fs.mkdir(publicPath, { recursive: true });

    const { tailwind = false, stateManagement = 'none', router = true } = options;

    const indexContent = `import { useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
${stateManagement !== 'none' ? "import { useCounterStore } from '@/store/counter'" : ''}

export default function Home() {
  ${stateManagement !== 'none' ? "const count = useCounterStore((state) => state.count)" : 'const [count, setCount] = useState(0)'}
  
  return (
    <>
      <Head>
        <title>Home - Next.js</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <nav>
        <Link href="/">Home</Link>
        {router && (
          <>
            | <Link href="/about">About</Link>
            | <Link href="/posts">Posts</Link>
          </>
        )}
      </nav>
      
      <main>
        <h1>Next.js Pages Router</h1>
        <p>Count: {count}</p>
        <button onClick={() => ${stateManagement !== 'none' ? 'useCounterStore.getState().increment()' : 'setCount(c => c + 1)'}}>
          Increment
        </button>
      </main>
    </>
  )
}
`;
    await fs.writeFile(path.join(pagesPath, `_app.tsx`), `import '@/styles/globals.${tailwind ? 'css' : 'css'}'
import type { AppProps } from 'next/app'
import Link from 'next/link'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <nav>
      <Link href="/">Home</Link>
    </nav>
  )
}
`);

    await fs.writeFile(path.join(pagesPath, `index.tsx`), indexContent);

    const globalsContent = tailwind ? `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}
` : `body {
  margin: 0;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}
`;

    const stylesPath = path.join(srcPath, 'styles');
    await fs.mkdir(stylesPath, { recursive: true });
    await fs.writeFile(path.join(stylesPath, `globals.${tailwind ? 'css' : 'css'}`), globalsContent);

    if (router) {
      const aboutPageContent = `import Link from 'next/link'
import Head from 'next/head'

export default function About() {
  return (
    <>
      <Head>
        <title>About</title>
      </Head>
      <h1>About Page</h1>
      <Link href="/">Back to Home</Link>
    </>
  )
}
`;
      await fs.writeFile(path.join(pagesPath, `about.tsx`), aboutPageContent);

      const postsPageContent = `import Link from 'next/link'
import Head from 'next/head'

export default function Posts() {
  return (
    <>
      <Head>
        <title>Posts</title>
      </Head>
      <h1>Posts</h1>
      <p>Post list coming soon...</p>
      <Link href="/">Back to Home</Link>
    </>
  )
}
`;
      await fs.writeFile(path.join(pagesPath, `posts.tsx`), postsPageContent);
    }

    const publicIndexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Next.js App</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>
`;
    await fs.writeFile(path.join(publicPath, 'index.html'), publicIndexHtml);

    if (stateManagement !== 'none') {
      const storePath = path.join(srcPath, 'store');
      await fs.mkdir(storePath, { recursive: true });

      if (stateManagement === 'zustand') {
        const zustandContent = `import { create } from 'zustand'

interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}))
`;
        await fs.writeFile(path.join(storePath, `counter.${tsExt}`), zustandContent);
      }

      if (stateManagement === 'redux') {
        const storePath2 = path.join(storePath, 'redux');
        await fs.mkdir(storePath2, { recursive: true });
        
        const counterSliceContent = `import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface CounterState {
  value: number
}

const initialState: CounterState = {
  value: 0,
}

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1
    },
    decrement: (state) => {
      state.value -= 1
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload
    },
  },
})

export const { increment, decrement, incrementByAmount } = counterSlice.actions
export default counterSlice.reducer
`;
        await fs.writeFile(path.join(storePath2, `counterSlice.${tsExt}`), counterSliceContent);

        const storeContent = `import { configureStore } from '@reduxjs/toolkit'
import counterReducer from './counterSlice'

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
`;
        await fs.writeFile(path.join(storePath2, `store.${tsExt}`), storeContent);
      }
    }
  }

  private async createTailwindConfig(projectPath: string, useTypeScript: boolean): Promise<void> {
    const ext = useTypeScript ? '.ts' : '.js';
    const configContent = `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config
`;
    await fs.writeFile(path.join(projectPath, `tailwind.config.${ext}`), configContent);

    const postcssConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;
    await fs.writeFile(path.join(projectPath, 'postcss.config.js'), postcssConfig);
  }

  private async createGitignore(projectPath: string): Promise<void> {
    const content = `# Dependencies
/node_modules
/.pnp
.pnp.js
.yarn/install-state.gz

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts
`;
    await fs.writeFile(path.join(projectPath, '.gitignore'), content);
  }

  private async createNextEnvFile(projectPath: string): Promise<void> {
    const content = `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
`;
    await fs.writeFile(path.join(projectPath, 'next-env.d.ts'), content);
  }
}
