// Element References
const board = document.getElementById('board');
const canvas = document.getElementById('line-canvas');
const ctx = canvas.getContext('2d');
const message = document.getElementById('message');
const restartBtn = document.getElementById('restart-btn');
const undoBtn = document.getElementById('undo-btn');
const themeToggle = document.getElementById('theme-toggle');
const modeSelect = document.getElementById('mode-select');
const difficultySelect = document.getElementById('difficulty-select');
const statsModal = document.getElementById('stats-modal');
const statsToggle = document.getElementById('stats-toggle');
const closeModal = document.getElementById('close-modal');
const clearStatsBtn = document.getElementById('clear-stats-btn');
const resetScoresBtn = document.getElementById('reset-scores-btn');
const victorySound = document.getElementById('victory-sound');
const lossSound = document.getElementById('loss-sound');

// Stats Elements
const playerXScore = document.getElementById('player-x-score');
const playerOScore = document.getElementById('player-o-score');
const totalGames = document.getElementById('total-games');
const xWins = document.getElementById('x-wins');
const oWins = document.getElementById('o-wins');
const draws = document.getElementById('draws');

// Variables
let cells = [];
let moveHistory = [];
let currentPlayer = 'X';
let gameMode = 'player-vs-player';
let difficulty = 'easy';
let stats = JSON.parse(localStorage.getItem('tttStats')) || { total: 0, x: 0, o: 0, draw: 0 };

// Initialize
createBoard();
updateStatsUI();

// Event Listeners
restartBtn.onclick = createBoard;
undoBtn.onclick = undoMove;
themeToggle.onclick = () => document.body.classList.toggle('night');
modeSelect.onchange = () => {
  gameMode = modeSelect.value;
  difficultySelect.style.display = (gameMode === 'player-vs-ai') ? 'inline-block' : 'none';
  createBoard();
};
difficultySelect.onchange = () => {
  difficulty = difficultySelect.value;
  document.body.classList.toggle('hard-mode', difficulty === 'hard');
};
statsToggle.onclick = () => statsModal.classList.add('show');
closeModal.onclick = () => statsModal.classList.remove('show');
clearStatsBtn.onclick = resetStats;
resetScoresBtn.onclick = resetScores;

// Functions

function createBoard() {
  board.innerHTML = '';
  moveHistory = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  message.textContent = '';
  cells = [];

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    cell.onclick = () => handleMove(cell);
    board.appendChild(cell);
    cells.push(cell);
  }

  currentPlayer = 'X';
  board.style.pointerEvents = 'auto';
}

function handleMove(cell) {
  if (cell.textContent) return;

  cell.textContent = currentPlayer;
  moveHistory.push({ index: +cell.dataset.index, player: currentPlayer });

  gsap.fromTo(cell, { scale: 0 }, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.5)" });

  if (checkWinner(currentPlayer)) {
    endGame(currentPlayer);
  } else if (cells.every(c => c.textContent)) {
    endGame('draw');
  } else {
    currentPlayer = (currentPlayer === 'X') ? 'O' : 'X';
    if (gameMode === 'player-vs-ai' && currentPlayer === 'O') {
      setTimeout(aiMove, 500);
    }
  }
}

function undoMove() {
  const lastMove = moveHistory.pop();
  if (lastMove) {
    cells[lastMove.index].textContent = '';
    currentPlayer = lastMove.player;
  }
}

function endGame(winner) {
  board.style.pointerEvents = 'none';
  
  if (winner === 'draw') {
    message.textContent = "It's a Draw!";
    stats.total++;
    stats.draw++;
  } else {
    message.textContent = `${winner} Wins!`;

    if (winner === 'X') {
      playVictory();
      stats.x++;
      playerXScore.textContent = `X Wins: ${stats.x}`;
    } else {
      playLoss();
      stats.o++;
      playerOScore.textContent = `O Wins: ${stats.o}`;
    }
    stats.total++;
  }

  localStorage.setItem('tttStats', JSON.stringify(stats));
  updateStatsUI();
  drawWinningLine(winner);
}

function aiMove() {
  const emptyCells = cells.filter(c => !c.textContent);
  if (emptyCells.length === 0) return;

  let moveCell;
  if (difficulty === 'easy') {
    moveCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  } else if (difficulty === 'medium') {
    moveCell = getMediumAIMove(emptyCells);
  } else {
    moveCell = cells[getBestMove()];
  }

  moveCell.click();
}

