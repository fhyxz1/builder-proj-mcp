#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { BuilderFactory } from './builders/index.js';
import { ProjectConfig } from './types.js';

const server = new Server(
  {
    name: 'builder-proj-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const supportedFrameworks = BuilderFactory.getSupportedFrameworks();
  
  return {
    tools: [
      {
        name: 'build_project',
        description: `Build a new project with specified framework. Supported frameworks: ${supportedFrameworks.join(', ')}`,
        inputSchema: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description: 'Name of the project to create',
            },
            projectType: {
              type: 'string',
              description: 'Type of project (e.g., web, api, mobile)',
              enum: ['web', 'api', 'mobile', 'desktop'],
            },
            framework: {
              type: 'string',
              description: `Framework to use. Options: ${supportedFrameworks.join(', ')}`,
            },
            options: {
              type: 'object',
              description: 'Additional options for the project builder',
              properties: {
                outputPath: {
                  type: 'string',
                  description: 'Absolute path where the project will be created (default: current working directory)',
                },
                typescript: {
                  type: 'boolean',
                  description: 'Use TypeScript (default: true for supported frameworks)',
                },
                tailwind: {
                  type: 'boolean',
                  description: 'Use Tailwind CSS for styling (frontend only, default: false)',
                },
                stateManagement: {
                  type: 'string',
                  enum: ['zustand', 'pinia', 'redux', 'none'],
                  description: 'State management library: zustand (React), pinia (Vue), redux (React), none (default: none)',
                },
                router: {
                  type: 'boolean',
                  description: 'Include router configuration (frontend only, default: false)',
                },
                testing: {
                  type: 'boolean',
                  description: 'Include test setup (default: true)',
                },
                eslint: {
                  type: 'boolean',
                  description: 'Include ESLint configuration (frontend only, default: false)',
                },
                prettier: {
                  type: 'boolean',
                  description: 'Include Prettier configuration (frontend only, default: false)',
                },
                docker: {
                  type: 'boolean',
                  description: 'Include Docker configuration (default: true)',
                },
                javaVersion: {
                  type: 'string',
                  description: 'Java version for Spring Boot (default: 17)',
                },
                pythonVersion: {
                  type: 'string',
                  description: 'Python version for Python projects (default: 3.11)',
                },
                springBootVersion: {
                  type: 'string',
                  description: 'Spring Boot version (default: 3.2.0)',
                },
                groupId: {
                  type: 'string',
                  description: 'Maven groupId for Spring Boot (default: com.example)',
                },
                database: {
                  type: 'string',
                  description: 'Database type for backend projects (e.g., postgresql, mysql, mongodb)',
                },
              },
            },
          },
          required: ['projectName', 'framework'],
        },
      },
      {
        name: 'list_frameworks',
        description: 'List all supported frameworks for project creation',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'build_project') {
    const { projectName, projectType = 'web', framework, options = {} } = args as any;

    if (!projectName || !framework) {
      throw new Error('projectName and framework are required');
    }

    const builder = BuilderFactory.getBuilder(framework);
    if (!builder) {
      throw new Error(`Unsupported framework: ${framework}. Supported frameworks: ${BuilderFactory.getSupportedFrameworks().join(', ')}`);
    }

    const config: ProjectConfig = {
      projectName,
      projectType,
      framework,
      options,
      outputPath: options.outputPath,
    };

    const result = await builder.build(config);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  if (name === 'list_frameworks') {
    const frameworks = BuilderFactory.getSupportedFrameworks();
    const groupedFrameworks: Record<string, string[]> = {
      'Spring/Java': frameworks.filter(f => f.includes('spring')),
      'Frontend': frameworks.filter(f => ['react', 'vite'].some(prefix => f.startsWith(prefix))),
      'Next.js/React': frameworks.filter(f => ['next'].some(prefix => f.startsWith(prefix))),
      'Nuxt.js/Vue': frameworks.filter(f => ['vue', 'nuxt'].some(prefix => f.startsWith(prefix))),
      'Python': frameworks.filter(f => ['fastapi', 'django', 'flask'].some(prefix => f.startsWith(prefix))),
      'JavaScript/TypeScript': frameworks.filter(f => ['express', 'fastify', 'nestjs'].some(prefix => f.startsWith(prefix))),
    };

    const formattedList = Object.entries(groupedFrameworks)
      .filter(([, items]) => items.length > 0)
      .map(([category, items]) => `${category}:\n  - ${items.join('\n  - ')}`)
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Supported Frameworks:\n\n${formattedList}`,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Builder Project MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
