import { ProjectBuilder } from '../types.js';
import { SpringBootBuilder } from './spring-boot-builder.js';
import { ReactBuilder } from './react-builder.js';
import { VueBuilder } from './vue-builder.js';
import { FastAPIBuilder } from './fastapi-builder.js';
import { DjangoBuilder } from './django-builder.js';
import { FlaskBuilder } from './flask-builder.js';
import { ViteBuilder } from './vite-builder.js';
import { ExpressBuilder } from './express-builder.js';
import { FastifyBuilder } from './fastify-builder.js';
import { NestJSBuilder } from './nestjs-builder.js';
import { NextJSBuilder } from './nextjs-builder.js';
import { NuxtBuilder } from './nuxt-builder.js';

export class BuilderFactory {
  private static builders: ProjectBuilder[] = [
    new SpringBootBuilder(),
    new ReactBuilder(),
    new VueBuilder(),
    new FastAPIBuilder(),
    new DjangoBuilder(),
    new FlaskBuilder(),
    new ViteBuilder(),
    new ExpressBuilder(),
    new FastifyBuilder(),
    new NestJSBuilder(),
    new NextJSBuilder(),
    new NuxtBuilder()
  ];

  static getBuilder(framework: string): ProjectBuilder | null {
    return this.builders.find(builder => 
      builder.supportedFrameworks.includes(framework.toLowerCase())
    ) || null;
  }

  static getSupportedFrameworks(): string[] {
    return this.builders.flatMap(builder => builder.supportedFrameworks);
  }
}
