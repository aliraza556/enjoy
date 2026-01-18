#!/usr/bin/env python3
"""
Level Beautifier for enjoy
Adds beautiful headers and comments to all level files
"""

import yaml
import os
from pathlib import Path

# Phase emojis and descriptions
PHASE_INFO = {
    "Foundation": {
        "emoji": "🌱",
        "motto": "Building the basics, one word at a time"
    },
    "Complexity": {
        "emoji": "🔄", 
        "motto": "Patterns emerge from chaos"
    },
    "Metamorphosis": {
        "emoji": "🦋",
        "motto": "Transformation through code"
    },
    "Consciousness": {
        "emoji": "🧠",
        "motto": "The game becomes aware"
    },
    "Final Ascent": {
        "emoji": "🏔️",
        "motto": "Climbing toward transcendence"
    },
    "Transcendence": {
        "emoji": "🌌",
        "motto": "Beyond limitations"
    }
}

def beautify_level(filepath):
    with open(filepath) as f:
        data = yaml.safe_load(f)
    
    level = data.get('level', 0)
    name = data.get('name', 'Unknown')
    phase = data.get('phase', 'Foundation')
    milestone = data.get('milestone', False)
    
    # Get phase info
    phase_info = PHASE_INFO.get(phase, {"emoji": "📦", "motto": "Unknown phase"})
    
    # Build header
    header_lines = [
        f"# {'=' * 58}",
        f"# Level {level}: {name}",
        f"# Phase: {phase} {phase_info['emoji']}",
    ]
    
    if milestone:
        milestone_emoji = data.get('milestone_emoji', '⭐')
        header_lines.append(f"# {milestone_emoji} MILESTONE LEVEL {milestone_emoji}")
    
    header_lines.extend([
        f"# {phase_info['motto']}",
        f"# {'=' * 58}",
        ""
    ])
    
    # Build YAML content with proper formatting
    yaml_lines = []
    
    # Core fields
    yaml_lines.append(f"level: {level}")
    yaml_lines.append(f'name: "{name}"')
    yaml_lines.append(f'phase: "{phase}"')
    
    if milestone:
        yaml_lines.append(f"milestone: true")
        if 'milestone_emoji' in data:
            yaml_lines.append(f'milestone_emoji: "{data["milestone_emoji"]}"')
    else:
        yaml_lines.append("milestone: false")
    
    if data.get('final_level'):
        yaml_lines.append("final_level: true")
    
    yaml_lines.append("")
    
    # Description
    yaml_lines.append("description: |")
    desc = data.get('description', '')
    for line in desc.strip().split('\n'):
        yaml_lines.append(f"  {line}")
    yaml_lines.append("")
    
    # Rules section
    yaml_lines.append("# Rules for this level")
    yaml_lines.append("rules:")
    rules = data.get('rules', {})
    for key, value in rules.items():
        if isinstance(value, list):
            yaml_lines.append(f"  {key}:")
            for item in value:
                yaml_lines.append(f"    - {repr(item) if isinstance(item, str) and any(c in item for c in '[]{}^$\\') else item}")
        elif isinstance(value, dict):
            yaml_lines.append(f"  {key}:")
            for k, v in value.items():
                yaml_lines.append(f"    {k}: {v}")
        else:
            yaml_lines.append(f"  {key}: {value}")
    yaml_lines.append("")
    
    # Validation section (if exists)
    if 'validation' in data:
        yaml_lines.append("# Validation checks")
        yaml_lines.append("validation:")
        for v in data['validation']:
            yaml_lines.append(f"  - type: {v.get('type', 'unknown')}")
            for k, val in v.items():
                if k != 'type':
                    if isinstance(val, list):
                        yaml_lines.append(f"    {k}:")
                        for item in val:
                            yaml_lines.append(f"      - {item}")
                    else:
                        yaml_lines.append(f"    {k}: {val}")
        yaml_lines.append("")
    
    # Karma section
    yaml_lines.append("# Karma rewards")
    yaml_lines.append("karma:")
    karma = data.get('karma', {})
    yaml_lines.append(f"  base: {karma.get('base', 10)}")
    yaml_lines.append("  bonus_conditions:")
    bonus = karma.get('bonus_conditions', [])
    if bonus:
        for b in bonus:
            yaml_lines.append(f"    - condition: {b.get('condition', 'unknown')}")
            yaml_lines.append(f"      bonus: {b.get('bonus', 0)}")
    else:
        yaml_lines.append("    []")
    yaml_lines.append("")
    
    # Additional fields
    if 'unlock_message' in data:
        yaml_lines.append("# Message shown when level is unlocked")
        yaml_lines.append(f'unlock_message: "{data["unlock_message"]}"')
    
    if data.get('celebration'):
        yaml_lines.append("celebration: true")
    
    if 'visual_effect' in data:
        yaml_lines.append(f'visual_effect: "{data["visual_effect"]}"')
    
    # Write the beautified file
    with open(filepath, 'w') as f:
        f.write('\n'.join(header_lines))
        f.write('\n'.join(yaml_lines))
        f.write('\n')
    
    return True

def main():
    levels_dir = Path(__file__).parent.parent / 'levels'
    
    for filepath in sorted(levels_dir.glob('*.yaml')):
        try:
            beautify_level(filepath)
            print(f"✨ {filepath.name}")
        except Exception as e:
            print(f"❌ {filepath.name}: {e}")
    
    print("\n✅ All levels beautified!")

if __name__ == '__main__':
    main()
