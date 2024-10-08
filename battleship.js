class Ship {
  constructor(coordinates) {
    this.coordinates = coordinates;
    this.hits = new Set();
  }

  hit(row, col) {
    this.hits.add(`${row},${col}`);
  }

  isSunk() {
    return this.hits.size === this.coordinates.length;
  }
}

class GameBoard {
  constructor(size = 10, isPlayerBoard = true) {
    this.size = size;
    this.board = Array(size)
      .fill()
      .map(() => Array(size).fill(null));
    this.ships = [];
    this.sunkShips = new Set();
    this.isPlayerBoard = isPlayerBoard;
  }

  placeShip(length, row, col, isVertical) {
    const coordinates = this.getShipCoordinates(length, row, col, isVertical);
    if (this.canPlaceShip(coordinates)) {
      const ship = new Ship(coordinates);
      coordinates.forEach(([r, c]) => {
        this.board[r][c] = ship;
        // Only add visual indicator if it's the player's board
        if (this.isPlayerBoard) {
          const cell = document.querySelector(
            `#player-board .cell[data-row="${r}"][data-col="${c}"]`
          );
          if (cell) {
            cell.classList.add("ship");
          }
        }
      });
      this.ships.push(ship);
      return true;
    }
    return false;
  }

  getShipCoordinates(length, row, col, isVertical) {
    const coordinates = [];
    for (let i = 0; i < length; i++) {
      const r = isVertical ? row + i : row;
      const c = isVertical ? col : col + i;
      coordinates.push([r, c]);
    }
    return coordinates;
  }

  canPlaceShip(coordinates) {
    return coordinates.every(
      ([row, col]) =>
        row >= 0 &&
        row < this.size &&
        col >= 0 &&
        col < this.size &&
        this.board[row][col] === null
    );
  }

  markShipAsSunk(ship) {
    ship.coordinates.forEach(([row, col]) => {
      // Only mark cells as sunk on the board where the ship actually is
      const cell = document.querySelector(
        `#${
          this.isPlayerBoard ? "player" : "computer"
        }-board .cell[data-row="${row}"][data-col="${col}"]`
      );
      if (cell) {
        cell.classList.add("sunk");
      }
    });
  }

  receiveAttack(row, col) {
    const target = this.board[row][col];
    if (target instanceof Ship) {
      target.hit(row, col);
      if (target.isSunk() && !this.sunkShips.has(target)) {
        this.sunkShips.add(target);
        this.markShipAsSunk(target);
      }
      return { result: "hit", ship: target };
    } else {
      this.board[row][col] = "miss";
      return { result: "miss", ship: null };
    }
  }

  allShipsSunk() {
    return this.ships.every((ship) => ship.isSunk());
  }
}

class BattleshipGame {
  constructor() {
    this.playerBoard = new GameBoard(10, true);
    this.computerBoard = new GameBoard(10, false);
    this.setupEventListeners();
    this.lastHit = null;
    this.firstHit = null;
    this.attackDirection = null;
    this.triedDirections = new Set();
    this.currentAttackLength = 1;
    this.hitQueue = [];
    this.currentTarget = null;
    this.isPlayerTurn = true;
    this.gameOver = false;
    this.shipsAreVertical = false;
    this.gameLog = document.getElementById("game-log");
    this.draggedShipLength = 0;
    this.draggedShipIsVertical = false;
  }

  setupEventListeners() {
    document
      .getElementById("start-game")
      .addEventListener("click", () => this.startSetup());
    document
      .getElementById("ready-to-play")
      .addEventListener("click", () => this.startGame());
    document
      .getElementById("rotate-ships")
      .addEventListener("click", () => this.rotateShips());
    document
      .getElementById("reset-board")
      .addEventListener("click", () => this.resetBoard());
  }

  startSetup() {
    document.getElementById("start-game").style.display = "none";
    document.getElementById("game-content").style.display = "flex";
    document.getElementById("reset-board").style.display = "inline-block";
    this.renderBoards();
    this.createShips();
    this.setupDragAndDrop();
  }

