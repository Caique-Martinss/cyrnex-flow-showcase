/**
 * Database boundary used by the current MVP runtime.
 *
 * The JSON adapter remains the active local/legacy implementation until the
 * PostgreSQL/Supabase repositories are connected. Application modules import
 * only from this file so the storage engine can be replaced without spreading
 * adapter-specific imports through the codebase.
 */
export {
  initializeBusinessDatabase,
  readDatabase,
  saveDatabase
} from './adapters/fileDatabase.js';
