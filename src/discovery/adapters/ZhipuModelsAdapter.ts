import type { CustomProviderSourceSeed } from '../types';
import { SeededModelsAdapter } from './BaseModelsAdapter';

export class ZhipuModelsAdapter extends SeededModelsAdapter {
  constructor(source: CustomProviderSourceSeed) {
    super(source);
  }
}
