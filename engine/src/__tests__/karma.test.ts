import { describe, it, expect, beforeEach } from 'vitest';
import {
  analyzeContributionQuality,
  applyKarma,
  trackReferral,
  applyReferralKarma,
  canProposeRules,
  getVotingPower,
  KarmaAnalysis
} from '../karma.js';
import { GameState, PRMetadata } from '../types.js';

// Helper to create minimal valid game state
function createTestState(): GameState {
  return {
    version: '4.0.0',
    last_updated: new Date().toISOString(),
    last_pr: '#1',
    meta: {
      game_started: '2024-01-01T00:00:00Z',
      total_players: 0,
      total_prs: 0
    },
    board: {
      width: 800,
      height: 600,
      elements: []
    },
    players: {},
    score: {
      total: 0,
      today: 0,
      streak_days: 0
    },
    levels: {
      current: 1,
      max_level: 100,
      unlocked: [1],
      next_unlock: {
        level_id: 2,
        requires_score: 50,
        requires_prs: 5,
        progress: { score: 0, prs: 0 }
      }
    },
    rules: {
      active: ['001'],
      proposed: [],
      archived: []
    },
    rules_triggered: {},
    karma: {
      global: 100,
      threshold_good: 60,
      multiplier_active: 1.0
    },
    reputation: {
      top_coders: [],
      voting_power: {}
    }
  };
}

