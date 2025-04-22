document.addEventListener("DOMContentLoaded", function () {
  // Game elements
  const board = document.getElementById("sudoku-board");
  const newGameBtn = document.getElementById("new-game");
  const checkSolutionBtn = document.getElementById("check-solution");
  const solveBtn = document.getElementById("solve");
  const difficultySelect = document.getElementById("difficulty");
  const timerDisplay = document.getElementById("timer");
  const bestTimes = {
    easy: document.getElementById("easy-time"),
    medium: document.getElementById("medium-time"),
    hard: document.getElementById("hard-time"),
    insane: document.getElementById("insane-time"),
  };

  const timesButton = document.getElementById("timesButton");

  const label = document.getElementById("vertical-label");
  const text = label.textContent.trim();
  label.innerHTML = text
    .split("")
    .map((char) => {
      return char === " "
        ? '<span class="spacer">&nbsp;</span>'
        : `<span>${char}</span>`;
    })
    .join("");

  // Set initial state (collapsed)
  let isExpanded = false;

  timesButton.addEventListener("click", function () {
    isExpanded = !isExpanded;

    if (isExpanded) {
      timesButton.classList.add("expanded");
    } else {
      timesButton.classList.remove("expanded");
    }
  });

  // Game state
  let sudokuBoard = [];
  let solutionBoard = [];
  let seconds = 0;
  let isPlaying = false;
  let timerInterval = null;

  // Initialize the game
  initializeBoard();
  loadBestTimes();
  const inputs = document.querySelectorAll("#sudoku-board input");
  inputs.forEach((input) => {
    input.disabled = true;
  });

  // Event listeners
  newGameBtn.addEventListener("click", startNewGame);
  checkSolutionBtn.addEventListener("click", checkSolution);
  solveBtn.addEventListener("click", showSolution);

  // Initialize the Sudoku board UI
  function initializeBoard() {
    board.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const row = document.createElement("tr");
      for (let j = 0; j < 9; j++) {
        const cell = document.createElement("td");
        const input = document.createElement("input");
        input.type = "text";
        input.maxLength = 1;
        input.dataset.row = i;
        input.dataset.col = j;

        input.addEventListener("input", function (e) {
          const value = e.target.value;
          if (!/^[1-9]$/.test(value)) {
            e.target.value = "";
          } else {
            const row = parseInt(e.target.dataset.row);
            const col = parseInt(e.target.dataset.col);
            sudokuBoard[row][col] = parseInt(value);
            e.target.classList.add("user-filled");
            e.target.classList.remove("incorrect");
          }
        });

        cell.appendChild(input);
        row.appendChild(cell);
      }
      board.appendChild(row);
    }
  }

  function startNewGame() {
    try {
      stopTimer();
      const difficulty = difficultySelect.value;

      console.log(`Generating ${difficulty} puzzle...`);
      const { board: newBoard, solution } = generateSudoku(difficulty);

      sudokuBoard = newBoard;
      solutionBoard = solution;

      inputs.forEach((input) => {
        input.disabled = false;
      });

      updateBoardUI();
      resetTimer();
      startTimer();
      isPlaying = true;

      console.log(`Successfully started ${difficulty} game`);
    } catch (error) {
      console.error("Failed to start new game:", error);
      alert(
        "Sorry, we couldn't generate a puzzle. Trying an easy one instead."
      );
      difficultySelect.value = "easy";
      startNewGame();
    }
  }

  // ======================
  // PUZZLE GENERATION
  // ======================

  function generateSudoku(targetDifficulty) {
    // First try fast generation
    let puzzle = generatePuzzleFast(targetDifficulty);
    let actualDifficulty = verifyDifficulty(puzzle.board, targetDifficulty);

    // If way off, adjust
    if (difficultyDistance(targetDifficulty, actualDifficulty) > 1) {
      console.log(`Adjusting from ${targetDifficulty} to ${actualDifficulty}`);
      puzzle = generatePuzzleFast(actualDifficulty);
    }

    return puzzle;
  }

  function generatePuzzleFast(targetDifficulty) {
    const targetCells = {
      easy: { min: 36, max: 41 },
      medium: { min: 28, max: 33 },
      hard: { min: 22, max: 26 },
      insane: { min: 17, max: 21 },
    }[targetDifficulty];

    const cellsToKeep =
      Math.floor(Math.random() * (targetCells.max - targetCells.min + 1)) +
      targetCells.min;

    const solution = generateSolvedBoard();
    const board = removeNumbersFast(
      JSON.parse(JSON.stringify(solution)),
      81 - cellsToKeep
    );

    return { board, solution };
  }

  function removeNumbersFast(board, cellsToRemove) {
    const cells = [];
    // Create list of all cells in random order
    for (let i = 0; i < 81; i++) {
      cells.push([Math.floor(i / 9), i % 9]);
    }
    shuffleArray(cells);

    let removed = 0;
    for (const [row, col] of cells) {
      if (removed >= cellsToRemove) break;

      if (board[row][col] !== 0) {
        const backup = board[row][col];
        board[row][col] = 0;

        // Fast uniqueness check
        if (!hasMultipleSolutionsQuickCheck(board)) {
          removed++;
        } else {
          board[row][col] = backup;
        }
      }
    }
    return board;
  }

  // ======================
  // DIFFICULTY VERIFICATION
  // ======================

  function verifyDifficulty(board, targetDifficulty) {
    // For easy puzzles, skip expensive checks
    if (targetDifficulty === "easy") return "easy";

    const filledCells = countFilledCells(board);
    let estimatedDiff = estimateDifficultyFromCount(filledCells);

    // Only do deeper checks if needed
    if (estimatedDiff === "insane" || targetDifficulty === "insane") {
      if (hasObviousXWing(board)) return "insane";
    }

    if (estimatedDiff === "hard" || targetDifficulty === "hard") {
      if (checkNakedPairs(board)) return "hard";
    }

    return Math.max(
      difficultyValue(estimatedDiff),
      difficultyValue(targetDifficulty)
    ) === difficultyValue("insane")
      ? "insane"
      : estimatedDiff;
  }

  function estimateDifficultyFromCount(filledCells) {
    if (filledCells <= 22) return "insane";
    if (filledCells <= 28) return "hard";
    if (filledCells <= 35) return "medium";
    return "easy";
  }

  function difficultyDistance(diff1, diff2) {
    const values = { easy: 0, medium: 1, hard: 2, insane: 3 };
    return Math.abs(values[diff1] - values[diff2]);
  }

  // ======================
  // TECHNIQUE DETECTION (QUICK VERSIONS)
  // ======================

  function hasObviousXWing(board) {
    // Only check first 4 rows for speed
    for (let num = 1; num <= 9; num++) {
      for (let row1 = 0; row1 < 4; row1++) {
        const colsInRow1 = getCandidateCols(board, row1, num);
        if (colsInRow1.length !== 2) continue;

        for (let row2 = row1 + 1; row2 < 4; row2++) {
          const colsInRow2 = getCandidateCols(board, row2, num);
          if (colsInRow1.join() === colsInRow2.join()) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function checkNakedPairs(board) {
    // Only check first 3 rows for speed
    for (let row = 0; row < 3; row++) {
      const pairs = {};
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          const candidates = getCandidates(board, row, col);
          if (candidates.length === 2) {
            const key = candidates.join(",");
            if (pairs[key]) {
              return true;
            }
            pairs[key] = true;
          }
        }
      }
    }
    return false;
  }

  // ======================
  // SOLVING HELPERS
  // ======================

  function generateSolvedBoard() {
    const board = Array(9)
      .fill()
      .map(() => Array(9).fill(0));
    fillDiagonalBoxes(board);
    solveSudoku(board);
    return board;
  }

  function fillDiagonalBoxes(board) {
    for (let box = 0; box < 9; box += 3) {
      fillBox(board, box, box);
    }
  }

  function fillBox(board, row, col) {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    shuffleArray(nums);

    let index = 0;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        board[row + i][col + j] = nums[index++];
      }
    }
  }

  function solveSudoku(board) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(board, row, col, num)) {
              board[row][col] = num;
              if (solveSudoku(board)) {
                return true;
              }
              board[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  function hasMultipleSolutionsQuickCheck(board) {
    // Fast check by trying to find two different solutions
    const boardCopy = JSON.parse(JSON.stringify(board));
    const solutions = new Set();

    // Limit to 2 solutions max for performance
    countSolutions(boardCopy, solutions, 2);
    return solutions.size > 1;
  }

  function countSolutions(board, solutions, limit) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(board, row, col, num)) {
              board[row][col] = num;
              countSolutions(board, solutions, limit);
              board[row][col] = 0;

              if (solutions.size >= limit) return;
            }
          }
          return;
        }
      }
    }
    solutions.add(JSON.stringify(board));
  }

  // ======================
  // UTILITY FUNCTIONS
  // ======================

  function getCandidates(board, row, col) {
    const used = new Set();

    // Check row
    for (let c = 0; c < 9; c++) {
      if (board[row][c] !== 0) used.add(board[row][c]);
    }

    // Check column
    for (let r = 0; r < 9; r++) {
      if (board[r][col] !== 0) used.add(board[r][col]);
    }

    // Check box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (board[r][c] !== 0) used.add(board[r][c]);
      }
    }

    // Return candidates
    const candidates = [];
    for (let num = 1; num <= 9; num++) {
      if (!used.has(num)) candidates.push(num);
    }
    return candidates;
  }

  function getCandidateCols(board, row, num) {
    const cols = [];
    for (let col = 0; col < 9; col++) {
      if (
        board[row][col] === 0 &&
        getCandidates(board, row, col).includes(num)
      ) {
        cols.push(col);
      }
    }
    return cols;
  }

  function countFilledCells(board) {
    let count = 0;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] !== 0) count++;
      }
    }
    return count;
  }

  function isValid(board, row, col, num) {
    // Check row
    for (let c = 0; c < 9; c++) {
      if (board[row][c] === num) return false;
    }

    // Check column
    for (let r = 0; r < 9; r++) {
      if (board[r][col] === num) return false;
    }

    // Check box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (board[r][c] === num) return false;
      }
    }

    return true;
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function difficultyValue(diff) {
    const values = { easy: 0, medium: 1, hard: 2, insane: 3 };
    return values[diff] || 0;
  }

  // ======================
  // UI FUNCTIONS
  // ======================

  function updateBoardUI() {
    const inputs = document.querySelectorAll("#sudoku-board input");
    inputs.forEach((input) => {
      const row = parseInt(input.dataset.row);
      const col = parseInt(input.dataset.col);
      const value = sudokuBoard[row][col];

      input.value = value === 0 ? "" : value;
      input.readOnly = value !== 0;
      input.className = value !== 0 ? "fixed" : "";
      input.classList.remove("incorrect", "user-filled");
    });
  }

  function checkSolution() {
    if (!isPlaying) return;

    // First check if all cells are filled
    const inputs = document.querySelectorAll("#sudoku-board input");
    const isComplete = Array.from(inputs).every((input) => input.value !== "");

    if (!isComplete) {
      alert("You haven't finished the puzzle yet!");
      return;
    }

    // Now check for correctness
    let isCorrect = true;
    inputs.forEach((input) => {
      const row = parseInt(input.dataset.row);
      const col = parseInt(input.dataset.col);
      const value = parseInt(input.value) || 0;

      if (value !== solutionBoard[row][col]) {
        isCorrect = false;
        input.classList.add("incorrect");
      }
    });

    if (isCorrect) {
      alert("Congratulations! You solved the Sudoku correctly!");
      stopTimer();
      updateBestTime();
      isPlaying = false;
    } else {
      alert("There are some incorrect numbers. Keep trying!");
    }
  }

  function showSolution() {
    if (!isPlaying) return;

    if (
      confirm(
        "Are you sure you want to see the solution? This will end the current game."
      )
    ) {
      sudokuBoard = JSON.parse(JSON.stringify(solutionBoard));
      updateBoardUI();
      stopTimer();
      isPlaying = false;
    }
  }

  // ======================
  // TIMER FUNCTIONS
  // ======================

  function startTimer() {
    stopTimer();
    seconds = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      seconds++;
      updateTimerDisplay();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function resetTimer() {
    stopTimer();
    seconds = 0;
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    timerDisplay.textContent = `${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  // ======================
  // BEST TIMES FUNCTIONS
  // ======================

  function loadBestTimes() {
    for (const level in bestTimes) {
      const time = localStorage.getItem(`sudoku-best-time-${level}`);
      if (time) {
        bestTimes[level].textContent = formatTime(parseInt(time));
      }
    }
  }

  function updateBestTime() {
    const difficulty = difficultySelect.value;
    const currentBest = localStorage.getItem(`sudoku-best-time-${difficulty}`);

    if (!currentBest || seconds < parseInt(currentBest)) {
      localStorage.setItem(
        `sudoku-best-time-${difficulty}`,
        seconds.toString()
      );
      bestTimes[difficulty].textContent = formatTime(seconds);
    }
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  // Start with an easy game
});
