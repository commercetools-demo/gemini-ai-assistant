import { logger } from "./logger.utils";

export function parseStringifiedJson(jsonInStr?: string): Object {
    if (!jsonInStr) {
        return {};
    }
    try {
      // First try to parse as regular JSON
      return JSON.parse(jsonInStr);
    } catch (error) {
      try {
        // If the first parse fails, try unescaping the string first
        // This handles double-encoded JSON strings like "{\"key\":\"value\"}"
        const unescaped = jsonInStr.replace(/\\"/g, '"');
        return JSON.parse(unescaped);
      } catch (nestedError) {
        // If both parsing attempts fail, log the error and return an empty object
        logger.error(`Failed to parse JSON: ${jsonInStr}`);
        return {};
      }
    }
  }