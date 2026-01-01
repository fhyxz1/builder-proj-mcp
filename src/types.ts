export interface ProjectConfig {
  projectName: string;
  projectType: string;
  framework: string;
  options?: Record<string, any>;
  outputPath?: string;
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
