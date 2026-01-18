// Game Engine - Loads and renders game state
(async function() {
  // Load game state
  let state = null;
  
  try {
    const response = await fetch('../state.json');
    state = await response.json();
  } catch (error) {
    console.error('Failed to load game state:', error);
    return;
  }
  
  // Update header stats
  document.getElementById('score-value').textContent = state.score.total;
  document.getElementById('level-value').textContent = state.levels.current;
  document.getElementById('players-value').textContent = state.meta.total_players;
  
  // Update level name
  const levelNames = ['THE VOID', 'HTML AWAKENING', 'CHROMATIC SURGE', 'SENTIENCE', 'PIXEL DIMENSION', '???'];
  document.getElementById('level-name').textContent = levelNames[state.levels.current] || 'UNKNOWN';
  
  // Update progress bar
  if (state.levels.next_unlock) {
    const next = state.levels.next_unlock;
    const prog = next.progress;
    
    document.getElementById('next-level-name').textContent = `NEXT: ${next.level.toUpperCase()}`;
    
    // Calculate overall progress (average of all requirements)
    const scoreProgress = (prog.score / next.requires_score) * 100;
    const prsProgress = (prog.prs / next.requires_prs) * 100;
    const playersProgress = (prog.players / next.requires_players) * 100;
    const overallProgress = (scoreProgress + prsProgress + playersProgress) / 3;
    
    document.getElementById('progress-fill').style.width = overallProgress + '%';
    document.getElementById('progress-percent').textContent = Math.floor(overallProgress) + '%';
    
    document.getElementById('req-score').textContent = `${prog.score}/${next.requires_score}`;
    document.getElementById('req-prs').textContent = `${prog.prs}/${next.requires_prs}`;
    document.getElementById('req-players').textContent = `${prog.players}/${next.requires_players}`;
  }
  
  // Render board elements
  const elementsContainer = document.getElementById('elements');
  const emptyState = document.getElementById('empty-state');
  
  if (state.board.elements.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    
    // Render each element
    for (const element of state.board.elements) {
      const el = document.createElement('div');
      el.className = 'board-element';
      el.id = element.id;
      el.textContent = element.content || '';
      el.style.position = 'absolute';
      el.style.left = element.x + 'px';
      el.style.top = element.y + 'px';
      el.style.color = element.color;
      el.style.fontSize = (element.size || 16) + 'px';
      el.style.textShadow = `2px 2px 0 rgba(0,0,0,0.8), 0 0 10px ${element.color}`;
      el.style.zIndex = 10;
      
      elementsContainer.appendChild(el);
    }
  }
  
  // Enable canvas if level 4+
  if (state.levels.current >= 4) {
    const canvas = document.getElementById('canvas');
    canvas.style.display = 'block';
    
    // Render canvas contributions
    // (Canvas state would be stored and replayed here)
  }
  
  // Expose state globally for player contributions
  window.GAME_STATE = state;
  
  console.log('🎮 Game loaded - Level', state.levels.current);
  console.log('📊 Score:', state.score.total);
  console.log('🎯 Next unlock:', state.levels.next_unlock?.level || 'MAX LEVEL');
})();

/* PLAYER CONTRIBUTIONS JS BELOW */
/* ============================= */

/* CONTRIBUTIONS_JS_PLACEHOLDER */