  createShips() {
    const shipLengths = [5, 4, 3, 3, 2];
    const shipContainer = document.getElementById("ship-container");
    shipContainer.innerHTML = "";
    shipLengths.forEach((length, index) => {
      const shipWrapper = document.createElement("div");
      shipWrapper.className = "ship-wrapper";

      const ship = document.createElement("div");
      ship.className = "ship horizontal"; // Start with horizontal orientation
      ship.id = `ship-${index}`;
      ship.draggable = true;
      ship.dataset.length = length;

      for (let i = 0; i < length; i++) {
        const cell = document.createElement("div");
        cell.className = "ship-cell";
        ship.appendChild(cell);
      }

      shipWrapper.appendChild(ship);
      shipContainer.appendChild(shipWrapper);
    });

    // Add event listener for ship rotation
    shipContainer.addEventListener("click", (e) => {
      const ship = e.target.closest(".ship");
      if (ship) {
        ship.classList.toggle("vertical");
      }
    });
  }

  updateShipsOrientation() {
    const ships = document.querySelectorAll("#ship-container .ship");
    ships.forEach((ship) => {
      if (this.shipsAreVertical) {
        ship.classList.remove("horizontal");
        ship.classList.add("vertical");
      } else {
        ship.classList.remove("vertical");
        ship.classList.add("horizontal");
      }
    });
  }

  rotateShips() {
    this.shipsAreVertical = !this.shipsAreVertical;
    this.updateShipsOrientation();
  }

  placeShipOnBoard(shipElement, length, row, col, isVertical) {
    for (let i = 0; i < length; i++) {
      const cellRow = isVertical ? row + i : row;
      const cellCol = isVertical ? col : col + i;
      const cell = document.querySelector(
        `#player-board .cell[data-row="${cellRow}"][data-col="${cellCol}"]`
      );
      cell.classList.add("ship");
    }

    shipElement.remove();

    if (document.querySelectorAll("#ship-container .ship").length === 0) {
      this.allShipsPlaced();
    }
  }

  setupDragAndDrop() {
    const ships = document.querySelectorAll(".ship");
    const cells = document.querySelectorAll("#player-board .cell");

    ships.forEach((ship) => {
      ship.addEventListener("dragstart", this.dragStart.bind(this));
    });

    cells.forEach((cell) => {
      cell.addEventListener("dragover", this.dragOver.bind(this));
      cell.addEventListener("dragleave", this.dragLeave.bind(this));
      cell.addEventListener("drop", this.drop.bind(this));
    });
  }

