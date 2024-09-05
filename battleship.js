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
    this.setupGame();
  }

  setupGame() {
    this.renderBoards();
    this.createShips();
    this.setupDragAndDrop();
  }

  createShips() {
    const shipLengths = [5, 4, 3, 3, 2];
    const shipContainer = document.getElementById("ship-container");
    shipLengths.forEach((length, index) => {
      const ship = document.createElement("div");
      ship.className = "ship";
      ship.id = `ship-${index}`;
      ship.draggable = true;
      ship.style.width = `${length * 30}px`;
      ship.style.height = "30px";
      ship.dataset.length = length;
      shipContainer.appendChild(ship);
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
  }

  dragOver(e) {
    e.preventDefault();
  }

  drop(e) {
    e.preventDefault();
    const shipId = e.dataTransfer.getData("text");
    const ship = document.getElementById(shipId);
    const length = parseInt(ship.dataset.length);
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    const isVertical = false; // For simplicity, we'll only allow horizontal placement

    if (this.playerBoard.placeShip(new Ship(length), row, col, isVertical)) {
      for (let i = 0; i < length; i++) {
        const cell = document.querySelector(
          `#player-board .cell[data-row="${row}"][data-col="${col + i}"]`
        );
        cell.classList.add("ship-cell");
      }
      ship.remove();
      if (document.querySelectorAll("#ship-container .ship").length === 0) {
        this.startGame();
      }
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

  startGame() {
    document.getElementById("ship-container").style.display = "none";
    document.getElementById("start-game").style.display = "none";
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
        placed = this.computerBoard.placeShip(
          new Ship(length),
          row,
          col,
          isVertical
        );
      }
    });
  }

  play() {
    document
      .getElementById("computer-board")
      .addEventListener("click", this.handlePlayerAttack.bind(this));
  }

  handlePlayerAttack(e) {
    if (
      e.target.classList.contains("cell") &&
      !e.target.classList.contains("hit") &&
      !e.target.classList.contains("miss")
    ) {
      const row = parseInt(e.target.dataset.row);
      const col = parseInt(e.target.dataset.col);
      const result = this.computerBoard.receiveAttack(row, col);
      e.target.classList.add(result);
      if (this.computerBoard.allShipsSunk()) {
        this.endGame("Player");
      } else {
        this.computerPlay();
      }
    }
  }

  computerPlay() {
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

    if (this.playerBoard.allShipsSunk()) {
      this.endGame("Computer");
    }
  }

  endGame(winner) {
    document.getElementById(
      "message"
    ).textContent = `Game Over! ${winner} wins!`;
    document
      .getElementById("computer-board")
      .removeEventListener("click", this.handlePlayerAttack);
  }
}

document.getElementById("start-game").addEventListener("click", () => {
  new BattleshipGame();
});
