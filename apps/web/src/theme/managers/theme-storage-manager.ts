// theme-storage.ts
import { AVAILABLE_THEME_NAMES } from "../constants/themes/catalog";
import { THEME_STORAGE_CONSTANTS } from "../constants/storage/theme-storage-constants";
import { ThemeMode, ThemeName, ThemeColors, StorageOptions } from "../types";
import { themeValidationManager } from "./theme-validation-manager";

/**
 * Enhanced ThemeStorage that manages both theme preferences and theme data
 */
export class ThemeStorageManager {
  static readonly KEYS = {
    ...THEME_STORAGE_CONSTANTS.KEYS,
  };

  private static readonly VALID_THEMES = AVAILABLE_THEME_NAMES;
  private static readonly VALID_MODES = THEME_STORAGE_CONSTANTS.VALID_MODES;
  private static readonly MAX_THEME_SIZE = 100 * 1024; // 100KB max theme size

  /**
   * Current storage provider
   */
  private static _storageProvider: StorageOptions["provider"] = "localStorage";

  /**
   * Current storage key prefix
   */
  private static _keyPrefix: string = "";

  /**
   * Store custom provider reference
   */
  private static _customProvider: StorageOptions["customProvider"] | null =
    null;

  /**
   * Configure storage options
   * @param options Storage configuration options
   */
  static async configureStorage(options: StorageOptions): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      // Store current configuration to migrate data if needed
      const currentProvider = this._storageProvider || "localStorage";

      // Configure storage provider
      if (options.provider) {
        this._configureProvider(options.provider, options.customProvider);
      }

      // Configure storage key prefix if provided
      if (options.key) {
        this._configureKeyPrefix(options.key);
      }

      // Migrate data if provider changed
      if (options.provider && options.provider !== currentProvider) {
        await this._migrateData(
          currentProvider,
          options.provider,
          options.customProvider,
        );
      }

