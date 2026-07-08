// SPDX-License-Identifier: MIT
// Issue #509: TypeScript type declarations for user.js God-File.
// Provides type safety for consumers without requiring a full .ts migration.

/** A user row from the database. */
export interface UserRow {
  id: number;
  username: string;
  password: string;
  pfpFilename: string | null;
  role: string;
  suspended: boolean;
  dailyMessageLimit: number | null;
  dailyMessageUsedAt: number;
  dailyMessageResetAt: number;
  bio: string | null;
  createdAt: Date;
  lastUpdatedAt: Date;
}

/** Valid user roles. */
export type UserRole = 'default' | 'admin' | 'manager';

/** The User model object. */
export interface IUser {
  /** Username validation regex. */
  usernameRegex: RegExp;

  /** Fields that can be written via generic updates. */
  writable: string[];

  /** Field validator functions. */
  validations: {
    username: (newValue?: string) => string;
    role: (role?: string) => string;
    dailyMessageLimit: (value?: unknown) => number | null;
    bio: (value?: unknown) => string;
  };

  /** Threshold for failed login attempts before lockout. */
  FAILED_LOGIN_THRESHOLD: number;

  /** Time window for failed login tracking (ms). */
  FAILED_LOGIN_WINDOW_MS: number;

  /** Cast a column value to the correct type. */
  castColumnValue(key: string, value: unknown): unknown;

  /** Filter user fields to only writable ones. */
  filterFields(user?: Record<string, unknown>): Partial<UserRow>;

  /** Check if a user is locked out due to failed logins. */
  isLockedOut(user: UserRow): Promise<boolean>;

  /** Record a failed login attempt. */
  recordFailedLogin(userId: number): Promise<void>;

  /** Reset failed login counters. */
  resetFailedLogins(userId: number): Promise<void>;

  /** Identify error type and format a user-friendly message. */
  _identifyErrorAndFormatMessage(error: unknown): string;

  /** Create a new user. */
  create(...args: unknown[]): Promise<UserRow>;

  /** Get logged changes between updates and previous data. */
  loggedChanges(updates: Record<string, unknown>, prev?: Record<string, unknown>): Record<string, unknown>;

  /** Update a user by ID. */
  update(userId: number, updates?: Record<string, unknown>): Promise<UserRow>;

  /** Internal update without validation. */
  _update(id?: number | null, data?: Record<string, unknown>): Promise<Record<string, unknown>>;

  /** Internal where query. */
  _where(clause?: Record<string, unknown>, limit?: number | null): Promise<UserRow[]>;

  /** Get a user by clause. */
  get(clause?: Record<string, unknown>): Promise<UserRow | null>;

  /** Internal get (raw). */
  _get(clause?: Record<string, unknown>): Promise<unknown>;

  /** Count users matching a clause. */
  count(clause?: Record<string, unknown>): Promise<number>;

  /** Delete a user by clause. */
  delete(clause?: Record<string, unknown>): Promise<unknown>;

  /** List users with optional limit. */
  where(clause?: Record<string, unknown>, limit?: number | null): Promise<UserRow[]>;

  /** Check password complexity. */
  checkPasswordComplexity(passwordInput?: string): { valid: boolean; error: string | null };

  /** Check if a user can send a chat (daily limit). */
  canSendChat(user: UserRow): Promise<boolean>;
}

/** The User singleton (typed). */
declare const User: IUser;
export default User;
export { User };
