export declare class JsonWriter {
    /**
     * Write data to a JSON file with pretty formatting
     */
    static writeToFile<T>(data: T, filePath: string): Promise<void>;
    /**
     * Write data to a JSON file with compact formatting
     */
    static writeToFileCompact<T>(data: T, filePath: string): Promise<void>;
    /**
     * Read and parse JSON file
     */
    static readFromFile<T>(filePath: string): Promise<T>;
    /**
     * Check if a file exists
     */
    static fileExists(filePath: string): Promise<boolean>;
}
//# sourceMappingURL=json-writer.d.ts.map