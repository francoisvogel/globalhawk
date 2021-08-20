function counterClockWise(x1, y1, x2, y2, x3, y3) {
    return (y3 - y1) * (x2 - x1) > (y2 - y1) * (x3 - x1);
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
    var a1 = y2 - y1;
    var b1 = x1 - x2;
    var c1 = a1 * x1 + b1 * y1;
    var a2 = y4 - y3;
    var b2 = x3 - x4;
    var c2 = a2 * x3 + b2 * y3;
    var determinant = a1 * b2 - a2 * b1;
    if (determinant == 0) {
        console.log('!!!!: BEHAVIOUR: parallel lines');
        return null;
    }
    else {
        var intersectX = (b2 * c1 - b1 * c2) / determinant;
        var intersectY = (a1 * c2 - a2 * c1) / determinant;
        return { intersectX, intersectY };
    }
}

// returns the "straight line" distance between two points
function euclideanDistance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

// returns closest distance between line and point
function linePointDistance(x1, y1, x2, y2, pX, pY) {
    // taken From: https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment

    function sqr(x) {
        return x * x;
    }

    function dist2(v, w) {
        return sqr(v[0] - w[0]) + sqr(v[1] - w[1]);
    }

    // p - point
    // v - start point of segment
    // w - end point of segment
    function distToSegmentSquared(p, v, w) {
        var l2 = dist2(v, w);
        if (l2 === 0) return dist2(p, v);
        var t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
        t = Math.max(0, Math.min(1, t));
        return dist2(p, [v[0] + t * (w[0] - v[0]), v[1] + t * (w[1] - v[1])]);
    }

    // p - point
    // v - start point of segment
    // w - end point of segment
    function distToSegment(p, v, w) {
        return Math.sqrt(distToSegmentSquared(p, v, w));
    }
    return distToSegment([pX, pY], [x1, y1], [x2, y2]);
}

// returns 0, 1, OR 2 intersections between line formed by points (x1, y1) and (x2, y2) and circle at (cX, cY) with radius cR
function lineCircleIntersection(x1, y1, x2, y2, cX, cY, cR) {
    // taken from https://stackoverflow.com/questions/37224912/circle-line-segment-collision/37225895
    function interceptCircleLineSeg(circle, line) {
        // eslint-disable-next-line no-unused-vars
        var a, b, c, d, u1, u2, ret, retP1, retP2, v1, v2;
        v1 = {};
        v2 = {};
        v1.x = line.p2.x - line.p1.x;
        v1.y = line.p2.y - line.p1.y;
        v2.x = line.p1.x - circle.center.x;
        v2.y = line.p1.y - circle.center.y;
        b = (v1.x * v2.x + v1.y * v2.y);
        c = 2 * (v1.x * v1.x + v1.y * v1.y);
        b *= -2;
        d = Math.sqrt(b * b - 2 * c * (v2.x * v2.x + v2.y * v2.y - circle.radius * circle.radius));
        if (isNaN(d)) { // no intercept
            return [];
        }
        u1 = (b - d) / c;  // these represent the unit distance of point one and two on the line
        u2 = (b + d) / c;
        retP1 = {};   // return points
        retP2 = {}
        ret = []; // return array
        if (u1 <= 1 && u1 >= 0) {  // add point if on the line segment
            retP1.x = line.p1.x + v1.x * u1;
            retP1.y = line.p1.y + v1.y * u1;
            ret[0] = retP1;
        }
        if (u2 <= 1 && u2 >= 0) {  // second add point if on the line segment
            retP2.x = line.p1.x + v1.x * u2;
            retP2.y = line.p1.y + v1.y * u2;
            ret[ret.length] = retP2;
        }
        return ret;
    }
    var point1 = {
        x: x1,
        y: y1,
    }
    var point2 = {
        x: x2,
        y: y2,
    }
    var cP = {
        x: cX,
        y: cY,
    }
    var circle = {
        radius: cR,
        center: cP,
    }
    var line = {
        p1: point1,
        p2: point2,
    }
    var result = interceptCircleLineSeg(circle, line);
    return result;
}

// returns true if rectangle and otherElement overlap
function checkIntersectionWithRectangle(x1, y1, x2, y2, otherElement) {
    if (otherElement.shape == 'rect') {
        let corners1 = [[x1, y1], [x1, y2], [x2, y1], [x2, y2]];
        let corners2 = [[otherElement.x-otherElement.height/2, otherElement.y-otherElement.width/2], [otherElement.x-otherElement.height/2, otherElement.y+otherElement.width/2], [otherElement.x+otherElement.height/2, otherElement.y+otherElement.width/2], [otherElement.x+otherElement.height/2, otherElement.y-otherElement.width/2]];
        for (let i = 0; i < 4; i++) {
            let secondI = (i+1)%4;
            for (let j = 0; j < 4; j++) {
                let secondJ = (j+1)%4;
                if (lineSegmentIntersect(corners1[i][0], corners1[i][1], corners1[secondI][0], corners1[secondI][1], corners2[j][0], corners2[j][1], corners2[secondJ][0], corners2[secondJ][1])) {
                    return true;
                }
            }
        }
    }
    else if (otherElement.shape == 'circle') {
        let corners = [[x1, y1], [x1, y2], [x2, y1], [x2, y2]];
        for (let i = 0; i < 4; i++) {
            if (euclideanDistance(corners[i][0], corners[i][1], otherElement.x, otherElement.y) <= otherElement.radius) {
                return true;
            }
        }
    }
    return false;
}

module.exports = {
    lineSegmentIntersect,
    getLineSegmentIntersection,
    euclideanDistance,
    linePointDistance,
    lineCircleIntersection,
    checkIntersectionWithRectangle
};