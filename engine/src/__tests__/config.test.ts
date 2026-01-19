import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import { loadConfig, clearConfigCache, GameConfig } from '../config.js';

// Mock fs module
vi.mock('fs');

const mockValidConfig = `
game:
  name: "Test Game"
  version: "1.0.0"
  max_level: 100
  github_pages_unlock_level: 95
karma:
  amplification:
    x1_threshold: 0
    x2_threshold: 50
    x3_threshold: 80
  scoring:
    base_score: 50
    word_length:
      optimal_min: 5
      optimal_max: 10
      optimal_bonus: 10
      too_short_penalty: -15
      too_long_penalty: -10
    boring_word_penalty: -20
    well_formed_bonus: 10
    suspicious_pattern_penalty: -15
    duplicate_penalty: -30
    descriptive_commit_bonus: 5
    experienced_contributor_bonus: 5
  boring_words:
    - test
    - hello
decay:
  enabled: true
  karma_decay:
    start_after_days: 7
    daily_percentage: 2
    minimum_karma: 0
  level_decay:
    start_after_days: 14
    levels_per_period: 1
    period_days: 7
    minimum_level: 1
referrals:
  enabled: true
  propagation:
    direct_bonus_percentage: 50
    chain_depth_max: 3
    chain_decay_percentage: 50
  achievements:
    first_referral: 10
    recruiter_5: 25
    recruiter_10: 50
    chain_master: 100
validation:
  format:
    word_min_length: 3
    word_max_length: 30
    min_checked_boxes: 3
    sacred_answers:
      - karmiel
  files:
    max_files_per_pr: 1
    allowed_extensions:
      - .txt
    contribution_path: contributions/
rate_limits:
  max_prs_per_user_per_day: 5
  max_prs_per_user_per_hour: 2
  cooldown_after_rejection_minutes: 30
leaderboard:
  display_count: 50
  update_frequency: on_merge
  boards:
    - type: contributors
      title: Top Contributors
      sort_by: karma
`;

describe('Config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearConfigCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadConfig', () => {
    it('should load config from YAML file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockValidConfig);

      const config = loadConfig('game-config.yaml');

      expect(config.game.name).toBe('Test Game');
      expect(config.game.max_level).toBe(100);
      expect(config.karma.scoring.base_score).toBe(50);
    });

    it('should cache config after first load', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockValidConfig);

      loadConfig('game-config.yaml');
      loadConfig('game-config.yaml');

      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should try multiple paths if first not found', () => {
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockValidConfig);

      const config = loadConfig('nonexistent.yaml');

      expect(config.game.name).toBe('Test Game');
    });

    it('should return defaults when no config file found', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loadConfig();

      expect(config.game.name).toBe('Enjoy and contribute!');
      expect(config.game.max_level).toBe(100);
      expect(config.karma.scoring.base_score).toBe(50);
    });

    it('should have valid default karma settings', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loadConfig();

      expect(config.karma.amplification.x1_threshold).toBe(0);
      expect(config.karma.amplification.x2_threshold).toBe(50);
      expect(config.karma.amplification.x3_threshold).toBe(80);
      expect(config.karma.boring_words).toContain('test');
    });

    it('should have valid default decay settings', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loadConfig();

      expect(config.decay.enabled).toBe(true);
      expect(config.decay.karma_decay.start_after_days).toBe(7);
      expect(config.decay.level_decay.minimum_level).toBe(1);
    });

    it('should have valid default referral settings', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loadConfig();

      expect(config.referrals.enabled).toBe(true);
      expect(config.referrals.propagation.chain_depth_max).toBe(3);
    });

    it('should have valid default validation settings', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loadConfig();

      expect(config.validation.format.word_min_length).toBe(3);
      expect(config.validation.format.word_max_length).toBe(30);
      expect(config.validation.files.allowed_extensions).toContain('.txt');
    });

    it('should have valid default rate limit settings', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loadConfig();

      expect(config.rate_limits.max_prs_per_user_per_day).toBe(5);
      expect(config.rate_limits.max_prs_per_user_per_hour).toBe(2);
    });

    it('should have valid default leaderboard settings', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loadConfig();

      expect(config.leaderboard.display_count).toBe(50);
      expect(config.leaderboard.boards.length).toBeGreaterThan(0);
    });
  });

  describe('clearConfigCache', () => {
    it('should clear the cache and force reload', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockValidConfig);

      loadConfig('game-config.yaml');
      clearConfigCache();
      loadConfig('game-config.yaml');

      expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    });
  });
});
