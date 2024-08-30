class Ship {
  //create ships objects w/ length, # of hits, and sunk T/F
  constructor(ships) {
    this.shipLength = shipLength;
    this.hitsCounter = 0;
    this.shipSunk = shipSunk;
  }
  hit() {
    //increase number of hits on ship
    this.hitsCounter++;
  }
  isSunk() {
    //calculate whether ship is sunk based on length and # of hits
    if (this.hitsCounter >= this.shipLength) {
      shipSunk = true;
    }
  }
}
