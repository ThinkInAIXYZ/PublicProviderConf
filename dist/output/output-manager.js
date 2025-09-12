"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutputManager = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const json_writer_1 = require("./json-writer");
const json_validator_1 = require("./json-validator");
class OutputManager {
    outputDir;
    constructor(outputDir) {
        this.outputDir = outputDir;
    }
    async writeProviderFiles(providers, validate = true) {
        await fs_1.promises.mkdir(this.outputDir, { recursive: true });
        for (const provider of providers) {
            // Validate provider data if requested
            if (validate) {
                json_validator_1.JsonValidator.validateProviderInfo(provider);
            }
            const filename = (0, path_1.join)(this.outputDir, `${provider.provider}.json`);
            await json_writer_1.JsonWriter.writeToFile(provider, filename);
        }
    }
    async writeAggregatedFile(providers, validate = true) {
        const aggregated = this.createAggregatedOutput(providers);
        // Validate each provider if requested
        if (validate) {
            for (const provider of providers) {
                json_validator_1.JsonValidator.validateProviderInfo(provider);
            }
        }
        const filename = (0, path_1.join)(this.outputDir, 'all.json');
        await json_writer_1.JsonWriter.writeToFile(aggregated, filename);
    }
    createAggregatedOutput(providers) {
        const aggregatedProviders = {};
        let totalModels = 0;
        for (const provider of providers) {
            const aggregatedProvider = {
                providerId: provider.provider,
                providerName: provider.providerName,
                models: provider.models,
            };
            totalModels += provider.models.length;
            aggregatedProviders[provider.provider] = aggregatedProvider;
        }
        return {
            version: '1.0.0',
            generatedAt: new Date(),
            totalModels,
            providers: aggregatedProviders,
        };
    }
    /**
     * Write both individual provider files and aggregated file
     */
    async writeAllFiles(providers, validate = true) {
        await this.writeProviderFiles(providers, validate);
        await this.writeAggregatedFile(providers, validate);
    }
    /**
     * Get output directory path
     */
    getOutputDir() {
        return this.outputDir;
    }
    /**
     * Check if output directory exists
     */
    async outputDirExists() {
        try {
            const stats = await fs_1.promises.stat(this.outputDir);
            return stats.isDirectory();
        }
        catch {
            return false;
        }
    }
    /**
     * Clean output directory (remove all JSON files)
     */
    async cleanOutputDir() {
        if (await this.outputDirExists()) {
            const files = await fs_1.promises.readdir(this.outputDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            for (const file of jsonFiles) {
                await fs_1.promises.unlink((0, path_1.join)(this.outputDir, file));
            }
        }
    }
    /**
     * Get list of existing provider JSON files
     */
    async getExistingProviderFiles() {
        if (!(await this.outputDirExists())) {
            return [];
        }
        const files = await fs_1.promises.readdir(this.outputDir);
        return files
            .filter(file => file.endsWith('.json') && file !== 'all.json')
            .map(file => file.replace('.json', ''));
    }
}
exports.OutputManager = OutputManager;
//# sourceMappingURL=output-manager.js.map