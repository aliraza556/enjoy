#!/usr/bin/env python3
"""
Level Quality Validator for enjoy
Analyzes all 100 levels for completeness and quality
"""

import yaml
import os
import sys
from pathlib import Path

def validate_levels():
    levels_dir = Path(__file__).parent.parent / 'levels'
    
    errors = []
    warnings = []
    phases = {}
    levels_data = []
    
    for filepath in sorted(levels_dir.glob('*.yaml')):
        filename = filepath.name
        
        with open(filepath) as f:
            try:
                data = yaml.safe_load(f)
            except Exception as e:
                errors.append(f"{filename}: YAML parse error - {e}")
                continue
        
        if data is None:
            errors.append(f"{filename}: Empty file")
            continue
            
        level = data.get('level')
        name = data.get('name')
        phase = data.get('phase')
        desc = data.get('description', '')
        rules = data.get('rules', {})
        karma = data.get('karma', {})
        
        # Check required fields
        if not level:
            errors.append(f"{filename}: missing 'level' field")
        if not name:
            errors.append(f"{filename}: missing 'name' field")
        if not phase:
            errors.append(f"{filename}: missing 'phase' field")
        if not desc or len(str(desc).strip()) < 10:
            warnings.append(f"{filename}: description too short or missing")
        if not rules:
            warnings.append(f"{filename}: missing 'rules' section")
        if not karma or not karma.get('base'):
            warnings.append(f"{filename}: missing 'karma.base' field")
        
        # Check rules quality
        if rules:
            if not rules.get('min_words'):
                warnings.append(f"{filename}: missing 'rules.min_words'")
            if not rules.get('max_words'):
                warnings.append(f"{filename}: missing 'rules.max_words'")
            if not rules.get('required_patterns') and not rules.get('forbidden_patterns'):
                warnings.append(f"{filename}: no patterns defined")
        
        # Track phases
        if phase:
            phases[phase] = phases.get(phase, 0) + 1
        
        levels_data.append({
            'file': filename,
            'level': level,
            'name': name,
            'phase': phase,
            'karma_base': karma.get('base', 0) if karma else 0,
            'rules': rules
        })
    
    # Check level number sequence
    expected = 1
    for ld in sorted(levels_data, key=lambda x: x['level'] or 0):
        if ld['level'] != expected:
            errors.append(f"{ld['file']}: expected level {expected}, got {ld['level']}")
        expected += 1
    
    # Output results
    print("=" * 60)
    print("ENJOY LEVEL QUALITY REPORT")
    print("=" * 60)
    
    print("\n📊 SUMMARY")
    print(f"  Total levels: {len(levels_data)}")
    print(f"  Errors: {len(errors)}")
    print(f"  Warnings: {len(warnings)}")
    
    if errors:
        print("\n❌ ERRORS (must fix)")
        for e in errors:
            print(f"  • {e}")
    
    if warnings:
        print("\n⚠️  WARNINGS (should review)")
        for w in warnings:
            print(f"  • {w}")
    
    print("\n📦 PHASES DISTRIBUTION")
    for phase, count in sorted(phases.items()):
        print(f"  {phase}: {count} levels")
    
    print("\n💰 KARMA DISTRIBUTION")
    karma_groups = {}
    for ld in levels_data:
        kb = ld['karma_base']
        if kb not in karma_groups:
            karma_groups[kb] = []
        karma_groups[kb].append(ld['level'])
    
    for kb in sorted(karma_groups.keys()):
        levels_list = karma_groups[kb][:5]
        suffix = '...' if len(karma_groups[kb]) > 5 else ''
        print(f"  Base {kb}: levels {levels_list}{suffix} ({len(karma_groups[kb])} total)")
    
    # Check progressive difficulty
    print("\n📈 DIFFICULTY PROGRESSION")
    karma_values = [ld['karma_base'] for ld in sorted(levels_data, key=lambda x: x['level'] or 0)]
    if karma_values == sorted(karma_values):
        print("  ✅ Karma values increase progressively")
    else:
        print("  ⚠️  Karma values NOT strictly increasing")
        # Find anomalies
        for i in range(1, len(karma_values)):
            if karma_values[i] < karma_values[i-1]:
                print(f"     Level {i+1} (karma {karma_values[i]}) < Level {i} (karma {karma_values[i-1]})")
    
    return len(errors) == 0

if __name__ == '__main__':
    success = validate_levels()
    sys.exit(0 if success else 1)
