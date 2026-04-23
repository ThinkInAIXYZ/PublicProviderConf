import type { CustomProviderSourceSeed } from '../types';
import { SeededModelsAdapter } from './BaseModelsAdapter';

export class MiniMaxModelsAdapter extends SeededModelsAdapter {
  constructor(source: CustomProviderSourceSeed) {
    super(source);
  }
}
