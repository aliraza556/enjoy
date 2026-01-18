import * as fs from 'fs';
import { PRMetadata } from './types.js';

/**
 * Parse PR metadata from GitHub Actions environment or CLI args
 */
export function parsePR(prNumber: number, files?: any[]): PRMetadata {
  // In real GitHub Actions, we'd get this from the API
  // For now, we'll scan the repo for changes
  
  const author = process.env.GITHUB_ACTOR || 'local';
  const timestamp = new Date().toISOString();
  
  // Get list of untracked/new files
  const filesAdded: string[] = [];
  const filesModified: string[] = [];
  const filesRemoved: string[] = [];
  
  // Simple heuristic: any .txt file in root that's not in state is "added"
  const txtFiles = fs.readdirSync('.').filter(f => f.endsWith('.txt'));
  
  for (const file of txtFiles) {
    if (!file.startsWith('.')) {
      filesAdded.push(file);
    }
  }
  
  return {
    number: prNumber,
    author,
    files_added: filesAdded,
    files_modified: filesModified,
    files_removed: filesRemoved,
    commit_message: process.env.COMMIT_MSG || '',
    timestamp
  };
}

/**
 * Extract file content for validation
 */
export function getFileContent(filepath: string): string {
  try {
    return fs.readFileSync(filepath, 'utf8').trim();
  } catch (e) {
    return '';
  }
}
