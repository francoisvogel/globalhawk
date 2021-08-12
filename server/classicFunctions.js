// returns true if two lines intersect

function counterClockWise(x1, y1, x2, y2, x3, y3) {
    return (y3-y1)*(x2-x1) > (y2-y1)*(x3-x1);
}

function lineSegmentIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    if (counterClockWise(x1, y1, x2, y2, x3, y3) != counterClockWise(x1, y1, x2, y2, x4, y4) && counterClockWise(x3, y3, x4, y4, x1, y1) != counterClockWise(x3, y3, x4, y4, x2, y2)) {
        return true;
    }
    else {
        return false;
    }
}

// returns the distance between two points
function pointDistance(x1, y1, x2, y2) {
    return Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
}

module.exports = {
    lineSegmentIntersect,
    pointDistance
};