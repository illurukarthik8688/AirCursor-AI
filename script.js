let currentPlayer = "X"; 
let firstPlayer = "X"; 
let gameMode = "cpu";
let aiDifficulty = "easy"; // Default AI difficulty
let board = ["", "", "", "", "", "", "", "", ""];
let scores = { X: 0, O: 0, ties: 0 };

const cells = document.querySelectorAll(".cell");
const turnIndicator = document.getElementById("turn-indicator");
const scoreX = document.getElementById("score-x");
const scoreO = document.getElementById("score-o");
const scoreTies = document.getElementById("score-ties");

const selectX = document.getElementById("select-x");
const selectO = document.getElementById("select-o");
const note = document.querySelector(".note");
const difficultySelect = document.getElementById("difficulty");

// Event listeners
selectX.addEventListener("click", () => setPlayer("X"));
selectO.addEventListener("click", () => setPlayer("O"));
difficultySelect.addEventListener("change", () => {
    aiDifficulty = difficultySelect.value;
});

function setPlayer(player) {
    firstPlayer = player;
    currentPlayer = player;

    selectX.classList.toggle("active", player === "X");
    selectO.classList.toggle("active", player === "O");

    note.textContent = `Remember: ${player} goes first`;
}

// Start Game
function startGame(mode) {
    gameMode = mode;
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
    currentPlayer = firstPlayer;
    turnIndicator.textContent = `${currentPlayer}'s Turn`;
    resetBoard();

    // If AI goes first, trigger AI move
    if (gameMode === "cpu" && currentPlayer === "O") {
        setTimeout(aiMove, 500);
    }
}

// Handle cell clicks
cells.forEach(cell => {
    cell.addEventListener("click", () => {
        let index = cell.dataset.index;
        if (!board[index] && gameMode === "player" || (gameMode === "cpu" && currentPlayer === "X")) {
            playerMove(index);
        }
    });
});

// Player Move
function playerMove(index) {
    if (!board[index]) {
        board[index] = currentPlayer;
        cells[index].textContent = currentPlayer;
        if (checkWinner()) return;

        currentPlayer = currentPlayer === "X" ? "O" : "X";
        turnIndicator.textContent = `${currentPlayer}'s Turn`;

        if (gameMode === "cpu" && currentPlayer === "O") {
            setTimeout(aiMove, 500); // Let AI move after a delay
        }
    }
}

// AI Move
function aiMove() {
    if (gameMode !== "cpu" || checkWinner()) return;

    let move;
    if (aiDifficulty === "easy") {
        move = getRandomMove();
    } else if (aiDifficulty === "medium") {
        move = getSmartMove();
    } else {
        move = getBestMove();
    }

    if (move !== -1) {
        board[move] = "O";
        cells[move].textContent = "O";
        if (checkWinner()) return;

        currentPlayer = "X";
        turnIndicator.textContent = `${currentPlayer}'s Turn`;
    }
}

// Easy AI (random moves)
function getRandomMove() {
    let emptyCells = board.map((cell, i) => (cell === "" ? i : null)).filter(i => i !== null);
    return emptyCells.length ? emptyCells[Math.floor(Math.random() * emptyCells.length)] : -1;
}

// Medium AI (win/block strategy)
function getSmartMove() {
    return getWinningMove("O") || getWinningMove("X") || getRandomMove();
}

// Get winning/blocking move
function getWinningMove(player) {
    for (let [a, b, c] of [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], 
        [0, 3, 6], [1, 4, 7], [2, 5, 8], 
        [0, 4, 8], [2, 4, 6]
    ]) {
        if (board[a] === player && board[a] === board[b] && board[c] === "") return c;
        if (board[a] === player && board[a] === board[c] && board[b] === "") return b;
        if (board[b] === player && board[b] === board[c] && board[a] === "") return a;
    }
    return null;
}

// Hard AI (MiniMax Algorithm)
function getBestMove() {
    return minimax(board, "O").index;
}

