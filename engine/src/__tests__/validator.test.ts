import { describe, it, expect } from 'vitest';
import { validatePR, extractReferral } from '../validator.js';
import { Rule, PRMetadata } from '../types.js';

/**
 * Create a mock rule for testing
 */
function createMockRule(): Rule {
  return {
    id: 'test-rule',
    name: 'Test Rule',
    description: 'A test rule',
    version: 1,
    enabled: true,
    priority: 100,
    trigger: {
      type: 'file_added',
      conditions: [
        { extension: '.txt' },
        { max_files: 1 }
      ]
    },
    validate: [
      { not_profanity: true },
      { not_duplicate: true }
    ],
    effect: {
      action: 'add_to_board',
      element: {
        type: 'text',
        content: '{{file_content}}',
        position: 'random',
        color: 'random',
        size: 20
      }
    },
    points: {
      base: 10
    }
  };
}

/**
 * Create a mock PR metadata
 */
function createMockPR(overrides: Partial<PRMetadata> = {}): PRMetadata {
  return {
    number: 1,
    author: 'testuser',
    files_added: ['test.txt'],
    files_modified: [],
    files_removed: [],
    commit_message: 'Add test file',
    timestamp: new Date().toISOString(),
    body: '',
    ...overrides
  };
}

describe('Validator', () => {
  describe('validatePR - Null Safety', () => {
    it('should handle empty files_added array', () => {
      const rules = [createMockRule()];
      const pr = createMockPR({ files_added: [] });

      const result = validatePR(rules, pr);

      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should handle undefined files_added', () => {
      const rules = [createMockRule()];
      const pr = createMockPR();
      // @ts-expect-error Testing edge case with undefined
      pr.files_added = undefined;

      // Should not throw
      expect(() => validatePR(rules, pr)).not.toThrow();
    });
  });

  describe('extractReferral', () => {
    it('should extract referral from "Invited by @username"', () => {
      const body = 'This is my PR. Invited by @johndoe';
      const referral = extractReferral(body);
      expect(referral).toBe('johndoe');
    });

    it('should extract referral from "Referred by @username"', () => {
      const body = 'Referred by @janedoe - my first contribution';
      const referral = extractReferral(body);
      expect(referral).toBe('janedoe');
    });

    it('should return null when no referral found', () => {
      const body = 'Just a regular PR with no referral';
      const referral = extractReferral(body);
      expect(referral).toBeNull();
    });

    it('should handle case insensitivity', () => {
      const body = 'INVITED BY @CamelCase';
      const referral = extractReferral(body);
      expect(referral).toBe('CamelCase');
    });
  });
});
