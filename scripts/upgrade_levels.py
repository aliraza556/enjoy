#!/usr/bin/env python3
"""
Level Quality Upgrade Script for enjoy
Adds missing fields and fixes karma progression across all 100 levels
Uses in-place text editing to preserve comments and formatting
"""

import yaml
import os
import sys
import re
from pathlib import Path

# Phase configurations with karma ranges
PHASE_CONFIG = {
    "Foundation": {
        "levels": range(1, 21),
        "karma_start": 5,
        "karma_end": 25,
        "min_words_start": 1,
        "min_words_end": 3,
        "max_words_start": 1,
        "max_words_end": 10,
        "patterns": ["word", "letter", "text"]
    },
    "Complexity": {
        "levels": range(21, 41),
        "karma_start": 26,
        "karma_end": 50,
        "min_words_start": 2,
        "min_words_end": 5,
        "max_words_start": 5,
        "max_words_end": 20,
        "patterns": ["pattern", "sequence", "number"]
    },
    "Metamorphosis": {
        "levels": range(41, 61),
        "karma_start": 51,
        "karma_end": 100,
        "min_words_start": 3,
        "min_words_end": 10,
        "max_words_start": 10,
        "max_words_end": 50,
        "patterns": ["format", "structure", "data"]
    },
    "Consciousness": {
        "levels": range(61, 81),
        "karma_start": 101,
        "karma_end": 200,
        "min_words_start": 5,
        "min_words_end": 20,
        "max_words_start": 20,
        "max_words_end": 100,
        "patterns": ["rule", "logic", "meta"]
    },
    "Final Ascent": {
        "levels": range(81, 95),
        "karma_start": 201,
        "karma_end": 500,
        "min_words_start": 10,
        "min_words_end": 50,
        "max_words_start": 50,
        "max_words_end": 200,
        "patterns": ["component", "design", "system"]
    },
    "Transcendence": {
        "levels": range(95, 101),
        "karma_start": 501,
        "karma_end": 1000,
        "min_words_start": 1,
        "min_words_end": 1,
        "max_words_start": 999,
        "max_words_end": 9999,
        "patterns": ["any"]
    }
}

def interpolate(start, end, position, total):
    """Linear interpolation between start and end"""
    return int(start + (end - start) * position / max(total - 1, 1))

def get_phase_for_level(level):
    for phase_name, config in PHASE_CONFIG.items():
        if level in config["levels"]:
            return phase_name, config
    return None, None

def upgrade_level(filepath):
    """
    Upgrade a level file using text manipulation to preserve comments
    """
    with open(filepath) as f:
        content = f.read()
    
    # Parse YAML to get values
    data = yaml.safe_load(content)
    if not data:
        return False, "Empty file"
    
    level = data.get('level')
    if not level:
        return False, "Missing level field"
    
    phase_name, config = get_phase_for_level(level)
    if not config:
        return False, f"Unknown phase for level {level}"
    
    # Calculate position within phase
    phase_levels = list(config["levels"])
    position = phase_levels.index(level)
    total = len(phase_levels)
    
    modified = False
    
    # Calculate new values
    new_karma = interpolate(config["karma_start"], config["karma_end"], position, total)
    new_min_words = interpolate(config["min_words_start"], config["min_words_end"], position, total)
    new_max_words = interpolate(config["max_words_start"], config["max_words_end"], position, total)
    pattern_idx = position % len(config["patterns"])
    new_pattern = config["patterns"][pattern_idx]
    
    # Get current rules section
    rules = data.get('rules', {})
    karma = data.get('karma', {})
    
    # Update karma.base if needed
    if karma.get('base') != new_karma:
        # Find and replace karma base
        pattern = r'(karma:\s*\n\s*base:\s*)\d+'
        if re.search(pattern, content):
            content = re.sub(pattern, f'\\g<1>{new_karma}', content)
            modified = True
    
    # Add min_words if missing
    if 'min_words' not in rules:
        # Find rules section and add min_words
        rules_match = re.search(r'(rules:\s*\n)', content)
        if rules_match:
            insert_pos = rules_match.end()
            # Find next line's indentation
            next_line = content[insert_pos:insert_pos+100].split('\n')[0]
            indent = len(next_line) - len(next_line.lstrip())
            if indent == 0:
                indent = 2
            content = content[:insert_pos] + f'{" " * indent}min_words: {new_min_words}\n' + content[insert_pos:]
            modified = True
    
    # Add max_words if missing
    if 'max_words' not in rules:
        rules_match = re.search(r'(rules:\s*\n)', content)
        if rules_match:
            insert_pos = rules_match.end()
            next_line = content[insert_pos:insert_pos+100].split('\n')[0]
            indent = len(next_line) - len(next_line.lstrip())
            if indent == 0:
                indent = 2
            content = content[:insert_pos] + f'{" " * indent}max_words: {new_max_words}\n' + content[insert_pos:]
            modified = True
    
    # Add required_patterns if no patterns defined
    if 'required_patterns' not in rules and 'forbidden_patterns' not in rules:
        rules_match = re.search(r'(rules:\s*\n)', content)
        if rules_match:
            insert_pos = rules_match.end()
            next_line = content[insert_pos:insert_pos+100].split('\n')[0]
            indent = len(next_line) - len(next_line.lstrip())
            if indent == 0:
                indent = 2
            content = content[:insert_pos] + f'{" " * indent}required_patterns:\n{" " * indent}  - "{new_pattern}"\n' + content[insert_pos:]
            modified = True
    
    if modified:
        with open(filepath, 'w') as f:
            f.write(content)
    
    return True, f"Upgraded level {level}" + (" (modified)" if modified else " (no changes)")

def main():
    levels_dir = Path(__file__).parent.parent / 'levels'
    
    upgraded = 0
    errors = 0
    
    for filepath in sorted(levels_dir.glob('*.yaml')):
        success, message = upgrade_level(filepath)
        if success:
            upgraded += 1
            print(f"✅ {filepath.name}: {message}")
        else:
            errors += 1
            print(f"❌ {filepath.name}: {message}")
    
    print(f"\n📊 Summary: {upgraded} upgraded, {errors} errors")
    return errors == 0

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
