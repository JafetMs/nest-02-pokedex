import axios, { AxiosInstance } from 'axios';

import { HttpAdapter } from '../interfaces/http-adapter.interface.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AxiosAdapter implements HttpAdapter {
  private axios: AxiosInstance = axios;

  async get<T>(url: string): Promise<T> {
    try {
      const { data } = await this.axios.get(url);
      return data;
    } catch (error) {
      console.error('Error en Axios:', error);
  throw error;

    }
  }
}
