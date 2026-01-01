import { ProjectBuilder, ProjectConfig, BuilderResult } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class NestJSBuilder implements ProjectBuilder {
  supportedFrameworks = ['nestjs', 'nest', 'nestjs-rest', 'nestjs-graphql'];

  async build(config: ProjectConfig): Promise<BuilderResult> {
    const { projectName, framework, options = {}, outputPath } = config;
    const basePath = outputPath || process.cwd();
    const projectPath = path.resolve(basePath, projectName);

    try {
      await fs.mkdir(projectPath, { recursive: true });

      const useGraphQL = framework === 'nestjs-graphql';
      const useDocker = options.docker !== false;
      const useTests = options.tests !== false;

      await this.createPackageJson(projectPath, projectName, useGraphQL);
      await this.createSourceStructure(projectPath);
      await this.createMainApplication(projectPath, projectName);
      await this.createAppModule(projectPath, projectName);
      await this.createConfig(projectPath);
      await this.createGitignore(projectPath);

      if (useDocker) {
        await this.createDockerFiles(projectPath, projectName);
      }

      if (useTests) {
        await this.createTestStructure(projectPath, projectName);
      }

      return {
        success: true,
        message: `NestJS project '${projectName}' created successfully`,
        files: ['package.json', 'src/main.ts', 'src/app.module.ts', 'src/config.ts']
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create NestJS project',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async createPackageJson(projectPath: string, projectName: string, useGraphQL: boolean): Promise<void> {
    const dependencies: Record<string, string> = {
      '@nestjs/common': '^10.3.0',
      '@nestjs/core': '^10.3.0',
      '@nestjs/platform-express': '^10.3.0',
      '@nestjs/config': '^3.1.1',
      '@nestjs/swagger': '^7.1.17',
      'reflect-metadata': '^0.2.1',
      'rxjs': '^7.8.1',
      'class-validator': '^0.14.0',
      'class-transformer': '^0.5.1'
    };

    if (useGraphQL) {
      dependencies['@nestjs/graphql'] = '^12.0.11';
      dependencies['@apollo/server'] = '^4.9.5';
      dependencies['graphql'] = '^16.8.1';
    }

    const devDependencies = {
      '@nestjs/cli': '^10.3.0',
      '@nestjs/schematics': '^10.1.0',
      '@nestjs/testing': '^10.3.0',
      '@types/express': '^4.17.21',
      '@types/jest': '^29.5.11',
      '@types/node': '^20.10.5',
      '@typescript-eslint/eslint-plugin': '^6.18.0',
      '@typescript-eslint/parser': '^6.18.0',
      'eslint': '^8.56.0',
      'eslint-config-prettier': '^9.1.0',
      'eslint-plugin-prettier': '^5.1.2',
      'jest': '^29.7.0',
      'prettier': '^3.1.1',
      'source-map-support': '^0.5.21',
      'ts-jest': '^29.1.1',
      'ts-loader': '^9.5.1',
      'ts-node': '^10.9.2',
      'tsconfig-paths': '^4.2.0',
      'typescript': '^5.3.3'
    };

    const packageJson = {
      name: projectName,
      version: '0.0.1',
      description: 'NestJS application',
      author: '',
      private: true,
      license: 'MIT',
      scripts: {
        build: 'nest build',
        format: 'prettier --write "src/**/*.ts" "test/**/*.ts"',
        start: 'nest start',
        'start:dev': 'nest start --watch',
        'start:debug': 'nest start --debug --watch',
        'start:prod': 'node dist/main',
        lint: 'eslint "{src,apps,libs,test}/**/*.ts" --fix',
        test: 'jest',
        'test:watch': 'jest --watch',
        'test:cov': 'jest --coverage',
        'test:debug': 'node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand',
        'test:e2e': 'jest --config ./test/jest-e2e.json'
      },
      dependencies,
      devDependencies,
      jest: {
        moduleFileExtensions: ['js', 'json', 'ts'],
        rootDir: 'src',
        testRegex: '.*\\.spec\\.ts$',
        transform: {
          '^.+\\.(t|j)s$': 'ts-jest'
        },
        collectCoverageFrom: ['**/*.(t|j)s'],
        coverageDirectory: '../coverage',
        testEnvironment: 'node'
      }
    };

    await fs.writeFile(path.join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2));
  }

  private async createSourceStructure(projectPath: string): Promise<void> {
    const srcPath = path.join(projectPath, 'src');
    const modulesPath = path.join(srcPath, 'modules');
    const commonPath = path.join(srcPath, 'common');
    const decoratorsPath = path.join(commonPath, 'decorators');
    const filtersPath = path.join(commonPath, 'filters');
    const guardsPath = path.join(commonPath, 'guards');
    const interceptorsPath = path.join(commonPath, 'interceptors');
    const pipesPath = path.join(commonPath, 'pipes');

    await fs.mkdir(modulesPath, { recursive: true });
    await fs.mkdir(decoratorsPath, { recursive: true });
    await fs.mkdir(filtersPath, { recursive: true });
    await fs.mkdir(guardsPath, { recursive: true });
    await fs.mkdir(interceptorsPath, { recursive: true });
    await fs.mkdir(pipesPath, { recursive: true });
  }

  private async createMainApplication(projectPath: string, projectName: string): Promise<void> {
    const content = `import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('${projectName}')
    .setDescription('API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(\`Application is running on: http://localhost:\${port}\`);
  console.log(\`API Documentation: http://localhost:\${port}/api/docs\`);
}

bootstrap();
`;
    await fs.writeFile(path.join(projectPath, 'src', 'main.ts'), content);
  }

  private async createAppModule(projectPath: string, projectName: string): Promise<void> {
    const content = `import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
`;
    await fs.writeFile(path.join(projectPath, 'src', 'app.module.ts'), content);

    const controllerContent = `import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get welcome message' })
  @ApiResponse({ status: 200, description: 'Returns welcome message' })
  getHello(): { message: string } {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Returns health status' })
  getHealth(): { status: string; timestamp: string } {
    return this.appService.getHealth();
  }
}
`;
    await fs.writeFile(path.join(projectPath, 'src', 'app.controller.ts'), controllerContent);

    const serviceContent = `import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { message: string } {
    return { message: 'Welcome to NestJS Application' };
  }

  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
`;
    await fs.writeFile(path.join(projectPath, 'src', 'app.service.ts'), serviceContent);
  }

  private async createConfig(projectPath: string): Promise<void> {
    const content = `export const config = () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'nestjs',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
});
`;
    await fs.writeFile(path.join(projectPath, 'src', 'config.ts'), content);

    const envContent = `NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=nestjs

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=1d
`;
    await fs.writeFile(path.join(projectPath, '.env.example'), envContent);

    const nestCliContent = `{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "webpack": true
  }
}
`;
    await fs.writeFile(path.join(projectPath, 'nest-cli.json'), nestCliContent);
  }

  private async createDockerFiles(projectPath: string, projectName: string): Promise<void> {
    const dockerfile = `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]
`;
    await fs.writeFile(path.join(projectPath, 'Dockerfile'), dockerfile);

    const dockerCompose = `version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=nestjs
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
`;
    await fs.writeFile(path.join(projectPath, 'docker-compose.yml'), dockerCompose);
  }

  private async createTestStructure(projectPath: string, projectName: string): Promise<void> {
    const testPath = path.join(projectPath, 'test');
    await fs.mkdir(testPath, { recursive: true });

    const appSpecContent = `import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
      });
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'healthy');
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
`;
    await fs.writeFile(path.join(testPath, 'app.e2e-spec.ts'), appSpecContent);

    const jestE2eContent = `{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
`;
    await fs.writeFile(path.join(testPath, 'jest-e2e.json'), jestE2eContent);
  }

  private async createGitignore(projectPath: string): Promise<void> {
    const content = `# compiled output
/dist
/node_modules

# Logs
logs
*.log
npm-debug.log*
pnpm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# OS
.DS_Store

# Tests
/coverage
/.nyc_output

# IDEs and editors
/.idea
.project
.classpath
.c9/
*.launch
.settings/
*.sublime-workspace

# IDE - VSCode
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json

# Environment variables
.env
.env.local
.env.*.local

# Temporary files
*.swp
*.swo
*~
`;
    await fs.writeFile(path.join(projectPath, '.gitignore'), content);
  }
}
