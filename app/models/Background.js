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
    }
    code() {
        return 'backgrounds/green.svg';
    }
}

module.exports = Background;