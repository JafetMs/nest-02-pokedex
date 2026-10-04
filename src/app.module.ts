import { join } from 'node:path';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';

import { PokemonModule } from './pokemon/pokemon.module.js';


@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(import.meta.dirname,'..','public')
    }),
    PokemonModule,
    MongooseModule.forRoot('mongodb://localhost/27017/nest-pokemon')
  ],

})
export class AppModule {}