      console.log(
        "[ThemeStorageManager] Storage configured:",
        options.provider || "localStorage",
      );
    } catch (error) {
      console.error(
        "[ThemeStorageManager] Failed to configure storage:",
        error,
      );
      throw error;
    }
  }

  /**
   * Configure storage provider
   */
  private static _configureProvider(
    provider: StorageOptions["provider"],
    customProvider?: StorageOptions["customProvider"],
  ): void {
    // Validate provider
    if (provider === "custom" && !customProvider) {
      throw new Error("Custom provider specified but not provided");
    }

    // Check if provider is available
    if (provider === "localStorage" || provider === "sessionStorage") {
      try {
        // Test storage availability
        const testKey = `__storage_test__${Date.now()}`;
        window[provider].setItem(testKey, "test");
        window[provider].removeItem(testKey);
      } catch (_e) {
        throw new Error(`${provider} is not available`);
      }
    }

    // Set provider
    this._storageProvider = provider;

    // Set custom provider if applicable
    if (provider === "custom") {
      this._customProvider = customProvider;
    } else {
      this._customProvider = null;
    }
  }

  /**
   * Configure storage key prefix
   */
  private static _configureKeyPrefix(prefix: string): void {
    if (typeof prefix !== "string") {
      throw new Error("Key prefix must be a string");
    }

    this._keyPrefix = prefix;
  }

  /**
   * Migrate data between storage providers
   */
  private static async _migrateData(
    fromProvider: StorageOptions["provider"],
    toProvider: StorageOptions["provider"],
    customProvider?: StorageOptions["customProvider"],
  ): Promise<void> {
    try {
      // Get all theme data from current provider
      const themeNames = await this.getStoredThemeNames();
      const themeMode = await this.getThemeMode();
      const useSystem = await this.getUseSystem();

      // Temporarily switch to new provider
      const originalProvider = this._storageProvider;
      const originalCustomProvider = this._customProvider;

      this._storageProvider = toProvider;
      if (toProvider === "custom") {
        this._customProvider = customProvider;
      }

      // Save all data to new provider
      if (themeMode) await this.saveThemeMode(themeMode);
      await this.saveUseSystem(useSystem);

      // Save theme names
      for (const themeName of themeNames) {
        const themeData = await this.getThemeData(themeName);
        if (themeData) {
          await this.saveThemeData(themeName, themeData);
        }
      }

      // Restore original provider to complete migration
      this._storageProvider = originalProvider;
      this._customProvider = originalCustomProvider;

      console.log(
        `[ThemeStorageManager] Data migrated from ${fromProvider} to ${toProvider}`,
      );
    } catch (error) {
      console.error("[ThemeStorageManager] Failed to migrate data:", error);
      throw error;
    }
  }

  /**
   * Synchronous get method for browser storage
   * @param key storage key
   * @returns parsed value or null
   */
  static getSync<T>(key: string): T | null {
    if (typeof window === "undefined") return null;

    try {
      const prefixedKey = this._keyPrefix ? `${this._keyPrefix}:${key}` : key;
      let value: string | null = null;

      if (this._storageProvider === "sessionStorage") {
        value = sessionStorage.getItem(prefixedKey);
      } else if (
        this._storageProvider === "localStorage" ||
        !this._storageProvider
      ) {
        value = localStorage.getItem(prefixedKey);
      } else {
        return null;
      }

      if (!value) return null;

      const parsed = JSON.parse(value) as T;

      if (!this.isValidValue(key, parsed)) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Synchronous set method for browser storage
   * @param key storage key
   * @param value value to store
   */
  static setSync<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;

    try {
      if (!this.isValidValue(key, value)) return;

      const prefixedKey = this._keyPrefix ? `${this._keyPrefix}:${key}` : key;
      const serializedValue = JSON.stringify(value);

      if (this._storageProvider === "sessionStorage") {
        sessionStorage.setItem(prefixedKey, serializedValue);
      } else {
        localStorage.setItem(prefixedKey, serializedValue);
      }
    } catch (err) {
      console.error(`[ThemeStorage] Failed to setSync ${key}:`, err);
    }
  }

  /**
   * Generic get method with type safety
   * @param key storage key
   * @returns parsed value or null
   */
  static async get<T>(key: string): Promise<T | null> {
    if (typeof window === "undefined") return null;

    try {
      // Apply key prefix if set
      const prefixedKey = this._keyPrefix ? `${this._keyPrefix}:${key}` : key;

      // Use the configured provider
      let value: string | null = null;

      if (this._storageProvider === "custom" && this._customProvider) {
        const result = this._customProvider.getItem(prefixedKey);
        if (result instanceof Promise) {
          value = await result;
        } else {
          value = result;
        }
      } else if (this._storageProvider === "sessionStorage") {
        value = sessionStorage.getItem(prefixedKey);
      } else {
        // Default to localStorage
        value = localStorage.getItem(prefixedKey);
      }

      if (!value) return null;

      const parsed = JSON.parse(value) as T;

      if (!this.isValidValue(key, parsed)) {
        console.warn(`[ThemeStorage] Invalid value for ${key}:`, parsed);
        return null;
      }

      return parsed;
    } catch (err) {
      console.error(`[ThemeStorage] Failed to get ${key}:`, err);
      return null;
    }
  }

  /**
   * Generic set method with type checking
   * @param key storage key
   * @param value value to store
   * @throws Error if value is invalid or storage fails
   */
  static async set<T>(key: string, value: T): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      if (!this.isValidValue(key, value)) {
        throw new Error(`Invalid value for ${key}: ${value}`);
      }

      // Apply key prefix if set
      const prefixedKey = this._keyPrefix ? `${this._keyPrefix}:${key}` : key;
      const serializedValue = JSON.stringify(value);

      // Use the configured provider
      if (this._storageProvider === "custom" && this._customProvider) {
        const result = this._customProvider.setItem(
          prefixedKey,
          serializedValue,
        );
        if (result instanceof Promise) {
          await result;
        }
      } else if (this._storageProvider === "sessionStorage") {
        sessionStorage.setItem(prefixedKey, serializedValue);
      } else {
        // Default to localStorage
        localStorage.setItem(prefixedKey, serializedValue);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      console.error(`[ThemeStorage] Failed to set ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if a value is valid for a given storage key
   * @param key storage key
   * @param value value to validate
   * @returns boolean indicating if value is valid
   */
  private static isValidValue(key: string, value: unknown): boolean {
    // For theme data keys
    if (key.startsWith(this.KEYS.THEME_DATA_PREFIX)) {
      return themeValidationManager.isThemeColorsType(value);
    }

    // For preference keys
    switch (key) {
      case this.KEYS.THEME_NAME:
        return this.isValidThemeName(value);
      case this.KEYS.THEME_MODE:
        return this.isValidMode(value);
      case this.KEYS.USE_SYSTEM:
        return typeof value === "boolean";
      default:
        return true; // Allow other values for extensibility
    }
  }

  /**
   * Check if a value is a valid theme name
   * @param value value to validate
   * @returns type predicate for ThemeName
   */
  private static isValidThemeName(value: unknown): value is ThemeName {
    return (
      typeof value === "string" &&
      (this.VALID_THEMES as readonly ThemeName[]).includes(value as ThemeName)
    );
  }

  /**
   * Check if a value is a valid mode
   * @param value value to validate
   * @returns type predicate for Mode
   */
  private static isValidMode(value: unknown): value is ThemeMode {
    return (
      typeof value === "string" && this.VALID_MODES.includes(value as ThemeMode)
    );
  }

  /**
   * Get stored theme name synchronously
   */
  static getThemeNameSync(): ThemeName | null {
    return this.getSync<ThemeName>(this.KEYS.THEME_NAME);
  }

  /**
   * Save theme name to storage synchronously
   */
  static saveThemeNameSync(themeName: ThemeName): void {
    if (this.isValidThemeName(themeName)) {
      this.setSync(this.KEYS.THEME_NAME, themeName);
    }
  }

  /**
   * Get stored theme name
   * @returns stored theme name or null if not found/invalid
   */
  static async getThemeName(): Promise<ThemeName | null> {
    return await this.get<ThemeName>(this.KEYS.THEME_NAME);
  }

  /**
   * Save theme name to storage
   * @param themeName ThemeName to save
   * @throws Error if theme name is invalid
   */
  static async saveThemeName(themeName: ThemeName): Promise<void> {
    if (!this.isValidThemeName(themeName)) {
      throw new Error(`Invalid theme name: ${themeName}`);
    }
    await this.set(this.KEYS.THEME_NAME, themeName);
  }

  /**
   * Get stored theme mode synchronously
   */
  static getThemeModeSync(): ThemeMode | null {
    return this.getSync<ThemeMode>(this.KEYS.THEME_MODE);
  }

  /**
   * Save theme mode synchronously
   */
  static saveThemeModeSync(mode: ThemeMode): void {
    if (this.isValidMode(mode)) {
      this.setSync(this.KEYS.THEME_MODE, mode);
    }
  }

  /**
   * Get stored theme mode
   * @returns stored mode or null if not found/invalid
   */
  static async getThemeMode(): Promise<ThemeMode | null> {
    return await this.get<ThemeMode>(this.KEYS.THEME_MODE);
  }

  /**
   * Save theme mode to storage
   * @param mode Mode to save
   * @throws Error if mode is invalid
   */
  static async saveThemeMode(mode: ThemeMode): Promise<void> {
    if (!this.isValidMode(mode)) {
      throw new Error(`Invalid mode: ${mode}`);
    }
    await this.set(this.KEYS.THEME_MODE, mode);
  }

  /**
   * Get system preference setting synchronously
   */
  static getUseSystemSync(): boolean {
    return this.getSync<boolean>(this.KEYS.USE_SYSTEM) ?? false;
  }

  /**
   * Save system preference setting synchronously
   */
  static saveUseSystemSync(useSystem: boolean): void {
    if (typeof useSystem === "boolean") {
      this.setSync(this.KEYS.USE_SYSTEM, useSystem);
    }
  }

  /**
   * Get system preference setting
   * @returns boolean indicating if system preference is enabled
   */
  static async getUseSystem(): Promise<boolean> {
    return (await this.get<boolean>(this.KEYS.USE_SYSTEM)) ?? false;
  }

  /**
   * Save system preference setting
   * @param useSystem boolean value to save
   */
  static async saveUseSystem(useSystem: boolean): Promise<void> {
    if (typeof useSystem !== "boolean") {
      throw new Error(`Invalid useSystem value: ${useSystem}`);
    }
    await this.set(this.KEYS.USE_SYSTEM, useSystem);
  }

  // ---- Theme Data Storage Methods ----

  /**
   * Save a theme to local storage
   * @param themeName The name of the theme
   * @param theme The theme data to save
   * @returns boolean indicating success
   */
  static async saveThemeData(
    themeName: ThemeName,
    theme: ThemeColors,
  ): Promise<boolean> {
    if (typeof window === "undefined") return false;

    try {
      // Validate the theme
      if (!themeValidationManager.isThemeColorsType(theme)) {
        console.warn(`[ThemeStorage] Invalid theme data for ${themeName}`);
        return false;
      }

      const key = this.getThemeDataKey(themeName);
      const themeJson = JSON.stringify(theme);

      // Check size before saving
      if (themeJson.length > this.MAX_THEME_SIZE) {
        console.warn(
          `[ThemeStorage] Theme ${themeName} exceeds max size (${themeJson.length} bytes)`,
        );
        return false;
      }

      // Use the set method which handles storage provider selection
      await this.set(key, theme);
      return true;
    } catch (err) {
      console.error(`[ThemeStorage] Failed to save theme ${themeName}:`, err);
      return false;
    }
  }

  /**
   * Get a theme from local storage
   * @param themeName The name of the theme to retrieve
   * @returns The theme data or null if not found
   */
  static async getThemeData(themeName: ThemeName): Promise<ThemeColors | null> {
    if (typeof window === "undefined") return null;

    try {
      const key = this.getThemeDataKey(themeName);
      return await this.get<ThemeColors>(key);
    } catch (err) {
      console.error(`[ThemeStorage] Failed to get theme ${themeName}:`, err);
      return null;
    }
  }

  /**
   * Check if a theme exists in local storage
   * @param themeName The name of the theme to check
   * @returns boolean indicating if the theme exists
   */
  static async hasThemeData(themeName: ThemeName): Promise<boolean> {
    if (typeof window === "undefined") return false;

    const key = this.getThemeDataKey(themeName);

    try {
      // Check based on storage provider
      if (this._storageProvider === "custom" && this._customProvider) {
        const result = this._customProvider.getItem(key);
        if (result instanceof Promise) {
          return (await result) !== null;
        }
        return result !== null;
      } else if (this._storageProvider === "sessionStorage") {
        return sessionStorage.getItem(key) !== null;
      } else {
        return localStorage.getItem(key) !== null;
      }
    } catch (error) {
      console.error(
        `[ThemeStorage] Error checking theme data for ${themeName}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Remove a theme from local storage
   * @param themeName The name of the theme to remove
   */
  static async removeThemeData(themeName: ThemeName): Promise<void> {
    if (typeof window === "undefined") return;

    const key = this.getThemeDataKey(themeName);

    try {
      // Remove based on storage provider
      if (this._storageProvider === "custom" && this._customProvider) {
        const result = this._customProvider.removeItem(key);
        if (result instanceof Promise) {
          await result;
        }
      } else if (this._storageProvider === "sessionStorage") {
        sessionStorage.removeItem(key);
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(
        `[ThemeStorage] Error removing theme data for ${themeName}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Clear all theme related storage
   */
  static async clearStorage(): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      // Clear preference keys
      for (const key of Object.values(this.KEYS)) {
        if (typeof key === "string" && !key.includes("PREFIX")) {
          if (this._storageProvider === "custom" && this._customProvider) {
            const result = this._customProvider.removeItem(key);
            if (result instanceof Promise) {
              await result;
            }
          } else if (this._storageProvider === "sessionStorage") {
            sessionStorage.removeItem(key);
          } else {
            localStorage.removeItem(key);
          }
        }
      }

      // Clear theme data
      await this.clearAllThemeData();
    } catch (err) {
      console.error("[ThemeStorage] Failed to clear storage:", err);
      throw err;
    }
  }

  /**
   * Clear all theme data from storage
   */
  static async clearAllThemeData(): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      const prefix = this.KEYS.THEME_DATA_PREFIX;

      // Handle different storage providers
      if (this._storageProvider === "custom" && this._customProvider) {
        // For custom providers, we'd need to implement a way to list all keys
        // This is a simplified version that assumes we can't list keys
        console.warn(
          "[ThemeStorage] Cannot clear all theme data for custom provider",
        );
      } else if (this._storageProvider === "sessionStorage") {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }
        // Remove keys separately to avoid index shifting during removal
        for (const key of keysToRemove) {
          sessionStorage.removeItem(key);
        }
      } else {
        // Default to localStorage
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }
        // Remove keys separately to avoid index shifting during removal
        for (const key of keysToRemove) {
          localStorage.removeItem(key);
        }
      }
    } catch (err) {
      console.error("[ThemeStorage] Failed to clear theme data:", err);
      throw err;
    }
  }

  /**
   * Get all stored theme names
   * @returns Array of theme names that are stored
   */
  static async getStoredThemeNames(): Promise<ThemeName[]> {
    if (typeof window === "undefined") return [];

    try {
      const prefix = this.KEYS.THEME_DATA_PREFIX;
      const themeNames: ThemeName[] = [];

      // Handle different storage providers
      if (this._storageProvider === "custom" && this._customProvider) {
        // For custom providers, we'd need to implement a way to list all keys
        // This is a simplified version that assumes we can't list keys
        console.warn(
          "[ThemeStorage] Cannot get stored theme names for custom provider",
        );
        return [];
      } else if (this._storageProvider === "sessionStorage") {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith(prefix)) {
            const themeName = key.substring(prefix.length) as ThemeName;
            themeNames.push(themeName);
          }
        }
      } else {
        // Default to localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            const themeName = key.substring(prefix.length) as ThemeName;
            themeNames.push(themeName);
          }
        }
      }

      return themeNames;
    } catch (err) {
      console.error("[ThemeStorage] Failed to get stored theme names:", err);
      return [];
    }
  }

  /**
   * Get storage usage information for themes
   * @returns Object with storage usage details
   */
  static async getThemeStorageInfo(): Promise<{
    themeCount: number;
    themeNames: ThemeName[];
    totalBytes: number;
  }> {
    if (typeof window === "undefined") {
      return { themeCount: 0, themeNames: [], totalBytes: 0 };
    }

    try {
      const themeNames = await this.getStoredThemeNames();
      let totalBytes = 0;

      // Calculate size for each theme
      for (const themeName of themeNames) {
        const key = this.getThemeDataKey(themeName);
        let size = 0;

        if (this._storageProvider === "custom" && this._customProvider) {
          const result = this._customProvider.getItem(key);
          let item: string | null = null;

          if (result instanceof Promise) {
            item = await result;
          } else {
            item = result;
          }

          if (item) {
            size = item.length * 2; // Approximate size in bytes (UTF-16)
          }
        } else if (this._storageProvider === "sessionStorage") {
          const item = sessionStorage.getItem(key);
          if (item) {
            size = item.length * 2;
          }
        } else {
          const item = localStorage.getItem(key);
          if (item) {
            size = item.length * 2;
          }
        }

        totalBytes += size;
      }

      return {
        themeCount: themeNames.length,
        themeNames,
        totalBytes,
      };
    } catch (err) {
      console.error("[ThemeStorage] Failed to get theme storage info:", err);
      return { themeCount: 0, themeNames: [], totalBytes: 0 };
    }
  }

  /**
   * Generate a storage key for a theme
   * @param themeName The theme name
   * @returns The storage key
   */
  private static getThemeDataKey(themeName: ThemeName): string {
    return `${this.KEYS.THEME_DATA_PREFIX}${themeName}`;
  }

  /**
   * Helper to handle potentially Promise-returning functions
   * @param result The result which might be a Promise
   * @returns A Promise that resolves to the result
   */
  private static async handlePromiseOrValue<T>(
    result: T | Promise<T>,
  ): Promise<T> {
    if (result instanceof Promise) {
      return await result;
    }
    return result;
  }
}
