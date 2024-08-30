class Gameboard {
  constructor() {
    this.ships = [];
    this.missedShots = [];
  }

  placeShips(ship, x, y, orientation) {
    if (this.isShipPlaceable(ship, x, y, orientation)) {
      this.ships.push({ ship, x, y, orientation });
      return true;
    } else {
      return false;
    }
  }

  isShipPlaceable(ship, x, y, orientation) {
    //check full ship x and y positions are within the gameboard and not already taken
  }

  receiveAttack(x, y) {}
}
