import { describe, it, expect } from 'vitest';
import { hashAuthor, sanitizePath, isSafeRegex, safeRegex, safeRegexTest } from '../utils.js';

describe('Utils', () => {
  describe('hashAuthor', () => {
    it('should return a 16-character hex string', () => {
      const hash = hashAuthor('testuser');

      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(16);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });

    it('should return consistent hashes for same input', () => {
      const hash1 = hashAuthor('testuser');
      const hash2 = hashAuthor('testuser');

      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different inputs', () => {
      const hash1 = hashAuthor('user1');
      const hash2 = hashAuthor('user2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('sanitizePath', () => {
    it('should allow valid relative paths', () => {
      expect(() => sanitizePath('file.txt')).not.toThrow();
      expect(() => sanitizePath('folder/file.txt')).not.toThrow();
    });

    it('should reject path traversal attempts', () => {
      expect(() => sanitizePath('../file.txt')).toThrow();
      expect(() => sanitizePath('folder/../../../etc/passwd')).toThrow();
    });

    it('should reject absolute paths', () => {
      expect(() => sanitizePath('/etc/passwd')).toThrow();
    });

    it('should reject hidden files', () => {
      expect(() => sanitizePath('.hidden')).toThrow();
      expect(() => sanitizePath('folder/.hidden')).toThrow();
    });

    it('should validate against base directory when provided', () => {
      expect(() => sanitizePath('file.txt', 'rules')).not.toThrow();
    });
  });

  describe('isSafeRegex', () => {
    it('should accept safe patterns', () => {
      expect(isSafeRegex('^hello$')).toBe(true);
      expect(isSafeRegex('[a-z]+')).toBe(true);
      expect(isSafeRegex('\\d{3}')).toBe(true);
    });

    it('should reject dangerous patterns (ReDoS)', () => {
      expect(isSafeRegex('(a+)+')).toBe(false);
      expect(isSafeRegex('(a*)*')).toBe(false);
    });

    it('should reject overly long patterns', () => {
      const longPattern = 'a'.repeat(1001);
      expect(isSafeRegex(longPattern)).toBe(false);
    });
  });

  describe('safeRegex', () => {
    it('should return RegExp for safe patterns', () => {
      const regex = safeRegex('^test$');
      expect(regex).toBeInstanceOf(RegExp);
    });

    it('should return null for unsafe patterns', () => {
      const regex = safeRegex('(a+)+');
      expect(regex).toBeNull();
    });

    it('should return null for invalid regex syntax', () => {
      const regex = safeRegex('[invalid');
      expect(regex).toBeNull();
    });
  });

  describe('safeRegexTest', () => {
    it('should test regex safely', () => {
      const regex = /^hello$/;
      expect(safeRegexTest(regex, 'hello')).toBe(true);
      expect(safeRegexTest(regex, 'world')).toBe(false);
    });

    it('should reject inputs that are too long', () => {
      const regex = /test/;
      const longInput = 'a'.repeat(1001);
      expect(safeRegexTest(regex, longInput)).toBe(false);
    });
  });
});
