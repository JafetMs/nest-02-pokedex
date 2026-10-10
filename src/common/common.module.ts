import { Module } from '@nestjs/common';
import { AxiosAdapter } from './adapters/axios.adapter.js';

@Module({
    providers: [AxiosAdapter],
    exports : [AxiosAdapter]
})
export class CommonModule {}
