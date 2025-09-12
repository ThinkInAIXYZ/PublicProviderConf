#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const providers_1 = require("./providers");
async function testProviders() {
    console.log('🧪 Testing TypeScript providers...\n');
    // Test PPInfra Provider (HTTP API)
    console.log('Testing PPInfra Provider...');
    try {
        const ppinfra = new providers_1.PPInfraProvider('https://api.ppinfra.com/openai/v1/models');
        const models = await ppinfra.fetchModels();
        console.log(`✅ PPInfra: ${models.length} models fetched`);
        if (models.length > 0) {
            console.log(`   Sample: ${models[0].name} (${models[0].type})`);
        }
    }
    catch (error) {
        console.log(`❌ PPInfra failed: ${error}`);
    }
    console.log();
    // Test OpenAI Provider (template-based without API key)
    console.log('Testing OpenAI Provider (template-based)...');
    try {
        const openai = new providers_1.OpenAIProvider(); // No API key - should use templates
        const models = await openai.fetchModels();
        console.log(`✅ OpenAI: ${models.length} models from templates`);
        if (models.length > 0) {
            console.log(`   Sample: ${models[0].name} (${models[0].type})`);
        }
    }
    catch (error) {
        console.log(`❌ OpenAI failed: ${error}`);
    }
    console.log();
    // Test DeepSeek Provider (web scraping)
    console.log('Testing DeepSeek Provider (web scraping)...');
    try {
        const deepseek = new providers_1.DeepSeekProvider();
        const models = await deepseek.fetchModels();
        console.log(`✅ DeepSeek: ${models.length} models scraped`);
        if (models.length > 0) {
            console.log(`   Sample: ${models[0].name} (${models[0].type})`);
        }
    }
    catch (error) {
        console.log(`❌ DeepSeek failed: ${error}`);
    }
    console.log();
    // Test Ollama Provider (template-based)
    console.log('Testing Ollama Provider (template-based)...');
    try {
        const ollama = new providers_1.OllamaProvider();
        const models = await ollama.fetchModels();
        console.log(`✅ Ollama: ${models.length} models from templates`);
        if (models.length > 0) {
            console.log(`   Sample: ${models[0].name} (${models[0].type})`);
        }
    }
    catch (error) {
        console.log(`❌ Ollama failed: ${error}`);
    }
    console.log();
    console.log('🎉 TypeScript provider testing complete!');
}
testProviders().catch(console.error);
//# sourceMappingURL=test.js.map