require("dotenv").config();
// const fs = require('fs');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const path = require('path');
// const { type } = require('jquery');
// const jsdom = require('jsdom');
// const dom = new jsdom.JSDOM("");
// const jquery = require('jquery')(dom.window);

const geometry = require('./app/scripts/geometry');
const profanatoryDetector = require('./app/scripts/profanatory');
const random = require('./app/scripts/random');

const Background = require('./app/models/Background');
const Player = require('./app/models/Player');
const Cloud = require('./app/models/Cloud');
const Heal = require('./app/models/Heal');

const totalHeight = process.env.TOTAL_HEIGHT;
const totalWidth = process.env.TOTAL_WIDTH;

class Match {
    constructor() {
        this.matchNumber = 0;
        this.players = [];
        this.elements = [];
        this.activePlayerCount = 0; // players who are not dead and not disconnected
        this.lightningRadius = 1.5 * Math.sqrt(totalHeight * totalWidth); // storm radius
        this.lightningCenterX = totalHeight / 2;
        this.lightningCenterY = totalWidth / 2;
        this.activeMatch = true;
        // add background
        this.elements.push(new Background());
        // random generator
        var randomNumberGeneratorMersenneTwister = new random.MersenneTwister(Date.now());
        // add heal objects
        for (let i = 0; i < 20; i++) {
            let circlePositionX = randomNumberGeneratorMersenneTwister.genrand_int31() % totalHeight;
            let circlePositionY = randomNumberGeneratorMersenneTwister.genrand_int31() % totalWidth;
            let circleRadius = randomNumberGeneratorMersenneTwister.genrand_int31() % 500 + 4000;
            let circleNotOverridingWithOtherElements = true;
            for (let j = 0; j < this.elements.length; j++) if (!this.elements[j].static) {
                if (this.elements[j].shape == 'circle' && geometry.euclideanDistance(circlePositionX, circlePositionY, this.elements[j].x, this.elements[j].y) <= circleRadius + this.elements[j].radius) {
                    circleNotOverridingWithOtherElements = false;
                    break;
                }
                else if (this.elements[j].shape == 'rect' && Math.min(geometry.euclideanDistance(circlePositionX, circlePositionY, this.elements[j].x - this.elements[j].height / 2, this.elements[j].y - this.elements[j].width / 2), geometry.euclideanDistance(circlePositionX, circlePositionY, this.elements[j].x - this.elements[j].height / 2, this.elements[j].y + this.elements[j].width / 2), geometry.euclideanDistance(circlePositionX, circlePositionY, this.elements[j].x + this.elements[j].height / 2, this.elements[j].y + this.elements[j].width / 2), geometry.euclideanDistance(circlePositionX, circlePositionY, this.elements[j].x + this.elements[j].height / 2, this.elements[j].y - this.elements[j].width / 2)) <= circleRadius) {
                    circleNotOverridingWithOtherElements = false;
                    break;
                }
            }
            if (circleNotOverridingWithOtherElements && circleRadius <= circlePositionX && circleRadius <= circlePositionY && circlePositionX < totalHeight - circleRadius && circlePositionY < totalWidth - circleRadius) {
                this.elements.push(new Heal(circlePositionX, circlePositionY, circleRadius));
            }
        }
        // create clouds
        for (let i = 0; i < 100; i++) {
            let circlePositionX = randomNumberGeneratorMersenneTwister.genrand_int31() % totalHeight;
            let circlePositionY = randomNumberGeneratorMersenneTwister.genrand_int31() % totalWidth;
            let circleRadius = randomNumberGeneratorMersenneTwister.genrand_int31() % 500 + 1000;
            let circleNotOverridingWithOtherElements = true;
            for (let j = 0; j < this.elements.length; j++) if (!this.elements[j].static) {
                if (this.elements[j].shape == 'circle' && geometry.euclideanDistance(circlePositionX, circlePositionY, this.elements[j].x, this.elements[j].y) <= circleRadius + this.elements[j].radius) {
                    circleNotOverridingWithOtherElements = false;
                    break;
                }
                else if (this.elements[j].shape == 'rect' && Math.min(geometry.euclideanDistance(circlePositionX, circlePositionY, this.elements[j].x - this.elements[j].height / 2, this.elements[j].y - this.elements[j].width / 2), geometry.euclideanDistance(circlePositionX, circlePositionY, this.elements[j].x - this.elements[j].height / 2, this.elements[j].y + this.elements[j].width / 2), geometry.euclideanDistance(circlePositionX, circlePositionY, this.elements[j].x + this.elements[j].height / 2, this.elements[j].y + this.elements[j].width / 2), geometry.euclideanDistance(circlePositionX, circlePositionY, this.elements[j].x + this.elements[j].height / 2, this.elements[j].y - this.elements[j].width / 2)) <= circleRadius) {
                    circleNotOverridingWithOtherElements = false;
                    break;
                }
            }
            if (circleNotOverridingWithOtherElements && circleRadius <= circlePositionX && circleRadius <= circlePositionY && circlePositionX < totalHeight - circleRadius && circlePositionY < totalWidth - circleRadius) {
                this.elements.push(new Cloud(circlePositionX, circlePositionY, circleRadius));
            }
        }
    }
    updateLightningRadius() {
        this.lightningRadius -= 1 / process.env.REFRESH * process.env.ACC;
        this.lightningRadius = Math.max(this.lightningRadius, 200);
        // if (this.lightningRadius % 100 == 0) console.log(this.lightningRadius);
        for (let i = 0; i < this.players.length; i++) {
            var actualHeight = Math.sqrt(this.players[i].scope / this.players[i].ratio);
            var actualWidth = actualHeight * this.players[i].ratio;
            var fromTop = (this.lightningCenterX - (this.players[i].x - actualHeight / 2)) / actualHeight * 100;
            var fromLeft = (this.lightningCenterY - (this.players[i].y - actualWidth / 2)) / actualWidth * 100;
            io.to(this.players[i].id).emit('updateLightning', fromTop, fromLeft, this.lightningRadius / Math.sqrt(this.players[i].scope) * 100, this.lightningRadius * 100 / actualHeight, this.lightningRadius * 100 / actualWidth);
            if (Date.now() % 100 <= process.env.REFRESH /* chance of x/y of being hit */) {
                if (geometry.euclideanDistance(this.lightningCenterX, this.lightningCenterY, this.players[i].x, this.players[i].y) >= this.lightningRadius / 2) {
                    if (this.players[i].reduceLife((geometry.euclideanDistance(this.lightningCenterX, this.lightningCenterY, this.players[i].x, this.players[i].y) - this.lightningRadius / 2) / (totalHeight + totalWidth) * 20000 * process.env.ACC)) {
                        io.to(this.players[i].id).emit('addChatComment', 'LightningStorm', this.players[i].playerName + ' is destroyed.');
                        io.to(this.players[i].id).emit('gameFinishedForPlayer', false);
                    }
                    else {
                        io.to(this.players[i].id).emit('addImportantComment', 'Stay away of the lighting storm to avoid being destroyed.');
                    }
                }
            }
        }
    }
    healCheck() {
        for (var i = 0; i < this.players.length; i++) {
            var insideHealZone = false;
            for (var j = 0; j < this.elements.length; j++) if (this.elements[j].constructor.name == 'Heal') {
                if (geometry.euclideanDistance(this.elements[j].x, this.elements[j].y, this.players[i].x, this.players[i].y) <= this.elements[j].radius) {
                    insideHealZone = true;
                    break;
                }
            }
            if (insideHealZone) {
                this.players[i].augmentLife(0.03);
                io.to(this.players[i].id).emit('addImportantComment', 'While staying in Heal zones, life increases slowly over time')
            }
        }
    }
    refreshView() {
        this.healCheck();
        this.updateLightningRadius();
        this.players.forEach(function (i) {
            io.to(i.id).emit('updateBoostBar', i.refresh() * 100);
        });
        this.elements.forEach(function (i) {
            if (!i.immortal && i.life == 0 && !i.removed) {
                io.emit('removeElementFromGameView', i.id);
                i.removed = true;
            }
        });
        for (var i = 0; i < this.players.length; i++) if (this.players[i].exists) {
            io.to(this.players[i].id).emit('updateLife', this.players[i].life);
            if (this.players[i] == undefined) continue; // strange bug
            io.to(this.players[i].id).emit('sendUserScreenRatio');
            var actualHeight = Math.sqrt(this.players[i].scope / this.players[i].ratio);
            var actualWidth = actualHeight * this.players[i].ratio;
            for (var j = 0; j < this.elements.length; j++) if (this.elements[j].exists) {
                var fromTop = (this.elements[j].x - (this.players[i].x - actualHeight / 2)) / actualHeight * 100;
                var fromLeft = (this.elements[j].y - (this.players[i].y - actualWidth / 2)) / actualWidth * 100;
                // console.log(i.id);
                io.to(this.players[i].id).emit('addElementToGameView', Number(fromTop), Number(fromLeft), this.elements[j].height * 100 / actualHeight, this.elements[j].width * 100 / actualWidth, this.elements[j].code(), this.elements[j].id);
            }
        }
    }
    // caller is an optional parameter to be used in case an object is moving and if it overlaps with itself we shouldn't consider it
    noOverlapWithOtherElement(x1, y1, x2, y2, caller) {
        for (var i = 0; i < this.elements.length; i++) if (this.elements[i].obstacle && (caller == undefined || caller != this.elements[i])) {
            if (geometry.checkIntersectionWithRectangle(x1, y1, x2, y2, this.elements[i])) {
                return false;
            }
        }
        return true;
    }
    calculateFreeCoordinates() {
        return [totalHeight - 1000, totalWidth - 1000];
    }
    addPlayer(player) {
        this.players.push(player);
        this.elements.push(player); // elements contains all elements (drones, clouds, items)
        var coordinates = this.calculateFreeCoordinates();
        player.x = coordinates[0];
        player.y = coordinates[1];
        this.activePlayerCount++;
        io.to(this.matchNumber).emit('updatePlayerCount', this.players.length);
        io.to(this.matchNumber).emit('addChatComment', 'system', player.playerName + ' joined the match.');
    }
    removePlayer(player) {
        console.log('player removed');
        var x = this.players.indexOf(player);
        if (x == -1) return; // not found
        for (let i = x; i < this.players.length; i++) this.players[i] = this.players[i + 1];
        this.players.pop();
        x = this.elements.indexOf(player);
        if (x == -1) return; // not found, let's say user lost and disconnected at a very short time interval
        for (let i = x; i < this.elements.length; i++) this.elements[i] = this.elements[i + 1];
        this.elements.pop();
        this.activePlayerCount--;
        // io.to(this.matchNumber).emit('removeElementFromGameView', player.id); // not needed any more
        io.to(this.matchNumber).emit('removeElementFromGameView', player.id);
        io.to(this.matchNumber).emit('updatePlayerCount', this.players.length);
        io.to(this.matchNumber).emit('addChatComment', 'system', player.playerName + ' left the match.');
    }
    // looks for closest element to (x1, y1) that intersect with line [(x1, y1), (x2, y2)] and takes life from it
    processShot(x1, y1, x2, y2, shooter) {
        var smallestDistance = totalHeight + totalWidth;
        var selectedElement = -1;
        this.elements.forEach(function (i) {
            // check whether diagonals intersect
            if (i.obstacle && i.id != shooter.id) {
                if (i.shape == 'rect') {
                    if (geometry.lineSegmentIntersect(x1, y1, x2, y2, i.x - i.height / 2, i.y - i.width / 2, i.x + i.height / 2, i.y + i.height / 2) || geometry.lineSegmentIntersect(x1, y1, x2, y2, i.x - i.height / 2, i.y + i.width / 2, i.x + i.height / 2, i.y - i.height / 2)) {
                        if (geometry.euclideanDistance(i.x, i.y, x1, y1) < smallestDistance) {
                            smallestDistance = geometry.euclideanDistance(i.x, i.y, x1, y1);
                            selectedElement = i;
                        }
                    }
                }
                else if (i.shape == 'circle') {
                    if (geometry.linePointDistance(x1, y1, x2, y2, i.x, i.y) < Math.min(i.radius, geometry.euclideanDistance(x1, y1, i.x, i.y), geometry.euclideanDistance(x2, y2, i.x, i.y))) {
                        var intersections = geometry.lineCircleIntersection(x1, y1, x2, y2, i.x, i.y, i.radius);
                        var localDistance = Infinity;
                        intersections.forEach(function (j) {
                            localDistance = Math.min(localDistance, geometry.euclideanDistance(j.x, j.y, x1, y1));
                        });
                        if (localDistance < smallestDistance) {
                            smallestDistance = localDistance;
                            selectedElement = i;
                        }
                    }
                }
            }
        });
        this.players.forEach(function (i) {
            var actualHeight = Math.sqrt(i.scope / i.ratio);
            var actualWidth = actualHeight * i.ratio;
            var fromTopX1 = (x1 - (i.x - actualHeight / 2)) / actualHeight * 100;
            var fromLeftY1 = (y1 - (i.y - actualWidth / 2)) / actualWidth * 100;
            var fromTopX2, fromLeftY2;
            if (selectedElement == -1) {
                fromTopX2 = (x2 - (i.x - actualHeight / 2)) / actualHeight * 100;
                fromLeftY2 = (y2 - (i.y - actualWidth / 2)) / actualWidth * 100;
            }
            else {
                if (selectedElement.shape == 'rect') {
                    let closestIntersection = null;
                    let corners = [[selectedElement.x - selectedElement.height / 2, selectedElement.y - selectedElement.width / 2], [selectedElement.x - selectedElement.height / 2, selectedElement.y + selectedElement.width / 2], [selectedElement.x + selectedElement.height / 2, selectedElement.y + selectedElement.width / 2], [selectedElement.x + selectedElement.height / 2, selectedElement.y - selectedElement.width / 2]]; // in CCW
                    for (var j = 0; j < 4; j++) {
                        let secondPoint = (j + 1) % 4;
                        if (geometry.lineSegmentIntersect(corners[j][0], corners[j][1], corners[secondPoint][0], corners[secondPoint][1], x1, y1, x2, y2) == true) {
                            var proposedIntersection = geometry.getLineSegmentIntersection(corners[j][0], corners[j][1], corners[secondPoint][0], corners[secondPoint][1], x1, y1, x2, y2);
                            if (proposedIntersection != null && (closestIntersection == null || geometry.euclideanDistance(x1, y1, proposedIntersection.intersectX, proposedIntersection.intersectY) < geometry.euclideanDistance(x1, y1, closestIntersection.intersectX, closestIntersection.intersectY))) {
                                closestIntersection = proposedIntersection;
                            }
                        }
                    }
                    fromTopX2 = (closestIntersection.intersectX - (i.x - actualHeight / 2)) / actualHeight * 100;
                    fromLeftY2 = (closestIntersection.intersectY - (i.y - actualWidth / 2)) / actualWidth * 100;
                }
                else if (selectedElement.shape == 'circle') {
                    let closestIntersection = null;
                    let intersections = geometry.lineCircleIntersection(x1, y1, x2, y2, selectedElement.x, selectedElement.y, selectedElement.radius);
                    intersections.forEach(function (j) {
                        if (closestIntersection == null || geometry.euclideanDistance(closestIntersection.x, closestIntersection.y, x1, y1) > geometry.euclideanDistance(j.x, j.y, x1, y1)) {
                            closestIntersection = j;
                        }
                    });
                    fromTopX2 = (closestIntersection.x - (i.x - actualHeight / 2)) / actualHeight * 100;
                    fromLeftY2 = (closestIntersection.y - (i.y - actualWidth / 2)) / actualWidth * 100;
                }
            }
            io.to(i.id).emit('shotFired', fromTopX1, fromLeftY1, fromTopX2, fromLeftY2, 10000);
        });
        if (selectedElement != -1 && !selectedElement.immortal) {
            if (selectedElement.reduceLife(5)) {
                io.to(selectedElement.id).emit('gameFinishedForPlayer', false);
            }
            if (selectedElement.life == 0 && selectedElement.constructor.name == 'Player') {
                shooter.destroyedCount++;
                io.to(shooter.id).emit('updateDestroyedCount', shooter.destroyedCount);
                io.to(this.matchNumber).emit('addChatComment', 'system', shooter.playerName + ' destroyed ' + selectedElement.playerName + '.');
            }
        }
    }
    emitImageEvent(x, y, targetHeight, targetWidth, source) {
        console.log('imageEvent_emitted');
        this.players.forEach(function (i) {
            var actualHeight = Math.sqrt(i.scope / i.ratio);
            var actualWidth = actualHeight * i.ratio;
            var fromTopX = (x - (i.x - actualHeight / 2)) / actualHeight * 100;
            var fromLeftY = (y - (i.y - actualWidth / 2)) / actualWidth * 100;
            var imageHeight = targetHeight*100/actualHeight;
            var imageWidth = targetWidth*100/actualWidth;
            io.to(i.id).emit('showImageEvent', fromTopX, fromLeftY, imageHeight, imageWidth, source+'.png', x+'_'+y+'_'+targetHeight+'_'+targetWidth+'_'+source+'_imageEvent');
        });
    }
    oneRemainingCheck() {
        if (this.players.length <= 1) {
            io.to(this.matchNumber).emit('gameFinishedForPlayer', true);
            this.activeMatch = false;
        }
    }
}

