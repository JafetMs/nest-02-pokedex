import { join } from 'node:path';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';

import { PokemonModule } from './pokemon/pokemon.module.js';
import { Connection } from 'mongoose';
import { CommonModule } from './common/common.module.js';
import { SeedModule } from './seed/seed.module.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envConfigutarion } from './config/env.config.js';
import { ZodValidationSchema } from './config/zod.validation.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      load:[envConfigutarion],
      validationSchema: ZodValidationSchema,
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(import.meta.dirname, '..', 'public'),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB'),
        onConnectionCreate: (c: Connection) => {
          c.on('connected', () => console.log('MongoDB connected'));
          c.on('open', () => console.log('MongoDB open'));
          c.on('disconnected', () => console.log('MongoDB disconnected'));
          c.on('reconnected', () => console.log('MongoDB reconnected'));
          c.on('disconnecting', () => console.log('MongoDB disconnecting'));
          return c;
        },
      }),
    }),
    PokemonModule,
    CommonModule,
    SeedModule,
  ],
})
export class AppModule {
  
}
