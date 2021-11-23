require('dotenv').config();
const path = require('path');

const totalHeight = process.env.TOTAL_HEIGHT;
const totalWidth = process.env.TOTAL_WIDTH;

const nameGenerator = require('../scripts/nameGenerator.js');

const WeaponsConstants = require(path.join(__dirname, '../../', process.env.DB, 'constants', 'Weapons'));

class Player {
    constructor(localID, localMatch) {
        this.id = localID;
        this.match = localMatch;
        this.height = 500;
        this.width = 500;
        this.ratio = 1; // ratio of width = ratio*height
        this.scope = 100000000; // gives the area that can be seen;
        this.keyPressMove = 10*process.env.ACC; // move when key w-a-s-d pressed
        this.exists = true; // defines whether player exists
        this.life = 100; // defines initial life
        this.x;
        this.y;
        this.shape = 'rect';
        this.weapon = WeaponsConstants['allWeapons'][Math.floor(WeaponsConstants['allWeapons'].length*Math.random())]; // originally no weapon is equipped
        this.weaponObject; // stores link to the object with class Weapon (i.e. a pointer to the object with class Weapon that is broadcasted to all sockets and displayed)
        this.playerName = nameGenerator(); // default name
        this.immortal = false;
        this.removed = false; // indicated whether element has been removed of player view
        this.destroyedCount = 0; // nb of killed players
        this.static = false;
        this.boostCountdown = 0; // used to store time since last boost
        this.boostCountdownReset = 5000; // boost reset value
        this.obstacle = true;
        this.hitMoveTime = 300; // how many ms it lasts
        this.tickHitMove = 10; // move per ms when hit
        this.frozen = false;
    }
    // string png to be used on client
    code() {
        return 'items/drone.svg';
    }
    computeRealBoost(x) {
        x = (x-0.5)/0.5;
        if (x < 0) x = 0;
        return 4*x*x;
    }
    playerMove(xShift, yShift, boostActivated) {
        if (this.boostCountdown > 0) boostActivated = false;
        if (boostActivated == true) {
            this.boostCountdown = this.boostCountdownReset;
        }
        var xProposed, yProposed;
        xProposed = this.x;
        yProposed = this.y;
        xProposed += xShift*this.keyPressMove*(1+this.computeRealBoost(this.boostCountdown/this.boostCountdownReset));
        yProposed += yShift*this.keyPressMove*(1+this.computeRealBoost(this.boostCountdown/this.boostCountdownReset));
        if (0 <= xProposed-this.height/2 && 0 <= yProposed-this.width/2 && xProposed+this.height/2 < totalHeight && yProposed+this.width/2 < totalWidth) {
            return {
                x: xProposed,
                y: yProposed
            }
        }
    }
    // called regularly from match refresh function
    refresh() {
        this.boostCountdown -= process.env.REFRESH;
        this.boostCountdown = Math.max(0, this.boostCountdown);
        return this.computeRealBoost(this.boostCountdown/this.boostCountdownReset)/this.computeRealBoost(1);
    }
    // returns true if player is killed
    reduceLife(reducedByValue) {
        this.life = Math.max(0, this.life-reducedByValue);
        if (this.life == 0) {
            return true;
        }
        // console.log('life: '+this.life);
        return false;
    }
    augmentLife(x) {
        return this.reduceLife(-Math.min(x, 100-this.life));
    }
}

module.exports = Player;