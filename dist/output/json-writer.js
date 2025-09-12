"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonWriter = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const json_validator_1 = require("./json-validator");
class JsonWriter {
    /**
     * Write data to a JSON file with pretty formatting
     */
    static async writeToFile(data, filePath) {
        try {
            // Validate that data can be serialized to JSON
            json_validator_1.JsonValidator.validateJsonSerializable(data);
            // Ensure directory exists
            const dir = (0, path_1.dirname)(filePath);
            await fs_1.promises.mkdir(dir, { recursive: true });
            // Write JSON content with pretty formatting
            const jsonContent = JSON.stringify(data, null, 2);
            await fs_1.promises.writeFile(filePath, jsonContent, 'utf8');
        }
        catch (error) {
            throw new Error(`Failed to write JSON file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Write data to a JSON file with compact formatting
     */
    static async writeToFileCompact(data, filePath) {
        try {
            // Validate that data can be serialized to JSON
            json_validator_1.JsonValidator.validateJsonSerializable(data);
            // Ensure directory exists
            const dir = (0, path_1.dirname)(filePath);
            await fs_1.promises.mkdir(dir, { recursive: true });
            // Write JSON content compactly
            const jsonContent = JSON.stringify(data);
            await fs_1.promises.writeFile(filePath, jsonContent, 'utf8');
        }
        catch (error) {
            throw new Error(`Failed to write compact JSON file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Read and parse JSON file
     */
    static async readFromFile(filePath) {
        try {
            const content = await fs_1.promises.readFile(filePath, 'utf8');
            return JSON.parse(content);
        }
        catch (error) {
            throw new Error(`Failed to read JSON file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Check if a file exists
     */
    static async fileExists(filePath) {
        try {
            await fs_1.promises.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.JsonWriter = JsonWriter;
//# sourceMappingURL=json-writer.js.map