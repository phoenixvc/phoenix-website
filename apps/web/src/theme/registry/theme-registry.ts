// theme/registry/theme-registry.ts

import {
  ThemeColors,
  ThemeName,
  ThemeMode,
  ThemeSchemeInitial,
  ThemeMetadata,
} from "../types";
import { DEFAULT_THEME_NAME } from "../constants/themes/catalog";

/**
 * Theme Registry for managing and storing themes
 */
export class ThemeRegistry {
  // Core themes collection
  themes: Record<ThemeName, ThemeColors>;

  // Theme metadata for UI display
  metadata: Record<ThemeName, ThemeMetadata>;

  // Default settings
  defaults: {
    themeName: ThemeName;
    mode: ThemeMode;
  };

  // Theme versioning
  versions: Record<ThemeName, string[]>;

  // Theme source schemes (for regeneration)
  sourceSchemes: Record<ThemeName, ThemeSchemeInitial>;

  constructor(initialData?: Partial<ThemeRegistry>) {
    this.themes = initialData?.themes || ({} as Record<ThemeName, ThemeColors>);
    this.metadata =
      initialData?.metadata || ({} as Record<ThemeName, ThemeMetadata>);
    this.defaults = {
      themeName: initialData?.defaults?.themeName || DEFAULT_THEME_NAME,
      mode: initialData?.defaults?.mode || "dark",
    };
    this.versions =
      initialData?.versions || ({} as Record<ThemeName, string[]>);
    this.sourceSchemes = {} as Record<ThemeName, ThemeSchemeInitial>;
  }

  /**
   * Register a theme with the registry
   */
  registerTheme(
    name: ThemeName,
    theme: ThemeColors,
    metadata?: Partial<ThemeMetadata>,
    sourceScheme?: ThemeSchemeInitial,
  ): void {
    // Store the theme
    this.themes[name] = theme;

    // Store or update metadata
    if (this.metadata[name]) {
      // Update existing metadata
      this.metadata[name] = {
        ...this.metadata[name],
        ...metadata,
        modified: Date.now(),
      };
    } else {
      // Create new metadata
      this.metadata[name] = {
        displayName: metadata?.displayName || name,
        description: metadata?.description || `Theme ${name}`,
        author: metadata?.author,
        version: metadata?.version || "1.0.0",
        tags: metadata?.tags || [],
        preview: metadata?.preview,
        created: Date.now(),
        modified: Date.now(),
        compatibleModes: metadata?.compatibleModes || ["light", "dark"],
      };
    }

    // Store source scheme if provided
    if (sourceScheme) {
      this.sourceSchemes[name] = sourceScheme;
    }

    // Update versions if needed
    if (metadata?.version) {
      if (!this.versions[name]) {
        this.versions[name] = [];
      }

      // Add version if not already present
      if (!this.versions[name].includes(metadata.version)) {
        this.versions[name].push(metadata.version);
      }
    }
  }

  /**
   * Set the default theme
   */
  setDefaultTheme(themeName: ThemeName, mode?: ThemeMode): void {
    // Verify theme exists
    if (!this.themes[themeName]) {
      throw new Error(
        `Cannot set default theme: Theme "${themeName}" not found in registry`,
      );
    }

    this.defaults.themeName = themeName;

    if (mode) {
      this.defaults.mode = mode;
    }
  }

  /**
   * Get a theme by name
   */
  getTheme(themeName: ThemeName): ThemeColors | null {
    return this.themes[themeName] || null;
  }

  /**
   * Get theme metadata
   */
  getThemeMetadata(themeName: ThemeName): ThemeMetadata | null {
    return this.metadata[themeName] || null;
  }

  /**
   * Get source scheme for a theme
   */
  getSourceScheme(themeName: ThemeName): ThemeSchemeInitial | null {
    return this.sourceSchemes[themeName] || null;
  }

  /**
   * Get all theme names
   */
  getAllThemeNames(): ThemeName[] {
    return Object.keys(this.themes) as ThemeName[];
  }

  /**
   * Search themes by tags
   */
  findThemesByTags(tags: string[]): ThemeName[] {
    return Object.entries(this.metadata)
      .filter(([_, meta]) => {
        if (!meta.tags) return false;
        return tags.some((tag) => meta.tags!.includes(tag));
      })
      .map(([name]) => name as ThemeName);
  }

  /**
   * Export registry data for persistence
   */
  exportData(): {
    themes: Record<ThemeName, ThemeColors>;
    metadata: Record<ThemeName, ThemeMetadata>;
    defaults: {
      themeName: ThemeName;
      mode: ThemeMode;
    };
    versions: Record<ThemeName, string[]>;
    sourceSchemes: Record<ThemeName, ThemeSchemeInitial>;
  } {
    return {
      themes: this.themes,
      metadata: this.metadata,
      defaults: this.defaults,
      versions: this.versions,
      sourceSchemes: this.sourceSchemes,
    };
  }

  /**
   * Import registry data
   */
  importData(data: {
    themes?: Record<ThemeName, ThemeColors>;
    metadata?: Record<ThemeName, ThemeMetadata>;
    defaults?: {
      themeName: ThemeName;
      mode: ThemeMode;
    };
    versions?: Record<ThemeName, string[]>;
    sourceSchemes?: Record<ThemeName, ThemeSchemeInitial>;
  }): void {
    if (data.themes) this.themes = data.themes;
    if (data.metadata) this.metadata = data.metadata;
    if (data.defaults) this.defaults = data.defaults;
    if (data.versions) this.versions = data.versions;
    if (data.sourceSchemes) this.sourceSchemes = data.sourceSchemes;
  }
}

/**
 * Create a new theme registry
 */
export function createThemeRegistry(
  initialData?: Partial<ThemeRegistry>,
): ThemeRegistry {
  return new ThemeRegistry(initialData);
}