function refreshViewAllMatches() {
    for (var i = 0; i < matches.length; i++) {
        if (matches[i].activeMatch == true) matches[i].refreshView();
    }
}

setInterval(refreshViewAllMatches, process.env.REFRESH);
var matches = [];
matches.push(new Match());

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages/index.html'));
});

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

io.on('connection', (socket) => {
    function sanityCheck() {
        if (thisPlayer == undefined) return false;
        return true;
    }
    socket.emit('launchHome');
    var thisPlayer = null;
    var selectedMatch;
    socket.on('game_start_button_pressed', (arg) => {
        if (arg != "") {
            thisPlayer.playerName = arg;
        }
        console.log('game_start_button_pressed');
        thisPlayer = new Player(socket.id);
        selectedMatch = matches[matches.length - 1];
        socket.join(selectedMatch.matchNumber);
        selectedMatch.addPlayer(thisPlayer);
        socket.emit('updateDestroyedCount', thisPlayer.destroyedCount);
    });
    // updates thisPlayer.ratio
    socket.on('user_screen_ratio', (localRatio) => {
        if (!sanityCheck()) return;
        thisPlayer.ratio = localRatio;
    });
    socket.on('player_move', (xShift, yShift, boostActivated) => {
        if (!sanityCheck()) return;
        function updatePosition() {
            thisPlayer.x -= xShift * thisPlayer.tickHitMove * (thisPlayer.hitMoveTime - ticks) / thisPlayer.hitMoveTime * 10;
            thisPlayer.y -= yShift * thisPlayer.tickHitMove * (thisPlayer.hitMoveTime - ticks) / thisPlayer.hitMoveTime * 10;
            ticks += 25;
            var res = selectedMatch.noOverlapWithOtherElement(thisPlayer.x - thisPlayer.height / 2, thisPlayer.y - thisPlayer.width / 2, thisPlayer.x + thisPlayer.height / 2, thisPlayer.y + thisPlayer.width / 2, thisPlayer);
            if (!res) console.log('INVOKED');
            if (ticks >= thisPlayer.hitMoveTime || thisPlayer.x - thisPlayer.height / 2 < 0 || thisPlayer.y - thisPlayer.height.width / 2 < 0 || thisPlayer.x + thisPlayer.height / 2 >= totalHeight || thisPlayer.y + thisPlayer.width / 2 >= totalWidth || !selectedMatch.noOverlapWithOtherElement(thisPlayer.x - thisPlayer.height / 2, thisPlayer.y - thisPlayer.width / 2, thisPlayer.x + thisPlayer.height / 2, thisPlayer.y + thisPlayer.width / 2, thisPlayer)) {
                thisPlayer.x += xShift * thisPlayer.tickHitMove * (thisPlayer.hitMoveTime - ticks) / thisPlayer.hitMoveTime * 5;
                thisPlayer.y += yShift * thisPlayer.tickHitMove * (thisPlayer.hitMoveTime - ticks) / thisPlayer.hitMoveTime * 5;
                thisPlayer.frozen = false;
                clearInterval(interval);
                console.log('ended');
                console.log(Date.now() - time);
            }
        }
        if (xShift < -1 || xShift > 1 || yShift < -1 || yShift > 1) return; // protection against attacks
        if (thisPlayer.frozen) return;
        var newPosition = thisPlayer.playerMove(xShift, yShift, boostActivated);
        if (newPosition != undefined) {
            if (selectedMatch.noOverlapWithOtherElement(newPosition.x - thisPlayer.height / 2, newPosition.y - thisPlayer.width / 2, newPosition.x + thisPlayer.height / 2, newPosition.y + thisPlayer.width / 2, thisPlayer)) {
                thisPlayer.x = newPosition.x;
                thisPlayer.y = newPosition.y;
            }
            else {
                var xImage = thisPlayer.x + xShift * thisPlayer.height / 2;
                var yImage = thisPlayer.y + yShift * thisPlayer.width / 2;
                selectedMatch.emitImageEvent(xImage, yImage, 1000, 1000, 'collision');
                if (thisPlayer.reduceLife(5)) {
                    io.to(selectedMatch.id).emit('addChatComment', 'system', thisPlayer.playerName+' was destroyed by an collision.');
                    io.to(thisPlayer.id).emit('gameFinishedForPlayer', false);
                }
                var ticks = 1;
                console.log('started');
                var time = Date.now();
                if (!thisPlayer.frozen) var interval = setInterval(updatePosition, 1);
                thisPlayer.frozen = true;
            }
        }
    });
    socket.on('game_finished_for_player', () => {
        if (!sanityCheck()) return;
        socket.leave(selectedMatch.matchNumber);
        thisPlayer.exists = false;
        selectedMatch.removePlayer(thisPlayer);
        selectedMatch.oneRemainingCheck();
    });
    // eslint-disable-next-line no-unused-vars
    socket.on('disconnect', (key) => {
        if (!sanityCheck()) return;
        if (thisPlayer != null) {
            thisPlayer.exists = false;
            selectedMatch.removePlayer(thisPlayer);
        }
        if (process.env.MODE != 'dev') selectedMatch.oneRemainingCheck();
    });
    socket.on('shot_fired', (xDir, yDir) => {
        if (!sanityCheck()) return;
        // binarySearch the value to find two other points such that the resulting grid is still in bounds
        var k = 0;
        for (var i = (1 << 30); i > 0.001; i /= 2) {
            var proposedSecondX = thisPlayer.x + xDir * (k + i);
            var proposedSecondY = thisPlayer.y + yDir * (k + i);
            if (0 <= proposedSecondX && 0 <= proposedSecondY && proposedSecondX < totalHeight && proposedSecondY < totalWidth) {
                k += i;
            }
        }
        var secondX = thisPlayer.x + xDir * k;
        var secondY = thisPlayer.y + yDir * k;
        selectedMatch.processShot(thisPlayer.x, thisPlayer.y, secondX, secondY, thisPlayer);
    });
    socket.on('chat_message_sent', (message) => {
        if (!sanityCheck()) return;
        if (profanatoryDetector.isProfanatory(message)) {
            io.to(thisPlayer.id).emit('addChatComment', 'system', 'Please remain respectful and polite at all times. Check the Code of Conduct for more details.');
        }
        else {
            io.to(selectedMatch.matchNumber).emit('addChatComment', thisPlayer.playerName, message);
        }
    });
    socket.on('voice_message', (data) => {
        if (!sanityCheck()) return;
        var newData = data.split(';');
        newData[0] = "data:audio/ogg;";
        newData = newData[0]+newData[1];
        socket.to(selectedMatch.matchNumber).emit('voiceMessage', newData);
    })
});

server.listen(process.env.PORT, () => {
    console.log('listening on *:' + process.env.PORT);
});