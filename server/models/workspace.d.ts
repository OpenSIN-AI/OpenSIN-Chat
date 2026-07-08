// SPDX-License-Identifier: MIT
// Issue #509: TypeScript type declarations for workspace.js (782 LOC God-File).
// Provides type safety for consumers without requiring a full .ts migration.

/** A workspace row from the database. */
export interface WorkspaceRow {
  id: number;
  name: string;
  slug: string;
  openAiPrompt: string;
  openAiTemp: string;
  openAiHistory: number;
  similarityThreshold: number;
  chatProvider: string;
  chatModel: string;
  topN: number;
  chatMode: string;
  agentProvider: string;
  agentModel: string;
  queryRefusalResponse: string;
  vectorSearchMode: string;
  createdAt: Date;
  lastUpdatedAt: Date;
  routerId?: number | null;
}

/** Result of workspace creation/update operations. */
export interface WorkspaceResult {
  workspace: WorkspaceRow | null;
  message: string | null;
}

/** Parameters for the upsert method. */
export interface WorkspaceUpsertParams {
  clause: object;
  createData: object;
  updateData: object;
}

/** A workspace user entry. */
export interface WorkspaceUserEntry {
  userId: number;
  username: string;
  role: string;
}

/** Prompt history entry. */
export interface WorkspacePromptHistoryEntry {
  id: number;
  prompt: string;
  modifiedAt: Date;
  modifiedBy: number;
  user: {
    id: number;
    username: string;
    role: string;
  };
}

/** The Workspace model object. */
export interface IWorkspace {
  /** Valid chat modes. */
  VALID_CHAT_MODES: string[];

  /** Default system prompt. */
  defaultPrompt: string;

  /** Fields that can be written via generic updates. */
  writable: string[];

  /** Field validator functions. */
  validations: Record<string, (value: unknown) => unknown>;

  /** Slugify a workspace name. */
  slugify(...args: unknown[]): string;

  /** Validate fields before update. */
  validateFields(updates: Record<string, unknown>): Record<string, unknown>;

  /** Create a new workspace. */
  new(
    name: string | null,
    creatorId: number | null,
    additionalFields?: Record<string, unknown>
  ): Promise<WorkspaceResult>;

  /** Update a workspace by ID. */
  update(
    id: number | null,
    updates: Record<string, unknown>
  ): Promise<WorkspaceResult>;

  /** Internal update without validation. */
  _update(
    id: number | null,
    data: Record<string, unknown>
  ): Promise<WorkspaceResult>;

  /** Get a workspace with user context. */
  getWithUser(
    user: unknown | null,
    clause?: Record<string, unknown>
  ): Promise<unknown>;

  /** Get the context window size for a workspace. */
  _getContextWindow(workspace: WorkspaceRow): number | null;

  /** Get a workspace by clause. */
  get(clause?: Record<string, unknown>): Promise<WorkspaceRow | null>;

  /** Delete a workspace by clause. */
  delete(clause?: Record<string, unknown>): Promise<unknown>;

  /** List workspaces with optional limit and ordering. */
  where(
    clause?: Record<string, unknown>,
    limit?: number | null,
    orderBy?: unknown
  ): Promise<WorkspaceRow[]>;

  /** List workspaces with user context. */
  whereWithUser(): Promise<unknown>;

  /** List workspaces with all users. */
  whereWithUsers(
    clause?: Record<string, unknown>,
    limit?: number | null,
    orderBy?: unknown
  ): Promise<unknown>;

  /** Get users for a workspace. */
  workspaceUsers(workspaceId: number): Promise<WorkspaceUserEntry[]>;

  /** Update users assigned to a workspace. */
  updateUsers(
    workspaceId: number,
    userIds?: number[]
  ): Promise<{ success: boolean; error: string | null }>;

  /** Track changes between previous and new workspace data. */
  trackChange(prevData: WorkspaceRow, newData: WorkspaceRow, user: unknown): Promise<void>;

  /** Track workspace prompt changes specifically. */
  _trackWorkspacePromptChange(
    prevData: WorkspaceRow,
    newData: WorkspaceRow,
    user?: { id: number; role: string } | null
  ): Promise<void>;

  /** Internal findMany wrapper. */
  _findMany(prismaQuery?: Record<string, unknown>): Promise<WorkspaceRow[]>;

  /** Internal findFirst wrapper. */
  _findFirst(prismaQuery?: Record<string, unknown>): Promise<WorkspaceRow | null>;

  /** Upsert a workspace. */
  upsert(
    clause?: Record<string, unknown>,
    createData?: Record<string, unknown>,
    updateData?: Record<string, unknown>
  ): Promise<{ workspace: WorkspaceRow | null; error: string | null }>;

  /** Get prompt history for a workspace. */
  promptHistory(options: { workspaceId: number }): Promise<WorkspacePromptHistoryEntry[]>;

  /** Delete all prompt history for a workspace. */
  deleteAllPromptHistory(options: { workspaceId: number }): Promise<boolean>;

  /** Delete a single prompt history entry. */
  deletePromptHistory(options: { workspaceId: number; id: number }): Promise<boolean>;

  /** Check if the workspace's model supports native tool calling. */
  supportsNativeToolCalling(workspace?: Partial<WorkspaceRow>): Promise<boolean>;

  /** Check if the @agent command is available for this workspace. */
  isAgentCommandAvailable(workspace: Partial<WorkspaceRow>): Promise<boolean>;
}

/** The Workspace singleton (typed). */
declare const Workspace: IWorkspace;
export default Workspace;
export { Workspace };
