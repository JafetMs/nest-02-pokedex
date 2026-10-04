import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePokemonDto } from './dto/create-pokemon.dto.js';
import { UpdatePokemonDto } from './dto/update-pokemon.dto.js';
import { InjectModel } from '@nestjs/mongoose';
import { MongoServerError } from 'mongodb';
import { Pokemon } from './entities/pokemon.entity.js';
import { isValidObjectId, Model } from 'mongoose';
import { throwError } from 'rxjs';
import { json } from 'stream/consumers';

@Injectable()
export class PokemonService {
  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,
  ) {}

  async create(createPokemonDto: CreatePokemonDto) {
    createPokemonDto.name = createPokemonDto.name.trim().toLowerCase();

    try {
      const pokemon = await this.pokemonModel.create(createPokemonDto);

      return pokemon;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new BadRequestException(
          `Pokemon already exists: ${JSON.stringify(error.keyValue)}`,
        );
      }

      throw error;
    }
  }

  async findAll() {
    return await this.pokemonModel.find().exec();
  }

  async findOne(term: string) {
    let pokemon: Pokemon | null = null;

    if (!isNaN(+term)) {
      pokemon = await this.pokemonModel.findOne({ no: +term });
    }

    // MongoID
    if (!pokemon && isValidObjectId(term)) {
      pokemon = await this.pokemonModel.findById(term);
    }

    // Name
    if (!pokemon) {
      pokemon = await this.pokemonModel.findOne({ name: term });
    }

    if (!pokemon) {
      throw new NotFoundException(
        `Pokemon with id,name or no "${term}" not found`,
      );
    }

    return pokemon;
  }

  async update(id: string, updatePokemonDto: UpdatePokemonDto) {
    const pokemon = await this.pokemonModel.findByIdAndUpdate(
      id,
      updatePokemonDto,
      { new: true },
    );

    if (!pokemon) {
      throw new NotFoundException(`Pokemon with id: ${id} not found`);
    }

    return pokemon;
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.pokemonModel.deleteOne({ _id: id });
  }
}
