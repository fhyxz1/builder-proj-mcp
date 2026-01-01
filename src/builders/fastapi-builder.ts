import { ProjectBuilder, ProjectConfig, BuilderResult, BackendOptions } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class FastAPIBuilder implements ProjectBuilder {
  supportedFrameworks = ['fastapi', 'fastapi-uvicorn', 'fastapi-gunicorn'];

  async build(config: ProjectConfig): Promise<BuilderResult> {
    const { projectName, framework, options = {}, outputPath } = config;
    const basePath = outputPath || process.cwd();
    const projectPath = path.resolve(basePath, projectName);

    try {
      await fs.mkdir(projectPath, { recursive: true });

      const backendOptions = options as BackendOptions;
      const pythonVersion = backendOptions.pythonVersion || '3.11';
      const useDocker = backendOptions.docker !== false;
      const useTests = backendOptions.tests !== false;

      await this.createPyprojectToml(projectPath, projectName, pythonVersion);
      await this.createSourceStructure(projectPath, projectName);
      await this.createMainApplication(projectPath, projectName);
      await this.createRequirements(projectPath);
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
        message: `FastAPI project '${projectName}' created successfully`,
        files: ['pyproject.toml', 'app/main.py', 'app/config.py', 'requirements.txt']
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create FastAPI project',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async createPyprojectToml(projectPath: string, projectName: string, pythonVersion: string): Promise<void> {
    const content = `[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[project]
name = "${projectName}"
version = "0.1.0"
description = "FastAPI project"
requires-python = ">=${pythonVersion}"
dependencies = [
    "fastapi>=0.104.0",
    "uvicorn[standard]>=0.24.0",
    "pydantic>=2.0.0",
    "pydantic-settings>=2.0.0",
    "python-dotenv>=1.0.0",
]

[tool.setuptools.packages.find]
where = ["src"]

[tool.black]
line-length = 88
target-version = ['py311']

[tool.isort]
profile = "black"
line_length = 88
`;
    await fs.writeFile(path.join(projectPath, 'pyproject.toml'), content);
  }

  private async createSourceStructure(projectPath: string, projectName: string): Promise<void> {
    const appPath = path.join(projectPath, 'app');
    const apiPath = path.join(appPath, 'api');
    const modelsPath = path.join(appPath, 'models');
    const servicesPath = path.join(appPath, 'services');

    await fs.mkdir(apiPath, { recursive: true });
    await fs.mkdir(modelsPath, { recursive: true });
    await fs.mkdir(servicesPath, { recursive: true });

    await fs.writeFile(path.join(apiPath, '__init__.py'), '');
    await fs.writeFile(path.join(modelsPath, '__init__.py'), '');
    await fs.writeFile(path.join(servicesPath, '__init__.py'), '');
  }

  private async createMainApplication(projectPath: string, projectName: string): Promise<void> {
    const content = `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(
    title="${projectName}",
    description="FastAPI application",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to ${projectName}"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
`;
    await fs.writeFile(path.join(projectPath, 'app', 'main.py'), content);
  }

  private async createConfig(projectPath: string): Promise<void> {
    const content = `from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "FastAPI App"
    DEBUG: bool = True
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    class Config:
        env_file = ".env"

settings = Settings()
`;
    await fs.writeFile(path.join(projectPath, 'app', 'config.py'), content);
  }

  private async createRequirements(projectPath: string): Promise<void> {
    const content = `fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.0.0
pydantic-settings>=2.0.0
python-dotenv>=1.0.0
httpx>=0.25.0
`;
    await fs.writeFile(path.join(projectPath, 'requirements.txt'), content);
  }

  private async createDockerFiles(projectPath: string, projectName: string): Promise<void> {
    const dockerfile = `FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
`;
    await fs.writeFile(path.join(projectPath, 'Dockerfile'), dockerfile);

    const dockerCompose = `version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DEBUG=True
    volumes:
      - .:/app
`;
    await fs.writeFile(path.join(projectPath, 'docker-compose.yml'), dockerCompose);
  }

  private async createTestStructure(projectPath: string, projectName: string): Promise<void> {
    const testsPath = path.join(projectPath, 'tests');
    await fs.mkdir(testsPath, { recursive: true });

    const testContent = `import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to ${projectName}"}

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
`;
    await fs.writeFile(path.join(testsPath, 'test_main.py'), testContent);
    await fs.writeFile(path.join(testsPath, '__init__.py'), '');
  }

  private async createGitignore(projectPath: string): Promise<void> {
    const content = `# Byte-compiled / optimized / DLL files
__pycache__/
*.py[cod]
*$py.class

# C extensions
*.so

# Distribution / packaging
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# PyInstaller
*.manifest
*.spec

# Unit test / coverage reports
htmlcov/
.tox/
.nox/
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
.hypothesis/
.pytest_cache/

# Environments
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

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
