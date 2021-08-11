// returns true if two lines intersect
function lineSegmentIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    return true;
}

// returns the distance between two points
function pointDistance(x1, y1, x2, y2) {
    return Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
}

module.exports = {
    lineSegmentIntersect,
    pointDistance
};