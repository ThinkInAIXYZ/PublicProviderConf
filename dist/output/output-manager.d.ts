import { ProviderInfo } from '../models/provider-info';
import { AggregatedOutput } from './types';
export declare class OutputManager {
    private outputDir;
    constructor(outputDir: string);
    writeProviderFiles(providers: ProviderInfo[], validate?: boolean): Promise<void>;
    writeAggregatedFile(providers: ProviderInfo[], validate?: boolean): Promise<void>;
    createAggregatedOutput(providers: ProviderInfo[]): AggregatedOutput;
    /**
     * Write both individual provider files and aggregated file
     */
    writeAllFiles(providers: ProviderInfo[], validate?: boolean): Promise<void>;
    /**
     * Get output directory path
     */
    getOutputDir(): string;
    /**
     * Check if output directory exists
     */
    outputDirExists(): Promise<boolean>;
    /**
     * Clean output directory (remove all JSON files)
     */
    cleanOutputDir(): Promise<void>;
    /**
     * Get list of existing provider JSON files
     */
    getExistingProviderFiles(): Promise<string[]>;
}
//# sourceMappingURL=output-manager.d.ts.map