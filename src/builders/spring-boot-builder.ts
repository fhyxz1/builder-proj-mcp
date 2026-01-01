import { ProjectBuilder, ProjectConfig, BuilderResult } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class SpringBootBuilder implements ProjectBuilder {
  supportedFrameworks = ['spring-boot', 'spring', 'spring-mvc', 'spring-webflux'];

  async build(config: ProjectConfig): Promise<BuilderResult> {
    const { projectName, framework, options = {}, outputPath } = config;
    const basePath = outputPath || process.cwd();
    const projectPath = path.resolve(basePath, projectName);

    try {
      await fs.mkdir(projectPath, { recursive: true });
      
      const javaVersion = options.javaVersion || '17';
      const springBootVersion = options.springBootVersion || '3.2.0';
      const groupId = options.groupId || 'com.example';
      const artifactId = options.artifactId || projectName;

      const pomContent = this.generatePomXml(groupId, artifactId, springBootVersion, javaVersion);
      await fs.writeFile(path.join(projectPath, 'pom.xml'), pomContent);

      await this.createSourceStructure(projectPath, groupId, artifactId);
      await this.createApplicationProperties(projectPath);
      await this.createMainApplication(projectPath, groupId, artifactId);
      await this.createGitignore(projectPath);

      return {
        success: true,
        message: `Spring Boot project '${projectName}' created successfully`,
        files: ['pom.xml', 'src/main/resources/application.properties', 'src/main/java/.../Application.java']
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create Spring Boot project',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private generatePomXml(groupId: string, artifactId: string, version: string, javaVersion: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>${version}</version>
        <relativePath/>
    </parent>

    <groupId>${groupId}</groupId>
    <artifactId>${artifactId}</artifactId>
    <version>1.0.0</version>
    <name>${artifactId}</name>
    <description>Spring Boot Project</description>

    <properties>
        <java.version>${javaVersion}</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>`;
  }

  private async createSourceStructure(projectPath: string, groupId: string, artifactId: string): Promise<void> {
    const packagePath = groupId.replace(/\./g, '/');
    const javaPath = path.join(projectPath, 'src', 'main', 'java', packagePath);
    const resourcesPath = path.join(projectPath, 'src', 'main', 'resources');
    const testPath = path.join(projectPath, 'src', 'test', 'java', packagePath);

    await fs.mkdir(javaPath, { recursive: true });
    await fs.mkdir(resourcesPath, { recursive: true });
    await fs.mkdir(testPath, { recursive: true });
  }

  private async createApplicationProperties(projectPath: string): Promise<void> {
    const content = `spring.application.name=application
server.port=8080

# H2 Database Configuration
spring.datasource.url=jdbc:h2:mem:testdb
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=password
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect

# JPA Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
`;
    await fs.writeFile(path.join(projectPath, 'src', 'main', 'resources', 'application.properties'), content);
  }

  private async createMainApplication(projectPath: string, groupId: string, artifactId: string): Promise<void> {
    const packagePath = groupId.replace(/\./g, '/');
    const className = this.toPascalCase(artifactId);
    const content = `package ${groupId};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ${className}Application {

    public static void main(String[] args) {
        SpringApplication.run(${className}Application.class, args);
    }
}
`;
    await fs.writeFile(path.join(projectPath, 'src', 'main', 'java', packagePath, `${className}Application.java`), content);
  }

  private async createGitignore(projectPath: string): Promise<void> {
    const content = `HELP.md
target/
!.mvn/wrapper/maven-wrapper.jar
!**/src/main/**/target/
!**/src/test/**/target/

### STS ###
.apt_generated
.classpath
.factorypath
.project
.settings
.springBeans
.sts4-cache

### IntelliJ IDEA ###
.idea
*.iws
*.iml
*.ipr

### NetBeans ###
/nbproject/private/
/nbbuild/
/dist/
/nbdist/
/.nb-gradle/
build/
!**/src/main/**/build/
!**/src/test/**/build/

### VS Code ###
.vscode/
`;
    await fs.writeFile(path.join(projectPath, '.gitignore'), content);
  }

  private toPascalCase(str: string): string {
    return str.replace(/(^\w|-\w)/g, (match) => match.replace('-', '').toUpperCase());
  }
}
