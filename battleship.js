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
    this.hitStack = [];
    this.currentDirection = null;
    this.isPlayerTurn = true;
    this.gameOver = false;
    this.shipsAreVertical = false;
    this.gameLog = document.getElementById("game-log");
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
      .addEventListener("click", () => this.rotateAllShips());
  }

  startSetup() {
    document.getElementById("start-game").style.display = "none";
    document.getElementById("game-content").style.display = "flex";
    this.renderBoards();
    this.createShips();
    this.setupDragAndDrop();
  }

  createShips() {
    const shipLengths = [5, 4, 3, 3, 2];
    const shipContainer = document.getElementById("ship-container");
    shipContainer.innerHTML = "";
    shipLengths.forEach((length, index) => {
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

      shipContainer.appendChild(ship);
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
  }

  dragOver(e) {
    e.preventDefault();
  }

  drop(e) {
    e.preventDefault();
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

  allShipsPlaced() {
    const shipSetup = document.getElementById("ship-setup");
    if (shipSetup) {
      shipSetup.remove();
    }
    document.getElementById("ready-to-play").style.display = "block";
    const message = document.getElementById("message");
    message.textContent =
      "All ships placed! Click 'Ready to play' to start the game.";
  }

  startGame() {
    document.getElementById("ready-to-play").style.display = "none";
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
        }, 2000);
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
    if (this.lastHit) {
      ({ row, col } = this.getSmartAttackCoordinates());
    } else {
      ({ row, col } = this.getRandomAttackCoordinates());
    }

    const { result, ship } = this.playerBoard.receiveAttack(row, col);
    const cell = document.querySelector(
      `#player-board .cell[data-row="${row}"][data-col="${col}"]`
    );
    cell.classList.add(result);

    if (result === "hit") {
      this.log(`Computer hit a ship at (${row}, ${col})!`, "computer");

      if (ship && ship.isSunk()) {
        this.log("Computer sunk a ship!", "computer");
        this.markSunkenShip(ship, true); // true indicates it's the player's board
        this.resetAttackStrategy();
      } else {
        this.updateAttackStrategy(row, col);
      }
    } else {
      this.log(`Computer missed at (${row}, ${col}).`, "computer");
      if (this.lastHit) {
        this.resetAttackStrategy();
      }
    }

    if (this.playerBoard.allShipsSunk()) {
      this.endGame("Computer");
    } else {
      this.isPlayerTurn = true;
      document.getElementById("message").textContent = "Your turn to attack!";
    }
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
      row = Math.floor(Math.random() * 10);
      col = Math.floor(Math.random() * 10);
    } while (
      this.playerBoard.board[row][col] === "hit" ||
      this.playerBoard.board[row][col] === "miss"
    );
    return { row, col };
  }

  getSmartAttackCoordinates() {
    const { row, col } = this.lastHit;
    const directions = [
      { dx: 0, dy: 1 }, // right
      { dx: 1, dy: 0 }, // down
      { dx: 0, dy: -1 }, // left
      { dx: -1, dy: 0 }, // up
    ];

    if (this.currentDirection === null) {
      // Try all directions
      for (let dir of directions) {
        const newRow = row + dir.dx;
        const newCol = col + dir.dy;
        if (this.isValidAttack(newRow, newCol)) {
          return { row: newRow, col: newCol };
        }
      }
    } else {
      // Continue in the current direction
      const newRow = row + directions[this.currentDirection].dx;
      const newCol = col + directions[this.currentDirection].dy;
      if (this.isValidAttack(newRow, newCol)) {
        return { row: newRow, col: newCol };
      }
    }

    // If we can't continue, backtrack or reset
    if (this.hitStack.length > 0) {
      this.lastHit = this.hitStack.pop();
      this.currentDirection = null;
      return this.getSmartAttackCoordinates();
    } else {
      this.resetAttackStrategy();
      return this.getRandomAttackCoordinates();
    }
  }

  isValidAttack(row, col) {
    return (
      row >= 0 &&
      row < 10 &&
      col >= 0 &&
      col < 10 &&
      this.playerBoard.board[row][col] !== "hit" &&
      this.playerBoard.board[row][col] !== "miss"
    );
  }

  updateAttackStrategy(row, col) {
    if (!this.lastHit) {
      this.lastHit = { row, col };
    } else {
      this.hitStack.push(this.lastHit);
      this.lastHit = { row, col };
      if (this.currentDirection === null) {
        // Determine the direction
        const dx = row - this.hitStack[this.hitStack.length - 1].row;
        const dy = col - this.hitStack[this.hitStack.length - 1].col;
        if (dx === 1) this.currentDirection = 1; // down
        else if (dx === -1) this.currentDirection = 3; // up
        else if (dy === 1) this.currentDirection = 0; // right
        else if (dy === -1) this.currentDirection = 2; // left
      }
    }
  }

  resetAttackStrategy() {
    this.lastHit = null;
    this.hitStack = [];
    this.currentDirection = null;
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
  game.createShips();
  document
    .getElementById("rotate-ships")
    .addEventListener("click", () => game.rotateShips());
});