  dragStart(e) {
    e.dataTransfer.setData("text/plain", e.target.id);
    const rect = e.target.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ offsetX, offsetY })
    );
    this.draggedShipLength = parseInt(e.target.dataset.length);
    this.draggedShipIsVertical = e.target.classList.contains("vertical");
  }

  dragOver(e) {
    e.preventDefault();
    this.highlightCells(e.target, e);
  }

  dragLeave(e) {
    this.clearHighlight();
  }

  drop(e) {
    e.preventDefault();
    this.clearHighlight();
    const shipId = e.dataTransfer.getData("text");
    const ship = document.getElementById(shipId);
    const length = parseInt(ship.dataset.length);
    const isVertical = ship.classList.contains("vertical");

    const cellRect = e.target.getBoundingClientRect();
    const cellSize = cellRect.width; // Assuming square cells
    const dropX = e.clientX - cellRect.left;
    const dropY = e.clientY - cellRect.top;

    const startCol = Math.floor(dropX / cellSize);
    const startRow = Math.floor(dropY / cellSize);

    const row = parseInt(e.target.dataset.row) + (isVertical ? startRow : 0);
    const col = parseInt(e.target.dataset.col) + (isVertical ? 0 : startCol);

    if (this.playerBoard.placeShip(length, row, col, isVertical)) {
      this.placeShipOnBoard(ship, length, row, col, isVertical);
    }
  }

  highlightCells(cell, event) {
    this.clearHighlight();
    const cellRect = cell.getBoundingClientRect();
    const cellSize = cellRect.width; // Assuming square cells
    const dropX = event.clientX - cellRect.left;
    const dropY = event.clientY - cellRect.top;

    const startCol = Math.floor(dropX / cellSize);
    const startRow = Math.floor(dropY / cellSize);

    const row =
      parseInt(cell.dataset.row) + (this.draggedShipIsVertical ? startRow : 0);
    const col =
      parseInt(cell.dataset.col) + (this.draggedShipIsVertical ? 0 : startCol);

    const coordinates = this.playerBoard.getShipCoordinates(
      this.draggedShipLength,
      row,
      col,
      this.draggedShipIsVertical
    );

    const isValid = this.playerBoard.canPlaceShip(coordinates);

    coordinates.forEach(([r, c]) => {
      const highlightCell = document.querySelector(
        `#player-board .cell[data-row="${r}"][data-col="${c}"]`
      );
      if (highlightCell) {
        highlightCell.classList.add(
          isValid ? "valid-placement" : "invalid-placement"
        );
      }
    });
  }

  clearHighlight() {
    const cells = document.querySelectorAll("#player-board .cell");
    cells.forEach((cell) => {
      cell.classList.remove("valid-placement", "invalid-placement");
    });
  }

  renderBoards() {
    this.renderBoard("player-board", this.playerBoard, true);
    this.renderBoard("computer-board", this.computerBoard, false);
  }

  renderBoard(boardId, board, isPlayer) {
    const boardElement = document.getElementById(boardId);
    boardElement.innerHTML = "";
    for (let i = 0; i < board.size; i++) {
      for (let j = 0; j < board.size; j++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = i;
        cell.dataset.col = j;
        boardElement.appendChild(cell);
      }
    }
  }

  resetBoard() {
    // Clear the player's board
    this.playerBoard = new GameBoard(10, true);
    this.renderBoards();

    // Remove all ships from the board
    const playerBoardElement = document.getElementById("player-board");
    playerBoardElement.querySelectorAll(".cell").forEach((cell) => {
      cell.classList.remove("ship");
    });

    // Recreate the ships in the ship container
    this.createShips();
    this.setupDragAndDrop();

    // Hide the "Ready to play" button
    document.getElementById("ready-to-play").style.display = "none";

    // Show the ship setup container
    document.getElementById("ship-setup").style.display = "block";

    // Clear any messages
    document.getElementById("message").textContent = "";
  }

  allShipsPlaced() {
    const shipSetup = document.getElementById("ship-setup");
    if (shipSetup) {
      shipSetup.style.display = "none";
    }
    document.getElementById("ready-to-play").style.display = "block";
    const message = document.getElementById("message");
    message.textContent =
      "All ships placed! Click 'Ready to play' to start the game, or 'Reset Board' to start over.";
  }

  startGame() {
    document.getElementById("ready-to-play").style.display = "none";
    document.getElementById("reset-board").style.display = "none";
    document.getElementById("message").textContent = "";
    document.getElementById("computer-board-container").style.display = "block";
    document.getElementById("message").textContent =
      "Game started! It's your turn to attack.";
    this.placeComputerShips();
    this.play();
  }

  placeComputerShips() {
    const shipLengths = [5, 4, 3, 3, 2];
    shipLengths.forEach((length) => {
      let placed = false;
      while (!placed) {
        const row = Math.floor(Math.random() * 10);
        const col = Math.floor(Math.random() * 10);
        const isVertical = Math.random() < 0.5;
        placed = this.computerBoard.placeShip(length, row, col, isVertical);
      }
    });
  }

  play() {
    document
      .getElementById("computer-board")
      .addEventListener("click", this.handlePlayerAttack.bind(this));
  }

  handlePlayerAttack(e) {
    if (!this.isPlayerTurn || this.gameOver) {
      return;
    }

    if (
      e.target.classList.contains("cell") &&
      !e.target.classList.contains("hit") &&
      !e.target.classList.contains("miss")
    ) {
      this.isPlayerTurn = false;
      document.getElementById("message").textContent =
        "Processing your move...";

      const row = parseInt(e.target.dataset.row);
      const col = parseInt(e.target.dataset.col);
      const { result, ship } = this.computerBoard.receiveAttack(row, col);
      e.target.classList.add(result);

      if (result === "hit") {
        this.log(`Player hit a ship at (${row}, ${col})!`, "player");

        if (ship && ship.isSunk()) {
          this.log("Player sunk a ship!", "player");
          this.markSunkenShip(ship, false); // false indicates it's the computer's board
        }
      } else {
        this.log(`Player missed at (${row}, ${col}).`, "player");
      }

      if (this.computerBoard.allShipsSunk()) {
        this.endGame("Player");
      } else {
        document.getElementById("message").textContent =
          "Computer is thinking...";
        setTimeout(() => {
          document.getElementById("message").textContent = "Computer's turn...";
          this.computerPlay();
        }, 750);
      }
    }
  }

  markSunkenShip(ship, isPlayerShip) {
    const boardPrefix = isPlayerShip ? "player" : "computer";
    ship.coordinates.forEach(([row, col]) => {
      const cell = document.querySelector(
        `#${boardPrefix}-board .cell[data-row="${row}"][data-col="${col}"]`
      );
      if (cell) {
        cell.classList.add("sunk");
        // For computer's board, we need to explicitly add the 'hit' class
        if (!isPlayerShip) {
          cell.classList.add("hit");
        }
      }
    });
  }

  computerPlay() {
    let row, col;
    if (this.currentTarget || this.hitQueue.length > 0) {
      ({ row, col } = this.getSmartAttackCoordinates());
    } else {
      ({ row, col } = this.getRandomAttackCoordinates());
    }

    // Double-check to ensure we're not hitting an already hit cell
    if (this.isAlreadyHit(row, col)) {
      console.error(
        `Attempted to hit an already hit cell at (${row}, ${col}). Choosing new coordinates.`
      );
      return this.computerPlay(); // Recursively try again
    }

    const { result, ship } = this.playerBoard.receiveAttack(row, col);
    const cell = document.querySelector(
      `#player-board .cell[data-row="${row}"][data-col="${col}"]`
    );

    if (cell) {
      if (result === "hit") {
        cell.classList.add("hit");
        this.log(`Computer hit a ship at (${row}, ${col})!`, "computer");

        if (ship && ship.isSunk()) {
          this.log("Computer sunk a ship!", "computer");
          this.markSunkenShip(ship, true);
          // Instead of resetting, we move to the next target if available
          this.currentTarget = null;
          this.attackDirection = null;
          this.currentAttackLength = 1;
          if (this.hitQueue.length === 0) {
            this.resetAttackStrategy();
          }
        } else {
          this.updateAttackStrategy(row, col);
        }
      } else {
        cell.classList.add("miss");
        this.log(`Computer missed at (${row}, ${col}).`, "computer");
        this.attackDirection = null; // Reset direction on miss
        this.currentAttackLength = 1; // Reset attack length
      }
    } else {
      console.error(`Cell not found for coordinates (${row}, ${col})`);
    }
    if (this.playerBoard.allShipsSunk()) {
      this.endGame("Computer");
    } else {
      this.isPlayerTurn = true;
      document.getElementById("message").textContent = "Your turn to attack!";
    }
  }

  getSmartAttackCoordinates() {
    if (!this.currentTarget && this.hitQueue.length > 0) {
      this.currentTarget = this.hitQueue.shift();
      this.firstHit = this.currentTarget;
      this.attackDirection = null;
      this.triedDirections.clear();
      this.currentAttackLength = 1;
    }

    const directions = [
      { dx: 0, dy: 1 }, // right
      { dx: 1, dy: 0 }, // down
      { dx: 0, dy: -1 }, // left
      { dx: -1, dy: 0 }, // up
    ];

    while (true) {
      if (!this.attackDirection) {
        // If we don't have a direction, choose a new one
        let directionFound = false;
        for (let dir of directions) {
          if (!this.triedDirections.has(JSON.stringify(dir))) {
            this.attackDirection = dir;
            this.triedDirections.add(JSON.stringify(dir));
            this.currentAttackLength = 1;
            directionFound = true;
            break;
          }
        }
        if (!directionFound) {
          // If all directions have been tried for the current target, move to the next target or random
          if (this.hitQueue.length > 0) {
            this.currentTarget = null; // This will trigger selecting a new target from the queue
            return this.getSmartAttackCoordinates();
          } else {
            this.resetAttackStrategy();
            return this.getRandomAttackCoordinates();
          }
        }
      }

      const newRow =
        this.firstHit.row + this.attackDirection.dx * this.currentAttackLength;
      const newCol =
        this.firstHit.col + this.attackDirection.dy * this.currentAttackLength;

      if (
        this.isValidAttack(newRow, newCol) &&
        !this.isAlreadyHit(newRow, newCol)
      ) {
        this.currentAttackLength++;
        return { row: newRow, col: newCol };
      } else {
        // If this direction is exhausted or we hit an already hit cell, reset direction and try again
        this.attackDirection = null;
        this.currentAttackLength = 1;
      }
    }
  }

  isValidAttack(row, col) {
    return (
      row >= 0 &&
      row < this.playerBoard.size &&
      col >= 0 &&
      col < this.playerBoard.size
    );
  }

  isAlreadyHit(row, col) {
    const cell = this.playerBoard.board[row][col];
    return (
      cell === "hit" ||
      cell === "miss" ||
      (cell instanceof Ship && cell.hits.has(`${row},${col}`))
    );
  }

  updateAttackStrategy(row, col) {
    if (!this.currentTarget) {
      this.currentTarget = { row, col };
      this.firstHit = { row, col };
    } else if (
      this.currentTarget.row !== row ||
      this.currentTarget.col !== col
    ) {
      // If this hit is not on the current target, add it to the queue
      this.hitQueue.push({ row, col });
    }
    this.lastHit = { row, col };
  }

  resetAttackStrategy() {
    this.lastHit = null;
    this.firstHit = null;
    this.currentTarget = null;
    this.attackDirection = null;
    this.triedDirections.clear();
    this.currentAttackLength = 1;
    this.hitQueue = [];
  }

  log(message, player) {
    const logEntry = document.createElement("div");
    logEntry.className = `log-entry ${player}`;
    logEntry.textContent = message;
    this.gameLog.appendChild(logEntry);
    this.gameLog.scrollTop = this.gameLog.scrollHeight;
  }

  getRandomAttackCoordinates() {
    let row, col;
    do {
      row = Math.floor(Math.random() * this.playerBoard.size);
      col = Math.floor(Math.random() * this.playerBoard.size);
    } while (this.isAlreadyHit(row, col));
    return { row, col };
  }

  endGame(winner) {
    this.gameOver = true;
    this.isPlayerTurn = false;
    document.getElementById(
      "message"
    ).textContent = `Game Over! ${winner} wins!`;

    // Visually disable the computer's board
    const computerBoard = document.getElementById("computer-board");
    computerBoard.style.pointerEvents = "none";
    computerBoard.style.opacity = "0.7";

    // Add a "Play Again" button
    const playAgainButton = document.createElement("button");
    playAgainButton.textContent = "Play Again";
    playAgainButton.addEventListener("click", () => this.resetGame());
    document.getElementById("game-container").appendChild(playAgainButton);
  }

  resetGame() {
    // For now, we'll just reload the page to reset everything
    location.reload();
  }
}

// Initialize the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
  const game = new BattleshipGame();
});
