import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import { parsePR, getFileContent } from '../parser.js';

// Mock fs module
vi.mock('fs');

describe('Parser', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('parsePR', () => {
    it('should parse PR metadata from environment variables', () => {
      process.env.GITHUB_ACTOR = 'testuser';
      process.env.PR_FILES_ADDED = 'file1.txt,file2.txt';
      process.env.PR_FILES_MODIFIED = 'modified.ts';
      process.env.PR_FILES_REMOVED = 'removed.ts';
      process.env.COMMIT_MSG = 'Add new feature';
      process.env.PR_BODY = 'This is the PR body';

      const pr = parsePR(123);

      expect(pr.number).toBe(123);
      expect(pr.author).toBe('testuser');
      expect(pr.files_added).toEqual(['file1.txt', 'file2.txt']);
      expect(pr.files_modified).toEqual(['modified.ts']);
      expect(pr.files_removed).toEqual(['removed.ts']);
      expect(pr.commit_message).toBe('Add new feature');
      expect(pr.body).toBe('This is the PR body');
      expect(pr.timestamp).toBeDefined();
    });

    it('should use PR_AUTHOR as fallback for author', () => {
      delete process.env.GITHUB_ACTOR;
      process.env.PR_AUTHOR = 'prauthor';

      const pr = parsePR(1);

      expect(pr.author).toBe('prauthor');
    });

    it('should default to "local" when no author env vars', () => {
      delete process.env.GITHUB_ACTOR;
      delete process.env.PR_AUTHOR;

      const pr = parsePR(1);

      expect(pr.author).toBe('local');
    });

    it('should use provided prFiles array', () => {
      delete process.env.PR_FILES_ADDED;

      const pr = parsePR(1, ['custom.txt']);

      expect(pr.files_added).toEqual(['custom.txt']);
    });

    it('should fallback to local txt files when no env or prFiles', () => {
      delete process.env.PR_FILES_ADDED;
      vi.mocked(fs.readdirSync).mockReturnValue(['file1.txt', 'file2.txt', '.hidden.txt', 'code.ts'] as unknown as fs.Dirent[]);

      const pr = parsePR(1);

      expect(pr.files_added).toEqual(['file1.txt', 'file2.txt']);
    });

    it('should filter empty strings from files list', () => {
      process.env.PR_FILES_ADDED = 'file1.txt,,file2.txt, ';

      const pr = parsePR(1);

      expect(pr.files_added).toEqual(['file1.txt', 'file2.txt']);
    });

    it('should use PR_TITLE as fallback for commit_message', () => {
      delete process.env.COMMIT_MSG;
      process.env.PR_TITLE = 'PR Title';

      const pr = parsePR(1);

      expect(pr.commit_message).toBe('PR Title');
    });
  });

  describe('getFileContent', () => {
    it('should read file content and trim it', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('  hello world  \n');

      const content = getFileContent('test.txt');

      expect(content).toBe('hello world');
    });

    it('should return empty string on error', () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      const content = getFileContent('nonexistent.txt');

      expect(content).toBe('');
    });

    it('should reject path traversal attempts', () => {
      const content = getFileContent('../../../etc/passwd');

      expect(content).toBe('');
    });

    it('should reject absolute paths', () => {
      const content = getFileContent('/etc/passwd');

      expect(content).toBe('');
    });
  });
});
