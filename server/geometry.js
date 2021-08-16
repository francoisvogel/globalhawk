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

function getLineSegmentIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    var a1 = y2-y1;
    var b1 = x1-x2;
    var c1 = a1*x1+b1*y1;
    var a2 = y4-y3;
    var b2 = x3-x4;
    var c2 = a2*x3+b2*y3;
    var determinant = a1*b2-a2*b1;
    if (determinant == 0) {
        console.log('!!!!: BEHAVIOUR: parallel lines');
        return null;
    }
    else {
        var intersectX = (b2*c1-b1*c2)/determinant;
        var intersectY = (a1*c2-a2*c1)/determinant;
        return {intersectX, intersectY};
    }
}

// returns the "straight line" distance between two points
function euclideanDistance(x1, y1, x2, y2) {
    return Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
}

module.exports = {
    lineSegmentIntersect,
    getLineSegmentIntersection,
    euclideanDistance
};