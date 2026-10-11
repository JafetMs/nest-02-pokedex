import { Injectable } from '@nestjs/common';
import { PokeResponse} from './interfaces/poke-response.interface.js';
import { Pokemon } from '../pokemon/entities/pokemon.entity.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AxiosAdapter } from '../common/adapters/axios.adapter.js';

@Injectable()
export class SeedService {

  
  constructor(
    @InjectModel( Pokemon.name)
    private readonly pokemonModel : Model<Pokemon>,
    private readonly http: AxiosAdapter
  ){}
 
  async executeSeed() {

    await this.pokemonModel.deleteMany({}) // == Delete * from pokemonss

    const data  = await this.http.get<PokeResponse>('https://pokeapi.co/api/v2/pokemon?limit=500');

    const pokemonsToInsert : {name:string,no: number}[] = [];
    data.results.forEach(({name,url}) => {

      
      const segments = url.split('/');
      const no = +segments.at(-2)!

      pokemonsToInsert.push({name,no})
      
      
    })

    await this.pokemonModel.insertMany(pokemonsToInsert);

    return 'Seed Executed'
  }
}
