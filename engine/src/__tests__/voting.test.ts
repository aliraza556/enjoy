import { describe, it, expect, beforeEach } from 'vitest';
import { proposeRule, voteOnProposal, getActiveProposals, processVotingResults } from '../voting.js';
import { GameState, RuleProposalContent } from '../types.js';

/**
 * Create a mock game state for testing
 */
function createMockState(): GameState {
  return {
    version: '1.0.0',
    last_updated: new Date().toISOString(),
    last_pr: null,
    score: { total: 0, today: 0, streak_days: 0 },
    levels: {
      current: 1,
      max_level: 100,
      unlocked: [1],
      next_unlock: null
    },
    board: { width: 100, height: 100, elements: [] },
    players: {
      'player1': {
        karma: 600, // Enough to propose
        prs: 10,
        streak: 5,
        achievements: [],
        joined: new Date().toISOString()
      },
      'player2': {
        karma: 100,
        prs: 5,
        streak: 2,
        achievements: [],
        joined: new Date().toISOString()
      }
    },
    karma: {
      global: 1000,
      threshold_good: 50,
      multiplier_active: 1.0
    },
    reputation: {
      top_coders: ['player1'],
      voting_power: { 'player1': 10, 'player2': 5 }
    },
    rules: {
      active: ['001'],
      proposed: []
    },
    rules_triggered: {},
    meta: {
      total_prs: 100,
      total_players: 2,
      game_started: new Date().toISOString()
    }
  };
}

/**
 * Create a valid rule proposal content
 */
function createMockRuleContent(): RuleProposalContent {
  return {
    id: 'test-rule-001',
    name: 'Test Rule',
    description: 'A test rule for unit testing',
    version: 1,
    enabled: true,
    priority: 50
  };
}

describe('Voting System', () => {
  let state: GameState;

  beforeEach(() => {
    state = createMockState();
  });

  describe('proposeRule', () => {
    it('should allow eligible player to propose a rule', () => {
      const result = proposeRule(state, 'player1', createMockRuleContent());
      expect(result.success).toBe(true);
      expect(result.proposalId).toBeDefined();
    });

    it('should reject proposal from non-existent player', () => {
      const result = proposeRule(state, 'unknown-player', createMockRuleContent());
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Player not found');
    });

    it('should reject proposal with invalid rule ID format', () => {
      const invalidRule = createMockRuleContent();
      invalidRule.id = 'invalid id with spaces!';
      const result = proposeRule(state, 'player1', invalidRule);
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Invalid rule ID format');
    });

    it('should reject duplicate rule IDs', () => {
      // First proposal should succeed
      proposeRule(state, 'player1', createMockRuleContent());
      // Second proposal with same ID should fail
      const result = proposeRule(state, 'player1', createMockRuleContent());
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Rule ID already exists');
    });
  });

  describe('voteOnProposal', () => {
    it('should allow player to vote on a proposal', () => {
      // First create a proposal
      const proposeResult = proposeRule(state, 'player1', createMockRuleContent());
      expect(proposeResult.success).toBe(true);

      // Then vote on it
      const voteResult = voteOnProposal(state, proposeResult.proposalId!, 'player2', true);
      expect(voteResult.success).toBe(true);
    });

    it('should reject vote on non-existent proposal', () => {
      const result = voteOnProposal(state, 'fake-proposal-id', 'player1', true);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Proposal not found');
    });
  });

  describe('getActiveProposals', () => {
    it('should return empty array when no proposals exist', () => {
      const proposals = getActiveProposals(state);
      expect(proposals).toEqual([]);
    });

    it('should return active proposals', () => {
      proposeRule(state, 'player1', createMockRuleContent());
      const proposals = getActiveProposals(state);
      expect(proposals.length).toBe(1);
      expect(proposals[0].status).toBe('voting');
    });
  });

  describe('processVotingResults - Array Mutation Safety', () => {
    it('should not skip proposals when processing multiple', () => {
      // Create multiple proposals
      const rule1 = createMockRuleContent();
      const rule2 = { ...createMockRuleContent(), id: 'test-rule-002', name: 'Test Rule 2' };
      const rule3 = { ...createMockRuleContent(), id: 'test-rule-003', name: 'Test Rule 3' };

      proposeRule(state, 'player1', rule1);
      proposeRule(state, 'player1', rule2);
      proposeRule(state, 'player1', rule3);

      expect(state.rules.proposed?.length).toBe(3);

      // Set all voting periods to expired
      for (const proposal of state.rules.proposed || []) {
        proposal.voting_ends = new Date(Date.now() - 1000).toISOString();
      }

      // Process should handle all proposals without skipping
      processVotingResults(state);

      // All proposals should be processed (either approved or rejected)
      const remaining = state.rules.proposed?.filter(p => p.status === 'voting') || [];
      expect(remaining.length).toBe(0);
    });
  });
});
