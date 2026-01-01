import { ProjectBuilder, ProjectConfig, BuilderResult, BackendOptions } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ExpressBuilder implements ProjectBuilder {
  supportedFrameworks = ['express', 'express-ts', 'express-rest'];

  async build(config: ProjectConfig): Promise<BuilderResult> {
    const { projectName, framework, options = {}, outputPath } = config;
    const basePath = outputPath || process.cwd();
    const projectPath = path.resolve(basePath, projectName);

    try {
      await fs.mkdir(projectPath, { recursive: true });

      const backendOptions = options as BackendOptions;
      const useTypeScript = framework === 'express-ts' || backendOptions.typescript !== false;
      const useRest = framework === 'express-rest';
      const useDocker = backendOptions.docker !== false;
      const useTests = backendOptions.tests !== false;

      await this.createPackageJson(projectPath, projectName, useTypeScript, useRest);
      await this.createSourceStructure(projectPath, useTypeScript);
      await this.createMainApplication(projectPath, projectName, useTypeScript);
      await this.createRoutes(projectPath, useTypeScript, useRest);
      await this.createConfig(projectPath, useTypeScript);
      await this.createGitignore(projectPath);

      if (useDocker) {
        await this.createDockerFiles(projectPath, projectName);
      }

      if (useTests) {
        await this.createTestStructure(projectPath, projectName, useTypeScript);
      }

      return {
        success: true,
        message: `Express project '${projectName}' created successfully`,
        files: ['package.json', 'src/app.ts', 'src/routes.ts', 'src/config.ts']
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create Express project',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async createPackageJson(projectPath: string, projectName: string, useTypeScript: boolean, useRest: boolean): Promise<void> {
    const dependencies: Record<string, string> = {
      express: '^4.18.2',
      dotenv: '^16.3.1',
      cors: '^2.8.5',
      'helmet': '^7.1.0',
      'morgan': '^1.10.0'
    };

    const devDependencies: Record<string, string> = {
      'nodemon': '^3.0.2',
      '@types/express': '^4.17.21',
      '@types/node': '^20.10.5',
      '@types/cors': '^2.8.17',
      '@types/morgan': '^1.9.9',
      'typescript': '^5.3.3',
      'ts-node': '^10.9.2'
    };

    if (useRest) {
      dependencies['express-validator'] = '^7.0.1';
    }

    const packageJson = {
      name: projectName,
      version: '1.0.0',
      description: 'Express application',
      main: useTypeScript ? 'dist/index.js' : 'src/index.js',
      scripts: {
        start: useTypeScript ? 'node dist/index.js' : 'node src/index.js',
        dev: useTypeScript ? 'nodemon src/index.ts' : 'nodemon src/index.js',
        build: useTypeScript ? 'tsc' : 'echo "No build needed for JavaScript"',
        test: 'jest'
      },
      dependencies,
      devDependencies: useTypeScript ? devDependencies : { nodemon: '^3.0.2' }
    };

    await fs.writeFile(path.join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2));
  }

  private async createSourceStructure(projectPath: string, useTypeScript: boolean): Promise<void> {
    const srcPath = path.join(projectPath, 'src');
    const controllersPath = path.join(srcPath, 'controllers');
    const middlewarePath = path.join(srcPath, 'middleware');
    const servicesPath = path.join(srcPath, 'services');

    await fs.mkdir(controllersPath, { recursive: true });
    await fs.mkdir(middlewarePath, { recursive: true });
    await fs.mkdir(servicesPath, { recursive: true });
  }

  private async createMainApplication(projectPath: string, projectName: string, useTypeScript: boolean): Promise<void> {
    const ext = useTypeScript ? 'ts' : 'js';
    const content = `import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to ${projectName}' });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(\`Server is running on port \${PORT}\`);
});

export default app;
`;
    await fs.writeFile(path.join(projectPath, 'src', `index.${ext}`), content);
  }

  private async createRoutes(projectPath: string, useTypeScript: boolean, useRest: boolean): Promise<void> {
    const ext = useTypeScript ? 'ts' : 'js';
    const content = `import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'API endpoint' });
});

${useRest ? `import { body, validationResult } from 'express-validator';

router.post('/validate', [
  body('email').isEmail(),
  body('name').isLength({ min: 3 })
], (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  res.json({ message: 'Validation passed', data: req.body });
});` : ''}

export default router;
`;
    await fs.writeFile(path.join(projectPath, 'src', `routes.${ext}`), content);
  }

  private async createConfig(projectPath: string, useTypeScript: boolean): Promise<void> {
    const ext = useTypeScript ? 'ts' : 'js';
    const content = `export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'mydb',
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || 'password'
  }
};
`;
    await fs.writeFile(path.join(projectPath, 'src', `config.${ext}`), content);

    const errorHandlerContent = `import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
};
`;
    await fs.writeFile(path.join(projectPath, 'src', 'middleware', `errorHandler.${ext}`), errorHandlerContent);

    const envContent = `PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=user
DB_PASSWORD=password
`;
    await fs.writeFile(path.join(projectPath, '.env.example'), envContent);
  }

  private async createDockerFiles(projectPath: string, projectName: string): Promise<void> {
    const dockerfile = `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
`;
    await fs.writeFile(path.join(projectPath, 'Dockerfile'), dockerfile);

    const dockerCompose = `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
`;
    await fs.writeFile(path.join(projectPath, 'docker-compose.yml'), dockerCompose);
  }

  private async createTestStructure(projectPath: string, projectName: string, useTypeScript: boolean): Promise<void> {
    const testsPath = path.join(projectPath, 'tests');
    await fs.mkdir(testsPath, { recursive: true });

    const testContent = `import request from 'supertest';
import app from '../src/index';

describe('${projectName} API', () => {
  it('should return welcome message', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Welcome to ${projectName}');
  });

  it('should return health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });
});
`;
    await fs.writeFile(path.join(testsPath, `app.test.${useTypeScript ? 'ts' : 'js'}`), testContent);

    const jestConfig = `module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts'
  ],
  testMatch: [
    '**/tests/**/*.test.{js,ts}'
  ]
};
`;
    await fs.writeFile(path.join(projectPath, 'jest.config.js'), jestConfig);
  }

  private async createGitignore(projectPath: string): Promise<void> {
    const content = `# Dependencies
node_modules/
package-lock.json
yarn.lock

# Build output
dist/
build/

# Environment variables
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage/
.nyc_output/

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
`;
    await fs.writeFile(path.join(projectPath, '.gitignore'), content);
  }
}
