import { Injectable } from '@nestjs/common';
import axios ,{ AxiosInstance } from 'axios'
import { PokeResponse } from './interfaces/poke-response.interface.js';

@Injectable()
export class SeedService {

  private readonly axios : AxiosInstance = axios;
 
  async executeSeed() {
    const { data } = await this.axios.get<PokeResponse>('https://pokeapi.co/api/v2/pokemon?limit=5')
    
    data.results.forEach(({name,url}) => {

      console.log({name,url});

      const segments = url.split('/');
      const no = +segments.at(-2)!
      
      console.log({name,no,url})
      
    })
    return data.results;
  }
}
