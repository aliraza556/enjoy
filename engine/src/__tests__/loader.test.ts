import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import { loadState, saveState, loadRules, invalidateStateCache } from '../loader.js';
import { GameState } from '../types.js';

// Mock fs module
vi.mock('fs');

const mockValidState: GameState = {
  board: {
    title: 'Test Board',
    width: 800,
    height: 600,
    elements: []
  },
  players: {},
  karma: {
    global: 100,
    history: []
  },
  levels: {
    current: 1,
    unlocked: [1]
  },
  rules: {
    active: ['001']
  },
  last_updated: new Date().toISOString()
};

describe('Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateStateCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadState', () => {
    it('should load and parse valid state.json', () => {
      const mockStats = { mtimeMs: Date.now() };
      vi.mocked(fs.statSync).mockReturnValue(mockStats as fs.Stats);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockValidState));

      const state = loadState(true);

      expect(state).toEqual(mockValidState);
      expect(fs.readFileSync).toHaveBeenCalledWith('./state.json', 'utf8');
    });

    it('should use cache for repeated reads within TTL', () => {
      const mockStats = { mtimeMs: Date.now() };
      vi.mocked(fs.statSync).mockReturnValue(mockStats as fs.Stats);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockValidState));

      // First read - bypasses cache
      loadState(true);

      // Second read - should use cache
      loadState(false);

      // readFileSync should only be called once
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when requested', () => {
      const mockStats = { mtimeMs: Date.now() };
      vi.mocked(fs.statSync).mockReturnValue(mockStats as fs.Stats);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockValidState));

      loadState(true);
      loadState(true);

      expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    });

    it('should throw on invalid JSON', () => {
      const mockStats = { mtimeMs: Date.now() };
      vi.mocked(fs.statSync).mockReturnValue(mockStats as fs.Stats);
      vi.mocked(fs.readFileSync).mockReturnValue('not valid json');

      expect(() => loadState(true)).toThrow();
    });

    it('should throw on invalid state schema', () => {
      const mockStats = { mtimeMs: Date.now() };
      vi.mocked(fs.statSync).mockReturnValue(mockStats as fs.Stats);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ invalid: true }));

      expect(() => loadState(true)).toThrow('Invalid state.json schema');
    });

    it('should throw when file does not exist', () => {
      vi.mocked(fs.statSync).mockImplementation(() => {
        throw new Error('ENOENT');
      });

      expect(() => loadState(true)).toThrow();
    });
  });

  describe('saveState', () => {
    it('should save valid state atomically', () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockValidState));
      vi.mocked(fs.renameSync).mockImplementation(() => {});
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => saveState(mockValidState)).not.toThrow();
      expect(fs.writeFileSync).toHaveBeenCalledWith('./state.json.tmp', expect.any(String));
      expect(fs.renameSync).toHaveBeenCalledWith('./state.json.tmp', './state.json');
    });

    it('should throw on invalid state', () => {
      const invalidState = { invalid: true } as unknown as GameState;

      expect(() => saveState(invalidState)).toThrow('Attempted to save invalid state');
    });

    it('should clean up temp file on failure', () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => {});

      expect(() => saveState(mockValidState)).toThrow();
      expect(fs.unlinkSync).toHaveBeenCalledWith('./state.json.tmp');
    });
  });

  describe('loadRules', () => {
    it('should load all enabled YAML rules', () => {
      vi.mocked(fs.readdirSync).mockReturnValue(['rule1.yaml', 'rule2.yml', 'notarule.txt'] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce('id: "001"\nenabled: true\npriority: 10')
        .mockReturnValueOnce('id: "002"\nenabled: true\npriority: 20');

      const rules = loadRules();

      expect(rules).toHaveLength(2);
      // Should be sorted by priority (higher first)
      expect(rules[0].priority).toBe(20);
      expect(rules[1].priority).toBe(10);
    });

    it('should skip disabled rules', () => {
      vi.mocked(fs.readdirSync).mockReturnValue(['rule1.yaml'] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFileSync).mockReturnValue('id: "001"\nenabled: false\npriority: 10');

      const rules = loadRules();

      expect(rules).toHaveLength(0);
    });
  });

  describe('invalidateStateCache', () => {
    it('should clear the cache', () => {
      const mockStats = { mtimeMs: Date.now() };
      vi.mocked(fs.statSync).mockReturnValue(mockStats as fs.Stats);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockValidState));

      loadState(true);
      invalidateStateCache();
      loadState(false);

      // Should read file again after invalidation
      expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    });
  });
});
