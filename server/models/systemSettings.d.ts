// SPDX-License-Identifier: MIT
// Issue #9: TypeScript type declarations for systemSettings.js.
// This file provides type safety for consumers without requiring a
// full .ts migration of the 43k-char God-File.

/** A single system setting row from the database. */
export interface SystemSettingRow {
  id: number;
  label: string;
  value: string | null;
  createdAt: Date;
  lastUpdatedAt: Date;
}

/** Result of a field validation function. */
export type ValidationResult<T = string | number | boolean | null> = T | undefined;

/** Parameters for the update method. */
export interface SystemSettingsUpdateParams {
  /** The setting label to update. */
  label: string;
  /** The new value (will be stringified if not a string). */
  value: string | number | boolean | null;
}

/** Parameters for the bulk-update method. */
export interface SystemSettingsBulkUpdateParams {
  [label: string]: string | number | boolean | null;
}

/** The SystemSettings model object. */
export interface ISystemSettings {
  /** Fields that cannot be modified via the API. */
  protectedFields: string[];

  /** Fields that are safe to expose publicly. */
  publicFields: string[];

  /** Default system prompt (German, source-citation-focused). */
  saneDefaultSystemPrompt: string;

  /** Supported font families for the UI. */
  supportedFonts: string[];

  /** Field validator functions. */
  validations: Record<string, (value: unknown) => ValidationResult>;

  /** Get a single setting by label. */
  get(label: { label: string } | string): Promise<SystemSettingRow | null>;

  /** Get a setting by label (alias for get). */
  getByLabel(label: string): Promise<SystemSettingRow | null>;

  /** Get all settings as a key-value map. */
  all(): Promise<Record<string, string>>;

  /** Get all settings with metadata. */
  where(clause?: object): Promise<SystemSettingRow[]>;

  /** Update a single setting. */
  update(params: SystemSettingsUpdateParams): Promise<{ success: boolean; error: string | null }>;

  /** Bulk-update multiple settings in a transaction. */
  bulkUpdate(params: SystemSettingsBulkUpdateParams): Promise<{ success: boolean; error: string | null }>;

  /** Check if multi-user mode is enabled. */
  isMultiUserMode(): Promise<boolean>;

  /** Check if a feature flag is enabled. */
  hasFeature(flag: string): Promise<boolean>;

  /** Get the current settings as a merged object (env + DB). */
  currentSettings(): Promise<Record<string, unknown>>;

  /** Get a setting value with fallback. */
  getOrFallback<T>(label: string, fallback: T): Promise<T>;

  /** Delete a setting by label. */
  delete(label: string): Promise<boolean>;

  /** Check if the system has been set up. */
  isSetupComplete(): Promise<boolean>;

  /** Get the default embedding model. */
  defaultEmbeddingModel(): string | null;

  /** Get the default LLM provider. */
  defaultLLMProvider(): string | null;

  /** Get the default vector database. */
  defaultVectorDb(): string | null;
}

/** The SystemSettings singleton (typed). */
declare const SystemSettings: ISystemSettings;
export default SystemSettings;