function createTestPR(overrides: Partial<PRMetadata> = {}): PRMetadata {
  return {
    number: 1,
    author: 'testuser',
    commit_message: 'Add word: test',
    files_added: ['words/test.txt'],
    files_modified: [],
    files_removed: [],
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

function createBoardElement(content: string) {
  return {
    id: `el_${Date.now()}`,
    type: 'text',
    content,
    x: 0,
    y: 0,
    color: '#fff',
    added_by_pr: '#1',
    added_at: new Date().toISOString(),
    rule_id: '001'
  };
}

describe('Karma System', () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestState();
  });

  describe('analyzeContributionQuality', () => {
    it('should give positive score for optimal word length (5-10 chars)', () => {
      const pr = createTestPR();
      const result = analyzeContributionQuality(pr, 'karma', state);

      expect(result.quality_score).toBeGreaterThanOrEqual(50);
      expect(result.reasons).toContain('Optimal word length');
    });

    it('should penalize short words (< 3 chars)', () => {
      const pr = createTestPR();
      const result = analyzeContributionQuality(pr, 'ab', state);

      expect(result.quality_score).toBeLessThan(50);
      expect(result.reasons).toContain('Too short');
    });

    it('should penalize long words (> 15 chars)', () => {
      const pr = createTestPR();
      const result = analyzeContributionQuality(pr, 'supercalifragilisticexpialidocious', state);

      expect(result.quality_score).toBeLessThan(60);
      expect(result.reasons).toContain('Too long');
    });

    it('should penalize boring/common words', () => {
      const pr = createTestPR();
      const boringWords = ['test', 'hello', 'world', 'foo', 'bar'];

      for (const word of boringWords) {
        const result = analyzeContributionQuality(pr, word, state);
        expect(result.reasons).toContain('Common/boring word');
      }
    });

    it('should reward well-formed words (vowels + consonants)', () => {
      const pr = createTestPR();
      const result = analyzeContributionQuality(pr, 'karma', state);

      expect(result.reasons).toContain('Well-formed word');
    });

    it('should penalize keyboard mash (no vowels)', () => {
      const pr = createTestPR();
      const result = analyzeContributionQuality(pr, 'bcdfgh', state);

      expect(result.reasons).toContain('Suspicious pattern');
    });

    it('should detect duplicates with Unicode normalization', () => {
      // Add existing word to board
      state.board.elements.push(createBoardElement('test'));

      const pr = createTestPR();

      // Test exact duplicate
      const result1 = analyzeContributionQuality(pr, 'test', state);
      expect(result1.reasons).toContain('Duplicate word');

      // Test case-insensitive duplicate
      const result2 = analyzeContributionQuality(pr, 'TEST', state);
      expect(result2.reasons).toContain('Duplicate word');

      // Test Unicode variant (should also be detected as duplicate)
      const result3 = analyzeContributionQuality(pr, 'tëst', state);
      expect(result3.reasons).toContain('Duplicate word');
    });

    it('should return "refuse" action for bad quality', () => {
      const pr = createTestPR();
      // Very short + no vowels = bad
      const result = analyzeContributionQuality(pr, 'x', state);

      expect(result.is_bad).toBe(true);
      expect(result.action).toBe('refuse');
      expect(result.amplification_factor).toBe(0);
    });

    it('should return "amplify" action for excellent quality', () => {
      state.karma.global = 600; // Need > 500 for x3 amplification
      const pr = createTestPR({ commit_message: 'This is a very descriptive commit message for testing' });

      // Good word: optimal length, well-formed, not boring, descriptive commit
      const result = analyzeContributionQuality(pr, 'stellar', state);

      expect(result.quality_score).toBeGreaterThanOrEqual(70);
      expect(result.action).not.toBe('refuse');
    });

    it('should clamp quality_score between 0 and 100', () => {
      const pr = createTestPR();

      // Test lower bound
      const badResult = analyzeContributionQuality(pr, 'x', state);
      expect(badResult.quality_score).toBeGreaterThanOrEqual(0);

      // Test upper bound
      const goodResult = analyzeContributionQuality(pr, 'stellar', state);
      expect(goodResult.quality_score).toBeLessThanOrEqual(100);
    });
  });

  describe('applyKarma', () => {
    it('should create new player if not exists', () => {
      const pr = createTestPR({ author: 'newplayer' });
      const analysis: KarmaAnalysis = {
        quality_score: 70,
        is_good: true,
        is_excellent: false,
        is_bad: false,
        reasons: [],
        amplification_factor: 2,
        action: 'amplify'
      };

      state.players = {};
      applyKarma(state, pr, analysis);

      // Player should be created
      const playerKeys = Object.keys(state.players);
      expect(playerKeys.length).toBe(1);
    });

    it('should add karma for good contributions', () => {
      const pr = createTestPR();
      const analysis: KarmaAnalysis = {
        quality_score: 70,
        is_good: true,
        is_excellent: false,
        is_bad: false,
        reasons: [],
        amplification_factor: 2,
        action: 'amplify'
      };

      const initialGlobalKarma = state.karma.global;
      applyKarma(state, pr, analysis);

      expect(state.karma.global).toBe(initialGlobalKarma + 10);
    });

    it('should never let global karma go negative', () => {
      state.karma.global = 3; // Low karma

      const pr = createTestPR();
      const analysis: KarmaAnalysis = {
        quality_score: 30,
        is_good: false,
        is_excellent: false,
        is_bad: true,
        reasons: ['Low quality'],
        amplification_factor: 0,
        action: 'refuse'
      };

      applyKarma(state, pr, analysis);

      expect(state.karma.global).toBeGreaterThanOrEqual(0);
    });
  });

  describe('trackReferral', () => {
    it('should block self-referral', () => {
      const result = trackReferral(state, 'alice', 'alice');

      expect(result).toBe(false);
      expect(state.referrals?.chains['alice']).toBeUndefined();
    });

    it('should block case-insensitive self-referral', () => {
      const result = trackReferral(state, 'Alice', 'ALICE');

      expect(result).toBe(false);
    });

    it('should track valid referral', () => {
      const result = trackReferral(state, 'alice', 'bob');

      expect(result).toBe(true);
      expect(state.referrals?.chains['alice']?.invited).toContain('bob');
      expect(state.referrals?.stats?.total_invites).toBe(1);
    });

    it('should detect circular referral chains', () => {
      // A invites B
      trackReferral(state, 'alice', 'bob');

      // B invites C
      trackReferral(state, 'bob', 'charlie');

      // C tries to invite A (circular!)
      const result = trackReferral(state, 'charlie', 'alice');

      expect(result).toBe(false);
    });

    it('should track chain depth correctly', () => {
      // A invites B
      trackReferral(state, 'alice', 'bob');

      // B invites C
      trackReferral(state, 'bob', 'charlie');

      expect(state.referrals?.chains['bob']?.chain_depth).toBeGreaterThanOrEqual(1);
    });
  });

  describe('applyReferralKarma', () => {
    it('should award karma to inviter when invitee contributes', () => {
      // Setup: alice invited bob
      trackReferral(state, 'alice', 'bob');

      // Initialize alice as player
      state.players['alice'] = {
        karma: 50,
        prs: 10,
        streak: 0,
        achievements: [],
        joined: new Date().toISOString()
      };

      const initialKarma = state.players['alice'].karma;
      applyReferralKarma(state, 'bob', 70, 2);

      expect(state.players['alice'].karma).toBeGreaterThan(initialKarma);
    });
  });

  describe('canProposeRules', () => {
    it('should allow top coders to propose', () => {
      // Player must exist in state.players
      state.players['player_hash'] = {
        karma: 10,
        prs: 1,
        streak: 0,
        achievements: [],
        joined: new Date().toISOString()
      };
      state.reputation = {
        top_coders: ['player_hash'],
        voting_power: { 'player_hash': 10 }
      };

      expect(canProposeRules(state, 'player_hash')).toBe(true);
    });

    it('should allow experienced players to propose', () => {
      state.players['player_hash'] = {
        karma: 100,
        prs: 0,
        prs_merged: 60,
        reputation: 60,
        streak: 0,
        achievements: [],
        joined: new Date().toISOString()
      };

      expect(canProposeRules(state, 'player_hash')).toBe(true);
    });

    it('should allow high karma players to propose', () => {
      state.players['player_hash'] = {
        karma: 600,
        prs: 0,
        prs_merged: 5,
        reputation: 10,
        streak: 0,
        achievements: [],
        joined: new Date().toISOString()
      };

      expect(canProposeRules(state, 'player_hash')).toBe(true);
    });

    it('should deny proposal rights to new players', () => {
      state.players['player_hash'] = {
        karma: 10,
        prs: 1,
        streak: 0,
        achievements: [],
        joined: new Date().toISOString()
      };

      expect(canProposeRules(state, 'player_hash')).toBe(false);
    });
  });

  describe('getVotingPower', () => {
    it('should return power 1-10 for top coders', () => {
      state.reputation = {
        top_coders: ['player_hash'],
        voting_power: { 'player_hash': 8 }
      };

      expect(getVotingPower(state, 'player_hash')).toBe(8);
    });

    it('should calculate power based on reputation for non-top-coders', () => {
      state.players['player_hash'] = {
        karma: 100,
        prs: 20,
        reputation: 60,
        streak: 0,
        achievements: [],
        joined: new Date().toISOString()
      };

      expect(getVotingPower(state, 'player_hash')).toBe(3);
    });

    it('should cap voting power at 5 for non-top-coders', () => {
      state.players['player_hash'] = {
        karma: 1000,
        prs: 100,
        reputation: 200,
        streak: 0,
        achievements: [],
        joined: new Date().toISOString()
      };

      expect(getVotingPower(state, 'player_hash')).toBe(5);
    });

    it('should return 0 for unknown players', () => {
      expect(getVotingPower(state, 'unknown_hash')).toBe(0);
    });
  });
});
