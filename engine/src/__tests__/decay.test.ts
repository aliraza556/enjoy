import { describe, it, expect, beforeEach } from 'vitest';
import {
  shouldApplyDecay,
  applyKarmaDecay,
  applyLevelDecay,
  applyDecaySystem,
  getDecayStatus,
  DecayConfig
} from '../decay.js';
import { GameState } from '../types.js';

function createMockState(daysAgo: number): GameState {
  const lastUpdated = new Date();
  lastUpdated.setDate(lastUpdated.getDate() - daysAgo);

  return {
    board: {
      title: 'Test Board',
      width: 800,
      height: 600,
      elements: []
    },
    players: {},
    karma: {
      global: 1000,
      history: []
    },
    levels: {
      current: 5,
      unlocked: [1, 2, 3, 4, 5]
    },
    rules: {
      active: ['001']
    },
    last_updated: lastUpdated.toISOString()
  };
}

const testConfig: DecayConfig = {
  enabled: true,
  inactivity_threshold_days: 7,
  karma_decay_rate: 0.02,
  level_decay_threshold_days: 14,
  min_level: 1
};

describe('Decay System', () => {
  describe('shouldApplyDecay', () => {
    it('should return false when decay is disabled', () => {
      const state = createMockState(30);
      const config = { ...testConfig, enabled: false };

      expect(shouldApplyDecay(state, config)).toBe(false);
    });

    it('should return false when within threshold', () => {
      const state = createMockState(3);

      expect(shouldApplyDecay(state, testConfig)).toBe(false);
    });

    it('should return true when past threshold', () => {
      const state = createMockState(10);

      expect(shouldApplyDecay(state, testConfig)).toBe(true);
    });

    it('should return true at exactly the threshold', () => {
      const state = createMockState(7);

      expect(shouldApplyDecay(state, testConfig)).toBe(true);
    });
  });

  describe('applyKarmaDecay', () => {
    it('should not decay karma within threshold', () => {
      const state = createMockState(3);
      const originalKarma = state.karma.global;

      const result = applyKarmaDecay(state, testConfig);

      expect(result.decayed).toBe(false);
      expect(result.old_karma).toBe(originalKarma);
      expect(result.new_karma).toBe(originalKarma);
    });

    it('should decay karma after threshold', () => {
      const state = createMockState(10);
      const originalKarma = state.karma.global;

      const result = applyKarmaDecay(state, testConfig);

      expect(result.decayed).toBe(true);
      expect(result.old_karma).toBe(originalKarma);
      expect(result.new_karma).toBeLessThan(originalKarma);
      expect(state.karma.global).toBe(result.new_karma);
    });

    it('should not decay below zero', () => {
      const state = createMockState(365);
      state.karma.global = 10;

      const result = applyKarmaDecay(state, testConfig);

      expect(result.new_karma).toBeGreaterThanOrEqual(0);
    });

    it('should decay more with more inactive days', () => {
      const state10 = createMockState(10);
      const state30 = createMockState(30);

      const result10 = applyKarmaDecay(state10, testConfig);
      const result30 = applyKarmaDecay(state30, testConfig);

      expect(result30.new_karma).toBeLessThan(result10.new_karma);
    });
  });

  describe('applyLevelDecay', () => {
    it('should not decay level within threshold', () => {
      const state = createMockState(10);

      const result = applyLevelDecay(state, testConfig);

      expect(result.decayed).toBe(false);
      expect(result.reason).toBe('Not enough inactivity');
    });

    it('should decay level after threshold', () => {
      const state = createMockState(20);
      const originalLevel = state.levels.current;

      const result = applyLevelDecay(state, testConfig);

      expect(result.decayed).toBe(true);
      expect(result.old_level).toBe(originalLevel);
      expect(result.new_level).toBeLessThan(originalLevel);
    });

    it('should not decay below min_level', () => {
      const state = createMockState(365);
      state.levels.current = 2;

      const result = applyLevelDecay(state, testConfig);

      expect(result.new_level).toBeGreaterThanOrEqual(testConfig.min_level);
    });

    it('should not decay when already at min_level', () => {
      const state = createMockState(30);
      state.levels.current = 1;

      const result = applyLevelDecay(state, testConfig);

      expect(result.decayed).toBe(false);
      expect(result.reason).toBe('Already at minimum level');
    });

    it('should remove higher levels from unlocked list', () => {
      const state = createMockState(30);

      applyLevelDecay(state, testConfig);

      expect(state.levels.unlocked.every(l => l <= state.levels.current)).toBe(true);
    });
  });

  describe('applyDecaySystem', () => {
    it('should apply both karma and level decay', () => {
      const state = createMockState(30);

      const result = applyDecaySystem(state, testConfig);

      expect(result.karma_decay.decayed).toBe(true);
      expect(result.level_decay.decayed).toBe(true);
      expect(result.message).toContain('Karma decayed');
      expect(result.message).toContain('Level dropped');
    });

    it('should show active message when no decay applied', () => {
      const state = createMockState(1);

      const result = applyDecaySystem(state, testConfig);

      expect(result.message).toBe('✅ No decay applied - game is active!');
    });
  });

  describe('getDecayStatus', () => {
    it('should show not at risk when within threshold', () => {
      const state = createMockState(3);

      const status = getDecayStatus(state, testConfig);

      expect(status.at_risk).toBe(false);
      expect(status.days_until_karma_decay).toBeGreaterThan(0);
      expect(status.warning_message).toBe('');
    });

    it('should show at risk when past threshold', () => {
      const state = createMockState(10);

      const status = getDecayStatus(state, testConfig);

      expect(status.at_risk).toBe(true);
      expect(status.days_until_karma_decay).toBe(0);
      expect(status.warning_message).toContain('INACTIVITY WARNING');
    });

    it('should warn about imminent level decay', () => {
      const state = createMockState(8);

      const status = getDecayStatus(state, testConfig);

      expect(status.at_risk).toBe(true);
      expect(status.days_until_level_decay).toBeGreaterThan(0);
      expect(status.warning_message).toContain('Level decay in');
    });

    it('should warn about active level decay', () => {
      const state = createMockState(20);

      const status = getDecayStatus(state, testConfig);

      expect(status.at_risk).toBe(true);
      expect(status.days_until_level_decay).toBe(0);
      expect(status.warning_message).toContain('Level is decaying');
    });
  });
});
