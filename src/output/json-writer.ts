import { promises as fs } from 'fs';
import { dirname } from 'path';
import { JsonValidator } from './json-validator';

export class JsonWriter {
  /**
   * Write data to a JSON file with pretty formatting
   */
  static async writeToFile<T>(data: T, filePath: string): Promise<void> {
    try {
      // Validate that data can be serialized to JSON
      JsonValidator.validateJsonSerializable(data);
      
      // Ensure directory exists
      const dir = dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write JSON content with pretty formatting
      const jsonContent = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, jsonContent, 'utf8');
      
    } catch (error) {
      throw new Error(`Failed to write JSON file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Write data to a JSON file with compact formatting
   */
  static async writeToFileCompact<T>(data: T, filePath: string): Promise<void> {
    try {
      // Validate that data can be serialized to JSON
      JsonValidator.validateJsonSerializable(data);
      
      // Ensure directory exists
      const dir = dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write JSON content compactly
      const jsonContent = JSON.stringify(data);
      await fs.writeFile(filePath, jsonContent, 'utf8');
      
    } catch (error) {
      throw new Error(`Failed to write compact JSON file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Read and parse JSON file
   */
  static async readFromFile<T>(filePath: string): Promise<T> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content) as T;
    } catch (error) {
      throw new Error(`Failed to read JSON file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
