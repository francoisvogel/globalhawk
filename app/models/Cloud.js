require("dotenv").config();

// const totalHeight = process.env.TOTAL_HEIGHT;
const totalWidth = process.env.TOTAL_WIDTH;

class Cloud {
    constructor(localX, localY, localRadius) {
        this.height;
        this.width;
        this.exists = true;
        this.x = localX;
        this.y = localY;
        this.height = localRadius*2; // basically that's the diameter
        this.width = localRadius*2;
        this.radius = localRadius;
        this.immortal = true;
        this.static = false;
        this.shape = 'circle';
        var hash = totalWidth*this.x+this.y;
        this.id = hash+'cloud'; // a good id
        this.obstacle = true;
    }
    getMajColor() {
        return 'gray';
    }
    code() {
        return 'backgrounds/cloud.svg';
    }
}

module.exports = Cloud;