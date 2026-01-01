import { ProjectBuilder, ProjectConfig, BuilderResult, BackendOptions } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class FastifyBuilder implements ProjectBuilder {
  supportedFrameworks = ['fastify', 'fastify-ts', 'fastify-rest'];

  async build(config: ProjectConfig): Promise<BuilderResult> {
    const { projectName, framework, options = {}, outputPath } = config;
    const basePath = outputPath || process.cwd();
    const projectPath = path.resolve(basePath, projectName);

    try {
      await fs.mkdir(projectPath, { recursive: true });

      const backendOptions = options as BackendOptions;
      const useTypeScript = framework === 'fastify-ts' || options.typescript !== false;
      const useRest = framework === 'fastify-rest';
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
        message: `Fastify project '${projectName}' created successfully`,
        files: ['package.json', 'src/app.ts', 'src/routes.ts', 'src/config.ts']
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create Fastify project',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async createPackageJson(projectPath: string, projectName: string, useTypeScript: boolean, useRest: boolean): Promise<void> {
    const dependencies: Record<string, string> = {
      fastify: '^4.25.2',
      '@fastify/cors': '^8.5.0',
      '@fastify/helmet': '^11.1.1',
      '@fastify/swagger': '^8.13.0',
      '@fastify/swagger-ui': '^2.1.0',
      'dotenv': '^16.3.1'
    };

    const devDependencies: Record<string, string> = {
      'nodemon': '^3.0.2',
      '@types/node': '^20.10.5',
      'typescript': '^5.3.3',
      'ts-node': '^10.9.2'
    };

    if (useRest) {
      dependencies['fastify-type-provider-zod'] = '^1.1.2';
      dependencies['zod'] = '^3.22.4';
    }

    const packageJson = {
      name: projectName,
      version: '1.0.0',
      description: 'Fastify application',
      main: useTypeScript ? 'dist/index.js' : 'src/index.js',
      scripts: {
        start: useTypeScript ? 'node dist/index.js' : 'node src/index.js',
        dev: useTypeScript ? 'nodemon src/index.ts' : 'nodemon src/index.js',
        build: useTypeScript ? 'tsc' : 'echo "No build needed for JavaScript"',
        test: 'tap'
      },
      dependencies,
      devDependencies: useTypeScript ? devDependencies : { nodemon: '^3.0.2' }
    };

    await fs.writeFile(path.join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2));
  }

  private async createSourceStructure(projectPath: string, useTypeScript: boolean): Promise<void> {
    const srcPath = path.join(projectPath, 'src');
    const pluginsPath = path.join(srcPath, 'plugins');
    const routesPath = path.join(srcPath, 'routes');
    const servicesPath = path.join(srcPath, 'services');

    await fs.mkdir(pluginsPath, { recursive: true });
    await fs.mkdir(routesPath, { recursive: true });
    await fs.mkdir(servicesPath, { recursive: true });
  }

  private async createMainApplication(projectPath: string, projectName: string, useTypeScript: boolean): Promise<void> {
    const ext = useTypeScript ? 'ts' : 'js';
    const content = `import Fastify from 'fastify';
import dotenv from 'dotenv';
import { registerPlugins } from './plugins';
import routes from './routes';

dotenv.config();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

const PORT = parseInt(process.env.PORT || '3000');

const start = async () => {
  try {
    await registerPlugins(fastify);
    
    fastify.get('/', async (request, reply) => {
      return { message: 'Welcome to ${projectName}' };
    });

    fastify.get('/health', async (request, reply) => {
      return { status: 'healthy', timestamp: new Date().toISOString() };
    });

    fastify.register(routes, { prefix: '/api' });

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(\`Server listening on port \${PORT}\`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

export default fastify;
`;
    await fs.writeFile(path.join(projectPath, 'src', `index.${ext}`), content);
  }

  private async createRoutes(projectPath: string, useTypeScript: boolean, useRest: boolean): Promise<void> {
    const ext = useTypeScript ? 'ts' : 'js';
    const content = `import { FastifyInstance } from 'fastify';

export default async function routes(fastify: FastifyInstance, options: any) {
  fastify.get('/', async (request, reply) => {
    return { message: 'API endpoint' };
  });

  ${useRest ? `fastify.post('/validate', async (request, reply) => {
    const { email, name } = request.body as { email: string; name: string };
    
    if (!email || !email.includes('@')) {
      return reply.status(400).send({ error: 'Invalid email' });
    }
    
    if (!name || name.length < 3) {
      return reply.status(400).send({ error: 'Name must be at least 3 characters' });
    }
    
    return { message: 'Validation passed', data: { email, name } };
  });` : ''}
}
`;
    await fs.writeFile(path.join(projectPath, 'src', `routes.${ext}`), content);

    const pluginsContent = `import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export async function registerPlugins(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: true
  });

  await fastify.register(helmet);

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Fastify API',
        description: 'API Documentation',
        version: '1.0.0'
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server'
        }
      ]
    }
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list'
    }
  });
}
`;
    await fs.writeFile(path.join(projectPath, 'src', 'plugins', `index.${ext}`), pluginsContent);
  }

  private async createConfig(projectPath: string, useTypeScript: boolean): Promise<void> {
    const ext = useTypeScript ? 'ts' : 'js';
    const content = `export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
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

    const envContent = `PORT=3000
NODE_ENV=development
LOG_LEVEL=info
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

    const testContent = `import { test } from 'tap';
import build from '../src/index';

test('${projectName} API', async (t) => {
  const app = build();

  t.test('GET /', async (t) => {
    const response = await app.inject({
      method: 'GET',
      url: '/'
    });
    
    t.equal(response.statusCode, 200);
    t.match(JSON.parse(response.payload), { message: 'Welcome to ${projectName}' });
  });

  t.test('GET /health', async (t) => {
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });
    
    t.equal(response.statusCode, 200);
    t.match(JSON.parse(response.payload), { status: 'healthy' });
  });

  t.test('GET /api', async (t) => {
    const response = await app.inject({
      method: 'GET',
      url: '/api'
    });
    
    t.equal(response.statusCode, 200);
    t.match(JSON.parse(response.payload), { message: 'API endpoint' });
  });

  await app.close();
});
`;
    await fs.writeFile(path.join(testsPath, `app.test.${useTypeScript ? 'ts' : 'js'}`), testContent);
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
