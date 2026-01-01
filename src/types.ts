export interface ProjectConfig {
  projectName: string;
  projectType: string;
  framework: string;
  options?: FrontendOptions | BackendOptions;
  outputPath?: string;
}

export interface FrontendOptions {
  typescript?: boolean;
  tailwind?: boolean;
  stateManagement?: 'zustand' | 'pinia' | 'redux' | 'none';
  router?: boolean;
  testing?: boolean;
  eslint?: boolean;
  prettier?: boolean;
}

export interface BackendOptions {
  typescript?: boolean;
  pythonVersion?: string;
  javaVersion?: string;
  docker?: boolean;
  tests?: boolean;
  database?: string;
}

export interface BuilderResult {
  success: boolean;
  message: string;
  files?: string[];
  error?: string;
}

export interface ProjectBuilder {
  build(config: ProjectConfig): Promise<BuilderResult>;
  supportedFrameworks: string[];
}
