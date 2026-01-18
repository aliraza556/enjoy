// Type definitions for the enjoy game engine

export interface Rule {
  id: string;
  name: string;
  description: string;
  version: number;
  enabled: boolean;
  priority: number;
  trigger: {
    type: string;
    conditions: Array<Record<string, any>>;
  };
  validate: Array<Record<string, boolean>>;
  effect: {
    action: string;
    element: {
      type: string;
      content: string;
      position: string;
      color: string;
      size: number;
    };
  };
  points: {
    base: number;
    bonus?: Array<{
      condition: string;
      points: number;
    }>;
  };
}

export interface BoardElement {
  id: string;
  type: string;
  content?: string;
  x: number;
  y: number;
  color: string;
  size?: number;
  added_by_pr: string;
  added_at: string;
  rule_id: string;
}

export interface GameState {
  version: string;
  last_updated: string;
  last_pr: string | null;
  score: {
    total: number;
    today: number;
    streak_days: number;
  };
  board: {
    width: number;
    height: number;
    elements: BoardElement[];
  };
  players: Record<string, {
    prs_merged: number;
    points_contributed: number;
    first_seen: string;
  }>;
  rules_triggered: Record<string, number>;
  meta: {
    total_prs: number;
    total_players: number;
    game_started: string;
  };
}

export interface PRMetadata {
  number: number;
  author: string;
  files_added: string[];
  files_modified: string[];
  files_removed: string[];
  commit_message: string;
  timestamp: string;
}

export interface ValidationResult {
  valid: boolean;
  matched_rules: string[];
  points: number;
  reason?: string;
  effects?: any[];
}