function getMediumAIMove(emptyCells) {
  // Block the player if about to win
  for (let cell of emptyCells) {
    cell.textContent = 'O';
    if (checkWinner('O')) {
      cell.textContent = '';
      return cell;
    }
    cell.textContent = '';

    cell.textContent = 'X';
    if (checkWinner('X')) {
      cell.textContent = '';
      return cell;
    }
    cell.textContent = '';
  }
  // Otherwise random
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function getBestMove() {
  let bestScore = -Infinity;
  let moveIndex;
  
  for (let i = 0; i < cells.length; i++) {
    if (!cells[i].textContent) {
      cells[i].textContent = 'O';
      let score = minimax(0, false);
      cells[i].textContent = '';
      if (score > bestScore) {
        bestScore = score;
        moveIndex = i;
      }
    }
  }
  return moveIndex;
}

function minimax(depth, isMaximizing) {
  if (checkWinner('O')) return 10 - depth;
  if (checkWinner('X')) return depth - 10;
  if (cells.every(c => c.textContent)) return 0;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let i = 0; i < cells.length; i++) {
      if (!cells[i].textContent) {
        cells[i].textContent = 'O';
        let eval = minimax(depth + 1, false);
        cells[i].textContent = '';
        maxEval = Math.max(maxEval, eval);
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let i = 0; i < cells.length; i++) {
      if (!cells[i].textContent) {
        cells[i].textContent = 'X';
        let eval = minimax(depth + 1, true);
        cells[i].textContent = '';
        minEval = Math.min(minEval, eval);
      }
    }
    return minEval;
  }
}

function checkWinner(player) {
  const winPatterns = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  return winPatterns.some(pattern => pattern.every(index => cells[index].textContent === player));
}

function drawWinningLine(winner) {
  const winPatterns = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  
  winPatterns.forEach(pattern => {
    if (pattern.every(index => cells[index].textContent === winner)) {
      const start = getCenter(pattern[0]);
      const end = getCenter(pattern[2]);
      animateLine(start, end);
    }
  });
}

function getCenter(index) {
  const size = 110;
  return {
    x: (index % 3) * size + size/2,
    y: Math.floor(index / 3) * size + size/2
  };
}

function animateLine(start, end) {
  const line = { x: start.x, y: start.y };
  gsap.to(line, {
    x: end.x, y: end.y,
    duration: 1,
    onUpdate: () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(line.x, line.y);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 8;
      ctx.stroke();
    }
  });
}

function playVictory() {
  victorySound.pause();
  victorySound.currentTime = 0;
  victorySound.play();
}

function playLoss() {
  lossSound.pause();
  lossSound.currentTime = 0;
  lossSound.play();
}

function updateStatsUI() {
  totalGames.textContent = `Total Games: ${stats.total}`;
  xWins.textContent = `X Wins: ${stats.x}`;
  oWins.textContent = `O Wins: ${stats.o}`;
  draws.textContent = `Draws: ${stats.draw}`;
}

function resetStats() {
  if (confirm("Are you sure you want to reset all stats?")) {
    stats = { total: 0, x: 0, o: 0, draw: 0 };
    localStorage.setItem('tttStats', JSON.stringify(stats));
    updateStatsUI();
  }
}

function resetScores() {
  playerXScore.textContent = 'X Wins: 0';
  playerOScore.textContent = 'O Wins: 0';
}
document.getElementById('glowColorPicker').addEventListener('input', (event) => {
  let selectedColor = event.target.value;
  updateGlowEffects(selectedColor);
  saveUserColorChoice(selectedColor);
});

function updateGlowEffects(color) {
  document.documentElement.style.setProperty('--glow-color', color);
}

const glowColorPicker = document.getElementById('glowColorPicker');

glowColorPicker.addEventListener('input', () => {
  const color = glowColorPicker.value;
  
  // Update cell glow
  document.querySelectorAll('.cell').forEach(cell => {
    cell.style.boxShadow = `0 0 10px ${color}`;
  });

  // Update text shadows
  document.querySelectorAll('h1, h2, p, label').forEach(el => {
    el.style.textShadow = `0 0 10px ${color}, 0 0 20px ${color}`;
  });

  // Update other elements if needed
  document.querySelectorAll('.controls button, .controls select, .buttons button').forEach(button => {
    button.style.background = color;
  });

  // Canvas drop shadow for winning line (optional if you want)
  if (document.body.classList.contains('hard-mode')) {
    document.querySelector('canvas').style.filter = `drop-shadow(0 0 10px ${color})`;
  }
});