// MiniMax Algorithm (Unbeatable AI)
function minimax(newBoard, player) {
    let availableSpots = newBoard.map((cell, i) => (cell === "" ? i : null)).filter(i => i !== null);

    if (checkWin(newBoard, "X")) return { score: -10 };
    if (checkWin(newBoard, "O")) return { score: 10 };
    if (availableSpots.length === 0) return { score: 0 };

    let moves = [];

    for (let i of availableSpots) {
        let move = {};
        move.index = i;
        newBoard[i] = player;

        let result;
        if (player === "O") {
            result = minimax(newBoard, "X");
            move.score = result.score;
        } else {
            result = minimax(newBoard, "O");
            move.score = result.score;
        }

        newBoard[i] = "";
        moves.push(move);
    }

    let bestMove;
    if (player === "O") {
        bestMove = moves.reduce((best, move) => (move.score > best.score ? move : best), { score: -Infinity });
    } else {
        bestMove = moves.reduce((best, move) => (move.score < best.score ? move : best), { score: Infinity });
    }

    return bestMove;
}

// Check for win
function checkWin(board, player) {
    return [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], 
        [0, 3, 6], [1, 4, 7], [2, 5, 8], 
        [0, 4, 8], [2, 4, 6]
    ].some(pattern => pattern.every(i => board[i] === player));
}

// Check if game is over
// Check Winner
function checkWinner() {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], 
        [0, 3, 6], [1, 4, 7], [2, 5, 8], 
        [0, 4, 8], [2, 4, 6]
    ];

    for (let pattern of winPatterns) {
        let [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            let winner = board[a]; // Get the winner (X or O)

            // Display winner in popup
            document.getElementById("winner-text").textContent = `${winner} Win's! 🎉`;
            document.getElementById("winner-screen").classList.add("visible"); // Show popup
            document.getElementById("game-screen").classList.add("hidden"); // Hide game board

            scores[winner]++; // Update score
            updateScores();
            return true;
        }
    }

    if (!board.includes("")) {
        document.getElementById("winner-text").textContent = "It's a Tie! 🤝";
        document.getElementById("winner-screen").classList.add("visible");
        scores.ties++;
        updateScores();
        return true;
    }

    return false; // No winner yet
}

// Reset Board
function resetBoard() {
    board.fill("");
    cells.forEach(cell => (cell.textContent = ""));
    currentPlayer = firstPlayer;
    turnIndicator.textContent = `${currentPlayer}'s Turn`;
}// Quit and Restart (Go back to the start screen)
function quitGame() {
    scores = { X: 0, O: 0, ties: 0 }; 
    location.reload();
    document.getElementById("winner-screen").classList.remove("visible");
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("start-screen").classList.remove("hidden");

    firstPlayer = "X";
    currentPlayer = "X";
    selectX.classList.add("active");
    selectO.classList.remove("active");
    note.textContent = `Remember: X goes first`;

    resetBoard();
}
function updateScores() {
    scoreX.textContent = scores.X;
    scoreO.textContent = scores.O;
    scoreTies.textContent = scores.ties;
}
// Next Round (Keep scores, reset board)
function nextRound() {
    resetBoard();
    document.getElementById("winner-screen").classList.remove("visible"); // Hide the popup
    document.getElementById("game-screen").classList.remove("hidden");
    // Clear board, but keep scores and first player
}

// Reset Board (Keep scores)
function resetBoard() {
    board.fill(""); // Clear the board array
    cells.forEach(cell => (cell.textContent = "")); // Clear UI cells

    currentPlayer = firstPlayer; // Ensure first player stays the same
    turnIndicator.textContent = `${currentPlayer}'s Turn`; // Update turn indicator
}
// Get the restart button
const restartBtn = document.getElementById("restart-btn");

// Event listener for restart button
restartBtn.addEventListener("click", restartGame);

function restartGame() {
    console.log("Restarting game...");

    // Reset the game board
    resetBoard();

    // Reset scores
    scores = { X: 0, O: 0, ties: 0 };
    updateScores();

    // Reset UI elements
    document.getElementById("winner-screen").classList.remove("visible");
    document.getElementById("game-screen").classList.remove("hidden");
    document.getElementById("start-screen").classList.add("hidden");

    // Ensure the first player is set correctly
    currentPlayer = firstPlayer;
    turnIndicator.textContent = `${currentPlayer}'s Turn`;

    console.log("Game restarted.");
}

