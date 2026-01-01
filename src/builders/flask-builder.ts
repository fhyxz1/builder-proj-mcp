import { ProjectBuilder, ProjectConfig, BuilderResult, BackendOptions } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class FlaskBuilder implements ProjectBuilder {
  supportedFrameworks = ['flask', 'flask-rest', 'flask-sqlalchemy'];

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

      await this.createRequirements(projectPath, framework);
      await this.createSourceStructure(projectPath);
      await this.createMainApplication(projectPath, projectName);
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
        message: `Flask project '${projectName}' created successfully`,
        files: ['requirements.txt', 'app/__init__.py', 'app/routes.py', 'app/config.py']
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create Flask project',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async createRequirements(projectPath: string, framework: string): Promise<void> {
    let content = `Flask>=3.0.0
python-dotenv>=1.0.0
`;

    if (framework === 'flask-rest') {
      content += `flask-restful>=0.3.10
flask-cors>=4.0.0
`;
    } else if (framework === 'flask-sqlalchemy') {
      content += `Flask-SQLAlchemy>=3.1.1
Flask-Migrate>=4.0.5
`;
    }

    await fs.writeFile(path.join(projectPath, 'requirements.txt'), content);
  }

  private async createSourceStructure(projectPath: string): Promise<void> {
    const appPath = path.join(projectPath, 'app');
    const staticPath = path.join(appPath, 'static');
    const templatesPath = path.join(appPath, 'templates');

    await fs.mkdir(staticPath, { recursive: true });
    await fs.mkdir(templatesPath, { recursive: true });
  }

  private async createMainApplication(projectPath: string, projectName: string): Promise<void> {
    const initContent = `from flask import Flask
from app.config import Config
from app.routes import main_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    app.register_blueprint(main_bp)
    
    return app
`;
    await fs.writeFile(path.join(projectPath, 'app', '__init__.py'), initContent);

    const routesContent = `from flask import Blueprint, jsonify
from app import create_app

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return jsonify({"message": "Welcome to ${projectName}"})

@main_bp.route('/health')
def health():
    return jsonify({"status": "healthy"})
`;
    await fs.writeFile(path.join(projectPath, 'app', 'routes.py'), routesContent);

    const runContent = `from app import create_app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
`;
    await fs.writeFile(path.join(projectPath, 'run.py'), runContent);
  }

  private async createConfig(projectPath: string): Promise<void> {
    const content = `import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('DEBUG', 'True') == 'True'
`;
    await fs.writeFile(path.join(projectPath, 'app', 'config.py'), content);
  }

  private async createDockerFiles(projectPath: string, projectName: string): Promise<void> {
    const dockerfile = `FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "run.py"]
`;
    await fs.writeFile(path.join(projectPath, 'Dockerfile'), dockerfile);

    const dockerCompose = `version: '3.8'

services:
  web:
    build: .
    ports:
      - "5000:5000"
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
from app import create_app

@pytest.fixture
def app():
    app = create_app()
    app.config['TESTING'] = True
    yield app

@pytest.fixture
def client(app):
    return app.test_client()

def test_index(client):
    response = client.get('/')
    assert response.status_code == 200
    assert b"Welcome to ${projectName}" in response.data

def test_health(client):
    response = client.get('/health')
    assert response.status_code == 200
    assert b"healthy" in response.data
`;
    await fs.writeFile(path.join(testsPath, 'test_app.py'), testContent);
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

# Flask
instance/
.webassets-cache

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
