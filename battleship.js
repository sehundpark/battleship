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
  constructor(size = 10) {
    this.size = size;
    this.board = Array(size)
      .fill()
      .map(() => Array(size).fill(null));
    this.ships = [];
  }

  placeShip(length, row, col, isVertical) {
    const coordinates = this.getShipCoordinates(length, row, col, isVertical);
    if (this.canPlaceShip(coordinates)) {
      const ship = new Ship(coordinates);
      coordinates.forEach(([r, c]) => {
        this.board[r][c] = ship;
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

  receiveAttack(row, col) {
    if (this.board[row][col] instanceof Ship) {
      this.board[row][col].hit(row, col);
      return "hit";
    } else {
      this.board[row][col] = "miss";
      return "miss";
    }
  }

  allShipsSunk() {
    return this.ships.every((ship) => ship.isSunk());
  }
}

class BattleshipGame {
  constructor() {
    this.playerBoard = new GameBoard();
    this.computerBoard = new GameBoard();
    this.setupEventListeners();
    this.lastHit = null;
    this.hitStack = [];
    this.currentDirection = null;
    this.isPlayerTurn = true;
    this.gameOver = false;
    this.shipsAreVertical = false;
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
      ship.className = "ship";
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
    this.updateShipsOrientation();
  }

  rotateAllShips() {
    this.shipsAreVertical = !this.shipsAreVertical;
    this.updateShipsOrientation();
  }

  updateShipsOrientation() {
    const ships = document.querySelectorAll("#ship-container .ship");
    ships.forEach((ship) => {
      const length = parseInt(ship.dataset.length);
      if (this.shipsAreVertical) {
        ship.style.flexDirection = "column";
        ship.style.width = "30px";
        ship.style.height = `${length * 30}px`;
      } else {
        ship.style.flexDirection = "row";
        ship.style.width = `${length * 30}px`;
        ship.style.height = "30px";
      }
    });
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
    const isVertical = this.shipsAreVertical;

    const { offsetX, offsetY } = JSON.parse(
      e.dataTransfer.getData("application/json")
    );

    const cellSize = 30;
    const dropX = e.clientX - offsetX - e.target.getBoundingClientRect().left;
    const dropY = e.clientY - offsetY - e.target.getBoundingClientRect().top;

    const startCol = Math.floor(dropX / cellSize);
    const startRow = Math.floor(dropY / cellSize);

    const row = parseInt(e.target.dataset.row) + (isVertical ? startRow : 0);
    const col = parseInt(e.target.dataset.col) + (isVertical ? 0 : startCol);

    if (this.playerBoard.placeShip(length, row, col, isVertical)) {
      this.placeShipOnBoard(ship, length, row, col, isVertical);
    }
  }

  placeShipOnBoard(shipElement, length, row, col, isVertical) {
    for (let i = 0; i < length; i++) {
      const cellRow = isVertical ? row + i : row;
      const cellCol = isVertical ? col : col + i;
      const cell = document.querySelector(
        `#player-board .cell[data-row="${cellRow}"][data-col="${cellCol}"]`
      );
      cell.classList.add("ship-cell");

      // Add border classes
      if (i === 0) {
        cell.classList.add(isVertical ? "top" : "left");
      }
      if (i === length - 1) {
        cell.classList.add(isVertical ? "bottom" : "right");
      }
      if (!isVertical) {
        cell.classList.add("top", "bottom");
      }
      if (isVertical) {
        cell.classList.add("left", "right");
      }
    }

    shipElement.remove();

    if (document.querySelectorAll("#ship-container .ship").length === 0) {
      this.allShipsPlaced();
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

  async handlePlayerAttack(e) {
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
      const result = this.computerBoard.receiveAttack(row, col);
      e.target.classList.add(result);

      if (result === "hit") {
        const hitShip = this.computerBoard.board[row][col];
        await this.showNotification("Ship hit!", "hit");

        if (hitShip.isSunk()) {
          await this.showNotification("Ship sunk!", "sunk");
        }
      } else {
        await this.showNotification("Miss!", "miss");
      }

      if (this.computerBoard.allShipsSunk()) {
        this.endGame("Player");
      } else {
        document.getElementById("message").textContent = "Computer's turn...";
        setTimeout(() => this.computerPlay(), 1000);
      }
    }
  }

  async computerPlay() {
    let row, col;
    if (this.lastHit) {
      ({ row, col } = this.getSmartAttackCoordinates());
    } else {
      ({ row, col } = this.getRandomAttackCoordinates());
    }

    const result = this.playerBoard.receiveAttack(row, col);
    const cell = document.querySelector(
      `#player-board .cell[data-row="${row}"][data-col="${col}"]`
    );
    cell.classList.add(result);

    if (result === "hit") {
      const hitShip = this.playerBoard.board[row][col];
      await this.showNotification("Your ship was hit!", "hit");

      if (hitShip.isSunk()) {
        await this.showNotification("Your ship was sunk!", "sunk");
        this.resetAttackStrategy();
      } else {
        this.updateAttackStrategy(row, col);
      }
    } else {
      await this.showNotification("Computer missed!", "miss");
      this.adjustAttackStrategy();
    }

    if (this.playerBoard.allShipsSunk()) {
      this.endGame("Computer");
    } else {
      this.isPlayerTurn = true;
      document.getElementById("message").textContent = "Your turn to attack!";
    }
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

  showNotification(message, type) {
    return new Promise((resolve) => {
      const notification = document.createElement("div");
      notification.className = `notification ${type}`;
      notification.textContent = message;
      document.body.appendChild(notification);

      // Trigger reflow to ensure the transition works
      notification.offsetHeight;

      notification.classList.add("show");

      setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => {
          document.body.removeChild(notification);
          resolve();
        }, 500);
      }, 2000);
    });
  }

  resetGame() {
    // For now, we'll just reload the page to reset everything
    location.reload();
  }
}

// Initialize the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new BattleshipGame();
});
