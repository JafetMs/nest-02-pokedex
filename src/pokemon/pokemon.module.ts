import { Module } from '@nestjs/common';
import { PokemonService } from './pokemon.service.js';
import { PokemonController } from './pokemon.controller.js';
import { MongooseModule } from '@nestjs/mongoose';
import { Pokemon, pokemonSchema } from './entities/pokemon.entity.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [PokemonController],
  providers: [PokemonService],
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      {
        name: Pokemon.name,
        schema: pokemonSchema
      }
    ]),

  ],
  exports: [MongooseModule]
})
export class PokemonModule {}
