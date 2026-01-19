import { describe, it, expect, beforeEach } from 'vitest';
import {
  ACHIEVEMENTS,
  DAILY_CHALLENGES,
  getTodayChallenge,
  getStreakMultiplier,
  updateStreak,
  openMysteryBox,
  checkMysteryBox,
  processContribution,
  AchievementContext
} from '../gamification.js';
import { GameState, Player } from '../types.js';

// Helper to create test player
function createTestPlayer(overrides: Partial<Player> = {}): Player {
  return {
    karma: 50,
    prs: 5,
    streak: 0,
    achievements: [],
    joined: new Date().toISOString(),
    ...overrides
  };
}

// Helper to create test state
function createTestState(): GameState {
  return {
    version: '4.0.0',
    last_updated: new Date().toISOString(),
    last_pr: '#1',
    meta: {
      game_started: '2024-01-01T00:00:00Z',
      total_players: 1,
      total_prs: 10
    },
    board: {
      width: 800,
      height: 600,
      elements: []
    },
    players: {},
    score: {
      total: 100,
      today: 20,
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

describe('Gamification System', () => {
  describe('ACHIEVEMENTS', () => {
    it('should have all required fields', () => {
      for (const ach of ACHIEVEMENTS) {
        expect(ach.id).toBeDefined();
        expect(ach.name).toBeDefined();
        expect(ach.emoji).toBeDefined();
        expect(ach.description).toBeDefined();
        expect(ach.karma_reward).toBeGreaterThan(0);
        expect(typeof ach.check).toBe('function');
      }
    });

    it('should have unique IDs', () => {
      const ids = ACHIEVEMENTS.map(a => a.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('first_blood should trigger at 1 PR', () => {
      const ach = ACHIEVEMENTS.find(a => a.id === 'first_blood');
      expect(ach).toBeDefined();

      const player0 = createTestPlayer({ prs: 0 });
      const player1 = createTestPlayer({ prs: 1 });
      const state = createTestState();

      expect(ach!.check(player0, state)).toBe(false);
      expect(ach!.check(player1, state)).toBe(true);
    });

    it('karma_hunter should trigger at 100 karma', () => {
      const ach = ACHIEVEMENTS.find(a => a.id === 'karma_hunter');
      expect(ach).toBeDefined();

      const player99 = createTestPlayer({ karma: 99 });
      const player100 = createTestPlayer({ karma: 100 });
      const state = createTestState();

      expect(ach!.check(player99, state)).toBe(false);
      expect(ach!.check(player100, state)).toBe(true);
    });

    it('streak_7 should trigger at 7 day streak', () => {
      const ach = ACHIEVEMENTS.find(a => a.id === 'streak_7');
      expect(ach).toBeDefined();

      const player6 = createTestPlayer({ streak: 6 });
      const player7 = createTestPlayer({ streak: 7 });
      const state = createTestState();

      expect(ach!.check(player6, state)).toBe(false);
      expect(ach!.check(player7, state)).toBe(true);
    });

    it('wordsmith should trigger with high karma context', () => {
      const ach = ACHIEVEMENTS.find(a => a.id === 'wordsmith');
      expect(ach).toBeDefined();

      const player = createTestPlayer();
      const state = createTestState();

      const lowContext: AchievementContext = { karma: 50 };
      const highContext: AchievementContext = { karma: 80 };

      expect(ach!.check(player, state, lowContext)).toBe(false);
      expect(ach!.check(player, state, highContext)).toBe(true);
    });
  });

  describe('DAILY_CHALLENGES', () => {
    it('should have all required fields', () => {
      for (const challenge of DAILY_CHALLENGES) {
        expect(challenge.id).toBeDefined();
        expect(challenge.name).toBeDefined();
        expect(challenge.description).toBeDefined();
        expect(challenge.multiplier).toBeGreaterThan(1);
        expect(typeof challenge.check).toBe('function');
      }
    });

    it('should have unique IDs', () => {
      const ids = DAILY_CHALLENGES.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('seven_letters challenge should match 7-letter words', () => {
      const challenge = DAILY_CHALLENGES.find(c => c.id === 'seven_letters');
      expect(challenge).toBeDefined();

      expect(challenge!.check('karma')).toBe(false);     // 5 letters
      expect(challenge!.check('awesome')).toBe(true);    // 7 letters
      expect(challenge!.check('wonderful')).toBe(false); // 9 letters
    });

    it('palindrome challenge should detect palindromes', () => {
      const challenge = DAILY_CHALLENGES.find(c => c.id === 'palindrome');
      expect(challenge).toBeDefined();

      expect(challenge!.check('ab')).toBe(false);        // Too short
      expect(challenge!.check('aba')).toBe(true);        // Valid palindrome
      expect(challenge!.check('racecar')).toBe(true);    // Valid palindrome
      expect(challenge!.check('hello')).toBe(false);     // Not a palindrome
    });

    it('starts_with_vowel should detect vowel-starting words', () => {
      const challenge = DAILY_CHALLENGES.find(c => c.id === 'starts_with_vowel');
      expect(challenge).toBeDefined();

      expect(challenge!.check('apple')).toBe(true);
      expect(challenge!.check('enjoy')).toBe(true);
      expect(challenge!.check('karma')).toBe(false);
    });
  });

  describe('getTodayChallenge', () => {
    it('should return a valid challenge', () => {
      const challenge = getTodayChallenge();

      expect(challenge).toBeDefined();
      expect(challenge.id).toBeDefined();
      expect(challenge.multiplier).toBeGreaterThan(1);
    });

    it('should return same challenge for same day', () => {
      const challenge1 = getTodayChallenge();
      const challenge2 = getTodayChallenge();

      expect(challenge1.id).toBe(challenge2.id);
    });
  });

  describe('getStreakMultiplier', () => {
    it('should return 1.0 for no streak', () => {
      expect(getStreakMultiplier(0)).toBe(1.0);
      expect(getStreakMultiplier(1)).toBe(1.0);
      expect(getStreakMultiplier(2)).toBe(1.0);
    });

    it('should return 1.5 for 3+ day streak', () => {
      expect(getStreakMultiplier(3)).toBe(1.5);
      expect(getStreakMultiplier(5)).toBe(1.5);
      expect(getStreakMultiplier(6)).toBe(1.5);
    });

    it('should return 2.0 for 7+ day streak', () => {
      expect(getStreakMultiplier(7)).toBe(2.0);
      expect(getStreakMultiplier(10)).toBe(2.0);
      expect(getStreakMultiplier(13)).toBe(2.0);
    });

    it('should return 2.5 for 14+ day streak', () => {
      expect(getStreakMultiplier(14)).toBe(2.5);
      expect(getStreakMultiplier(20)).toBe(2.5);
      expect(getStreakMultiplier(29)).toBe(2.5);
    });

    it('should return 3.0 for 30+ day streak', () => {
      expect(getStreakMultiplier(30)).toBe(3.0);
      expect(getStreakMultiplier(60)).toBe(3.0);
      expect(getStreakMultiplier(100)).toBe(3.0);
    });
  });

  describe('updateStreak', () => {
    it('should maintain streak for same day contribution', () => {
      const now = new Date().toISOString();
      const player = createTestPlayer({ streak: 5 });

      const result = updateStreak(player, now);
      expect(result.streak).toBe(5);
    });

    it('should increment streak for consecutive day', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const player = createTestPlayer({ streak: 5 });

      const result = updateStreak(player, yesterday.toISOString());
      expect(result.streak).toBe(6);
    });

    it('should reset streak after missing a day', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const player = createTestPlayer({ streak: 10 });

      const result = updateStreak(player, twoDaysAgo.toISOString());
      expect(result.streak).toBe(1);
    });
  });

  describe('checkMysteryBox', () => {
    it('should return true for every 5th contribution', () => {
      expect(checkMysteryBox(5)).toBe(true);
      expect(checkMysteryBox(10)).toBe(true);
      expect(checkMysteryBox(15)).toBe(true);
      expect(checkMysteryBox(100)).toBe(true);
    });

    it('should return false for non-5th contributions', () => {
      expect(checkMysteryBox(1)).toBe(false);
      expect(checkMysteryBox(2)).toBe(false);
      expect(checkMysteryBox(3)).toBe(false);
      expect(checkMysteryBox(4)).toBe(false);
      expect(checkMysteryBox(6)).toBe(false);
    });

    it('should return false for 0 contributions', () => {
      expect(checkMysteryBox(0)).toBe(false);
    });
  });

  describe('openMysteryBox', () => {
    it('should return a valid reward', () => {
      const reward = openMysteryBox();

      expect(reward).toBeDefined();
      expect(reward.type).toBeDefined();
      expect(['karma', 'achievement', 'multiplier']).toContain(reward.type);
      expect(reward.name).toBeDefined();
      expect(reward.emoji).toBeDefined();
    });

    it('should return different rewards over time (randomness)', () => {
      const rewards = new Set<string>();
      // Run multiple times to verify some randomness
      for (let i = 0; i < 50; i++) {
        const reward = openMysteryBox();
        rewards.add(reward.name);
      }
      // With weighted randomness, we should see at least 2 different rewards
      expect(rewards.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('processContribution', () => {
    let state: GameState;

    beforeEach(() => {
      state = createTestState();
    });

    it('should return valid gamification result', () => {
      const player = createTestPlayer({ prs: 5, karma: 50, streak: 2 });

      const result = processContribution(player, state, 10, 'stellar');

      expect(result.base_karma).toBe(10);
      expect(result.total_karma).toBeGreaterThan(0);
      expect(result.streak_multiplier).toBeGreaterThanOrEqual(1);
      expect(result.challenge_multiplier).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(result.new_achievements)).toBe(true);
    });

    it('should apply streak multiplier', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const player = createTestPlayer({
        prs: 10,
        streak: 7, // Should get 2.0x multiplier
        last_contribution: yesterday.toISOString()
      });

      const result = processContribution(player, state, 10, 'test');

      expect(result.streak_multiplier).toBe(2.0);
    });

    it('should check daily challenge', () => {
      const player = createTestPlayer({ prs: 5 });
      const challenge = getTodayChallenge();

      // Find a word that matches today's challenge
      let testWord = 'test';
      if (challenge.id === 'seven_letters') {
        testWord = 'awesome';
      } else if (challenge.id === 'palindrome') {
        testWord = 'racecar';
      } else if (challenge.id === 'starts_with_vowel') {
        testWord = 'enjoy';
      }

      const result = processContribution(player, state, 10, testWord);

      if (challenge.check(testWord)) {
        expect(result.challenge_completed).toBe(true);
        expect(result.challenge_multiplier).toBe(challenge.multiplier);
      }
    });

    it('should trigger mystery box every 5 contributions', () => {
      const player = createTestPlayer({ prs: 4 }); // Next will be 5th

      const result = processContribution(player, state, 10, 'test');

      expect(result.mystery_box).toBeDefined();
    });

    it('should not trigger mystery box on non-5th contributions', () => {
      const player = createTestPlayer({ prs: 3 }); // Next will be 4th

      const result = processContribution(player, state, 10, 'test');

      expect(result.mystery_box).toBeUndefined();
    });
  });
});
