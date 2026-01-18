import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { Rule } from './types.js';

/**
 * Load all rules from the rules/ directory
 */
export function loadRules(): Rule[] {
  const rulesDir = './rules';
  const ruleFiles = fs.readdirSync(rulesDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
  
  const rules: Rule[] = [];
  
  for (const file of ruleFiles) {
    const content = fs.readFileSync(`${rulesDir}/${file}`, 'utf8');
    const rule = yaml.load(content) as Rule;
    
    if (rule.enabled) {
      rules.push(rule);
    }
  }
  
  // Sort by priority (higher first)
  return rules.sort((a, b) => b.priority - a.priority);
}

/**
 * Load game state
 */
export function loadState() {
  const content = fs.readFileSync('./state.json', 'utf8');
  return JSON.parse(content);
}

/**
 * Save game state
 */
export function saveState(state: any) {
  fs.writeFileSync('./state.json', JSON.stringify(state, null, 2));
}
