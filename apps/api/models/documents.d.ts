// SPDX-License-Identifier: MIT
// Issue #509: TypeScript type declarations for documents.js God-File.
// Provides type safety for consumers without requiring a full .ts migration.

/** A workspace document row from the database. */
export interface WorkspaceDocumentRow {
  id: number;
  docId: string;
  filename: string;
  docpath: string;
  metadata: string | null;
  pinned: boolean;
  watched: boolean;
  createdAt: Date;
  lastUpdatedAt: Date;
  workspaceId: number;
}

/** Result of parsing document type and source from metadata. */
export interface ParsedDocumentTypeAndSource {
  metadata: Record<string, unknown> | null;
  type: string | null;
  source: string | null;
}

/** Result of adding documents to a workspace. */
export interface AddDocumentsResult {
  success: boolean;
  failedToEmbed?: string[];
  errors?: unknown[];
}

/** The Document model object. */
export interface IDocument {
  /** Fields that can be written via generic updates. */
  writable: string[];

  /** API namespace for document sync operations. */
  api: {
    [key: string]: (...args: unknown[]) => Promise<unknown>;
  };

  /** Parse document type and source from metadata. */
  parseDocumentTypeAndSource(document: WorkspaceDocumentRow): ParsedDocumentTypeAndSource;

  /** Get documents for a workspace. */
  forWorkspace(workspaceId?: number | null): Promise<WorkspaceDocumentRow[]>;

  /** Delete a document by clause. */
  delete(clause?: Record<string, unknown>): Promise<unknown>;

  /** Get a document by clause. */
  get(clause?: Record<string, unknown>): Promise<WorkspaceDocumentRow | null>;

  /** List documents. */
  where(): Promise<WorkspaceDocumentRow[]>;

  /** Add documents to a workspace. */
  addDocuments(
    workspace: unknown,
    additions?: string[],
    userId?: number | null
  ): Promise<AddDocumentsResult>;

  /** Remove documents from a workspace. */
  removeDocuments(
    workspace: unknown,
    removals?: string[],
    userId?: number | null
  ): Promise<unknown>;

  /** Count documents matching a clause. */
  count(clause?: Record<string, unknown>, limit?: number | null): Promise<number>;

  /** Update a document by ID. */
  update(id?: number | null, data?: Record<string, unknown>): Promise<unknown>;

  /** Update all documents matching a clause. */
  _updateAll(clause?: Record<string, unknown>, data?: Record<string, unknown>): Promise<unknown>;

  /** Get document content by docId. */
  content(docId: string): Promise<string | null>;

  /** Get document content by doc path. */
  contentByDocPath(docPath: string): Promise<string | null>;

  /** Strip source URL for a given type. */
  _stripSource(sourceString: string, type: string): string;

  /** Upload a document to a workspace. */
  uploadToWorkspace(...args: unknown[]): Promise<boolean>;
}

/** The Document singleton (typed). */
declare const Document: IDocument;
export default Document;
export { Document };
