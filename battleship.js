class Ship {
  constructor(length) {
    this.length = length;
    this.hits = 0;
  }

  hit() {
    this.hits++;
  }

  isSunk() {
    return this.hits === this.length;
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

  placeShip(ship, row, col, isVertical) {
    if (this.canPlaceShip(ship, row, col, isVertical)) {
      for (let i = 0; i < ship.length; i++) {
        if (isVertical) {
          this.board[row + i][col] = ship;
        } else {
          this.board[row][col + i] = ship;
        }
      }
      this.ships.push(ship);
      return true;
    }
    return false;
  }

  canPlaceShip(ship, row, col, isVertical) {
    for (let i = 0; i < ship.length; i++) {
      if (isVertical) {
        if (row + i >= this.size || this.board[row + i][col] !== null) {
          return false;
        }
      } else {
        if (col + i >= this.size || this.board[row][col + i] !== null) {
          return false;
        }
      }
    }
    return true;
  }

  receiveAttack(row, col) {
    if (this.board[row][col] instanceof Ship) {
      this.board[row][col].hit();
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
    this.lastHitShip = null;
    this.notificationDuration = 2500;
    this.shipsAreVertical = false;
    this.isPlayerTurn = true;
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
    shipContainer.innerHTML = ""; // Clear any existing ships
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

    const { offsetX, offsetY } = JSON.parse(
      e.dataTransfer.getData("application/json")
    );

    const cellSize = 30;
    const dropX = e.clientX - offsetX - e.target.getBoundingClientRect().left;
    const dropY = e.clientY - offsetY - e.target.getBoundingClientRect().top;

    const startCol = Math.floor(dropX / cellSize);
    const startRow = Math.floor(dropY / cellSize);

    const row =
      parseInt(e.target.dataset.row) + (this.shipsAreVertical ? startRow : 0);
    const col =
      parseInt(e.target.dataset.col) + (this.shipsAreVertical ? 0 : startCol);

    if (this.canPlaceShip(length, row, col, this.shipsAreVertical)) {
      this.placeShip(ship, length, row, col, this.shipsAreVertical);
    }
  }

  canPlaceShip(length, row, col, isVertical) {
    for (let i = 0; i < length; i++) {
      const checkRow = isVertical ? row + i : row;
      const checkCol = isVertical ? col : col + i;

      if (
        checkRow >= this.playerBoard.size ||
        checkCol >= this.playerBoard.size
      ) {
        return false;
      }

      const cell = document.querySelector(
        `#player-board .cell[data-row="${checkRow}"][data-col="${checkCol}"]`
      );

      if (!cell || cell.classList.contains("ship-cell")) {
        return false;
      }
    }
    return true;
  }

  placeShip(shipElement, length, row, col, isVertical) {
    for (let i = 0; i < length; i++) {
      const cellRow = isVertical ? row + i : row;
      const cellCol = isVertical ? col : col + i;
      const cell = document.querySelector(
        `#player-board .cell[data-row="${cellRow}"][data-col="${cellCol}"]`
      );
      cell.classList.add("ship-cell");
    }

    this.playerBoard.placeShip(new Ship(length), row, col, isVertical);
    shipElement.remove();

    if (document.querySelectorAll("#ship-container .ship").length === 0) {
      this.allShipsPlaced();
    }
  }

  allShipsPlaced() {
    // Remove the entire ship setup container
    const shipSetup = document.getElementById("ship-setup");
    if (shipSetup) {
      shipSetup.remove();
    }

    // Show the "Ready to play" button
    document.getElementById("ready-to-play").style.display = "block";

    const message = document.getElementById("message");
    message.textContent =
      "All ships placed! Click 'Ready to play' to start the game.";
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

  placeComputerShips() {
    const shipLengths = [5, 4, 3, 3, 2];
    shipLengths.forEach((length) => {
      let placed = false;
      while (!placed) {
        const row = Math.floor(Math.random() * 10);
        const col = Math.floor(Math.random() * 10);
        const isVertical = Math.random() < 0.5;
        placed = this.computerBoard.placeShip(
          new Ship(length),
          row,
          col,
          isVertical
        );
      }
    });
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

  play() {
    document
      .getElementById("computer-board")
      .addEventListener("click", this.handlePlayerAttack.bind(this));
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
        }, 250);
      }, 850);
    });
  }

  async handlePlayerAttack(e) {
    if (!this.isPlayerTurn) {
      return; // Ignore clicks when it's not the player's turn
    }

    if (
      e.target.classList.contains("cell") &&
      !e.target.classList.contains("hit") &&
      !e.target.classList.contains("miss")
    ) {
      this.isPlayerTurn = false; // Disable further player moves
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
        setTimeout(() => this.computerPlay(), 1000); // Add a delay before computer's move
      }
    }
  }

  async computerPlay() {
    let row, col;
    do {
      row = Math.floor(Math.random() * 10);
      col = Math.floor(Math.random() * 10);
    } while (
      this.playerBoard.board[row][col] === "hit" ||
      this.playerBoard.board[row][col] === "miss"
    );

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
      }
    } else {
      await this.showNotification("Computer missed!", "miss");
    }

    if (this.playerBoard.allShipsSunk()) {
      this.endGame("Computer");
    } else {
      this.isPlayerTurn = true; // Re-enable player moves
      document.getElementById("message").textContent = "Your turn to attack!";
    }
  }

  endGame(winner) {
    this.isPlayerTurn = false; // Disable further moves
    document.getElementById(
      "message"
    ).textContent = `Game Over! ${winner} wins!`;
    document
      .getElementById("computer-board")
      .removeEventListener("click", this.handlePlayerAttack);
  }
}

// Initialize the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new BattleshipGame();
});
