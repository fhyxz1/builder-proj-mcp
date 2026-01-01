import { ProjectBuilder, ProjectConfig, BuilderResult, BackendOptions } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class DjangoBuilder implements ProjectBuilder {
  supportedFrameworks = ['django', 'django-rest', 'django-cms'];

  async build(config: ProjectConfig): Promise<BuilderResult> {
    const { projectName, framework, options = {}, outputPath } = config;
    const basePath = outputPath || process.cwd();
    const projectPath = path.resolve(basePath, projectName);

    try {
      await fs.mkdir(projectPath, { recursive: true });

      const backendOptions = options as BackendOptions;
      const pythonVersion = backendOptions.pythonVersion || '3.11';
      const useDocker = backendOptions.docker !== false;
      const useRest = framework === 'django-rest';

      await this.createRequirements(projectPath, useRest);
      await this.createProjectStructure(projectPath, projectName);
      await this.createSettings(projectPath, projectName);
      await this.createUrls(projectPath, projectName);
      await this.createWsgi(projectPath, projectName);
      await this.createAsgi(projectPath, projectName);
      await this.createManagePy(projectPath, projectName);
      await this.createGitignore(projectPath);

      if (useDocker) {
        await this.createDockerFiles(projectPath, projectName);
      }

      return {
        success: true,
        message: `Django project '${projectName}' created successfully`,
        files: ['requirements.txt', 'manage.py', 'project/settings.py', 'project/urls.py']
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create Django project',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async createRequirements(projectPath: string, useRest: boolean): Promise<void> {
    let content = `Django>=5.0.0
python-dotenv>=1.0.0
Pillow>=10.0.0
`;

    if (useRest) {
      content += `djangorestframework>=3.14.0
django-cors-headers>=4.3.0
`;
    }

    await fs.writeFile(path.join(projectPath, 'requirements.txt'), content);
  }

  private async createProjectStructure(projectPath: string, projectName: string): Promise<void> {
    const projectDir = path.join(projectPath, projectName);
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(path.join(projectDir, '__init__.py'), '');
  }

  private async createSettings(projectPath: string, projectName: string): Promise<void> {
    const content = `import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-this-in-production')

DEBUG = os.getenv('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = '${projectName}.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = '${projectName}.wsgi.application'
ASGI_APPLICATION = '${projectName}.asgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
`;
    await fs.writeFile(path.join(projectPath, projectName, 'settings.py'), content);
  }

  private async createUrls(projectPath: string, projectName: string): Promise<void> {
    const content = `from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
`;
    await fs.writeFile(path.join(projectPath, projectName, 'urls.py'), content);
  }

  private async createWsgi(projectPath: string, projectName: string): Promise<void> {
    const content = `import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', '${projectName}.settings')
application = get_wsgi_application()
`;
    await fs.writeFile(path.join(projectPath, projectName, 'wsgi.py'), content);
  }

  private async createAsgi(projectPath: string, projectName: string): Promise<void> {
    const content = `import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', '${projectName}.settings')
application = get_asgi_application()
`;
    await fs.writeFile(path.join(projectPath, projectName, 'asgi.py'), content);
  }

  private async createManagePy(projectPath: string, projectName: string): Promise<void> {
    const content = `#!/usr/bin/env python
import os
import sys

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', '${projectName}.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)
`;
    await fs.writeFile(path.join(projectPath, 'manage.py'), content);
  }

  private async createDockerFiles(projectPath: string, projectName: string): Promise<void> {
    const dockerfile = `FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
`;
    await fs.writeFile(path.join(projectPath, 'Dockerfile'), dockerfile);

    const dockerCompose = `version: '3.8'

services:
  web:
    build: .
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    environment:
      - DEBUG=True
`;
    await fs.writeFile(path.join(projectPath, 'docker-compose.yml'), dockerCompose);
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

# Django
*.log
local_settings.py
db.sqlite3
db.sqlite3-journal
/static/
/media/

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
