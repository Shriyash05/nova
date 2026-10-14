export interface NotionScopeDescription {
  id: string;
  name: string;
  description: string;
  accessLevel: 'read' | 'write' | 'none';
}

export const NOTION_REQUESTED_SCOPES: NotionScopeDescription[] = [
  {
    id: 'insert_blocks',
    name: 'Add voice notes & blocks',
    description: 'Allows NOVA to append transcribed voice memos, to-dos, and meeting notes into your designated database.',
    accessLevel: 'write'
  },
  {
    id: 'read_databases',
    name: 'Read target database structure',
    description: 'Allows NOVA to inspect tags, date columns, and select properties in your chosen database to assign categories.',
    accessLevel: 'read'
  },
  {
    id: 'write_pages',
    name: 'Create summary pages',
    description: 'Allows NOVA to create standalone document pages for longer recorded sessions.',
    accessLevel: 'write'
  }
];

export const NOTION_EXCLUDED_PERMISSIONS: string[] = [
  'NOVA cannot delete existing workspaces, pages, or databases',
  'NOVA cannot view personal Notion account passwords or payment details',
  'NOVA cannot read unrelated pages or workspaces you have not explicitly linked'
];

export interface NotionConnectionInfo {
  isConnected: boolean;
  workspaceId: string | null;
  workspaceName: string | null;
  workspaceIcon: string | null;
  ownerEmail: string | null;
  botId: string | null;
  targetDatabaseId: string | null;
  targetDatabaseName: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  pendingSyncCount: number;
}

export interface NotionSyncTestResult {
  success: boolean;
  pageTitle: string;
  pageUrl: string;
  databaseName: string;
  latencyMs: number;
  syncedTimestamp: string;
}
