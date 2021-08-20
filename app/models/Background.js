require("dotenv").config();

const totalHeight = process.env.TOTAL_HEIGHT;
const totalWidth = process.env.TOTAL_WIDTH;

class Background {
    constructor() {
        this.height = totalHeight;
        this.width = totalWidth;
        this.exists = true;
        this.x = totalHeight/2;
        this.y = totalWidth/2;
        this.immortal = true;
        this.static = true;
        this.shape = 'rect';
        this.id = 0; // doesn't really need an id because it only occurs once in a match
        this.background = true;
        this.obstacle = false;
    }
    code() {
        return 'backgrounds/green.svg';
    }
}

module.exports = Background;