require("dotenv").config();
const path = require('path');

// const totalHeight = process.env.TOTAL_HEIGHT;
// const totalWidth = process.env.TOTAL_WIDTH;

const WeaponsConstants = require(path.join(__dirname, '../../', process.env.DB, 'constants', 'Weapons'));

class Weapon {
    constructor(localPlayer) {
        this.player = localPlayer;
        this.id = this.player.playerName+this.player.x+this.player.y+Date.now()+Math.random()+'weapon';
        this.height;
        this.width;
        this.x;
        this.y;
        this.obstacle = false;
        this.immortal = false;
        this.life = 1;
        this.exists = true;
        this.extraInfo; // stores degree of user mouse
    }
    refreshElement(localDegree) {
        if (localDegree != undefined) this.extraInfo = localDegree;
        this.height = WeaponsConstants[this.player.weapon+'_height'];
        this.width = WeaponsConstants[this.player.weapon+'_width'];
        this.x = this.player.x;
        this.y = this.player.y;
    }
    code() {
        return 'weapons/'+this.player.weapon+'.svg';
    }
}

module.exports = Weapon;