require("dotenv").config();

const Weapon = require("./Weapon");

// const totalHeight = process.env.TOTAL_HEIGHT;
// const totalWidth = process.env.TOTAL_WIDTH;

class Item {
    // weaponName optional
    constructor(localX, localY, localItem, localWeaponName) {
        this.height = 400;
        this.width = 400;
        this.exists = true;
        this.x = localX;
        this.y = localY;
        this.item = localItem;
        this.weaponName = localWeaponName;
        this.immortal = false;
        this.static = false;
        this.shape = 'circle';
        this.id = localX+localY+Math.random()+"_item";
        this.obstacle = false;
        this.life = 1; // anything but ZERO
        this.removed = false;
    }
    code() {
        if (this.item == Weapon) {
            return 'weapons/'+this.weaponName+'_icon.svg';
        }
    }
}

module.exports = Item;