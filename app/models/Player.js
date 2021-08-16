require("dotenv").config();

const totalHeight = process.env.TOTAL_HEIGHT;
const totalWidth = process.env.TOTAL_WIDTH;

class Player {
    constructor(localID) {
        this.id = localID;
        this.height = 500;
        this.width = 500;
        this.ratio = 1; // ratio of width = ratio*height
        this.scope = 100000000; // gives the area that can be seen;
        this.keyPressMove = 100; // move when key w-a-s-d pressed
        this.exists = true; // defines whether player exists
        this.life = 100; // defines initial life
        this.x;
        this.y;
        this.weapon = 0; // originally no weapon is equipped
        this.playerName = "BuzzDroner"; // default name
        this.immortal = false;
        this.removed = false; // indicated whether element has been removed of player view
        this.destroyedCount = 0; // nb of killed players
        this.static = false;
    }
    // string png to be used locally
    code() {
        return 'items/drone.svg';
    }
    receiveKeyPress(key) {
        console.log('key press received');
        var xProposed, yProposed;
        switch (key) {
            case 87: // up
                xProposed = this.x;
                yProposed = this.y;
                xProposed -= this.keyPressMove;
                if (0 <= xProposed-this.height/2 && 0 <= yProposed-this.width/2 && xProposed+this.height/2 < totalHeight && yProposed+this.width/2 < totalWidth) {
                    this.x = xProposed;
                    this.y = yProposed;
                }
                break;
            case 68: // right
                xProposed = this.x;
                yProposed = this.y;
                yProposed += this.keyPressMove;
                if (0 <= xProposed-this.height/2 && 0 <= yProposed-this.width/2 && xProposed+this.height/2 < totalHeight && yProposed+this.width/2 < totalWidth) {
                    this.x = xProposed;
                    this.y = yProposed;
                }
                break;
            case 83: // down
                xProposed = this.x;
                yProposed = this.y;
                xProposed += this.keyPressMove;
                if (0 <= xProposed-this.height/2 && 0 <= yProposed-this.width/2 && xProposed+this.height/2 < totalHeight && yProposed+this.width/2 < totalWidth) {
                    this.x = xProposed;
                    this.y = yProposed;
                }
                break;
            case 65: // left
                xProposed = this.x;
                yProposed = this.y;
                yProposed -= this.keyPressMove;
                if (0 <= xProposed-this.height/2 && 0 <= yProposed-this.width/2 && xProposed+this.height/2 < totalHeight && yProposed+this.width/2 < totalWidth) {
                    this.x = xProposed;
                    this.y = yProposed;
                }
                break;
        }
        console.log(this.x+' '+this.y);
    }
    // returns true if player is killed
    reduceLife(reducedByValue) {
        this.life = Math.max(0, this.life-reducedByValue);
        if (this.life == 0) {
            return true;
        }
        console.log('life: '+this.life);
        return false;
    }
}

module.exports = Player;