const fs = require('fs');
var gifyParse = require('gify-parse');
const classicFunctions = require('./server/classicFunctions');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const path = require('path');
// const jsdom = require('jsdom');
// const dom = new jsdom.JSDOM("");
// const jquery = require('jquery')(dom.window);

const totalHeight = 1000000;
const totalWidth = 1000000;

class Background {
    constructor() {
        this.height = totalHeight;
        this.width = totalWidth;
        this.exists = true;
        this.x = totalHeight/2;
        this.y = totalWidth/2;
        this.immortal = true;
    }
    code() {
        return 'backgrounds/green';
    }
}

class Player {
    constructor(localID) {
        this.id = localID;
        this.height = 10;
        this.width = 10;
        this.ratio = 1; // ratio of width = ratio*height
        this.scope = 50000; // gives the area that can be seen;
        this.keyPressMove = 1; // move when key w-a-s-d pressed
        this.exists = true; // defines whether player exists
        this.life = 100; // defines initial life
        this.x;
        this.y;
        this.weapon = 0; // originally no weapon is equipped
        this.playerName = "BuzzDroner"; // default name
        this.immortal = false;
    }
    // string png to be used locally
    code() {
        if (this.life > 30) return 'items/drone';
        else return 'items/drone_low';
    }
    receiveKeyPress(key) {
        console.log('key press received');
        switch (key) {
            case 119: // up
                var xProposed = this.x;
                var yProposed = this.y;
                xProposed -= this.keyPressMove;
                if (0 <= xProposed-this.height/2 && 0 <= yProposed-this.width/2 && xProposed+this.height/2 < totalHeight && yProposed+this.width/2 < totalWidth) {
                    this.x = xProposed;
                    this.y = yProposed;
                }
                break;
            case 100: // right
                var xProposed = this.x;
                var yProposed = this.y;
                yProposed += this.keyPressMove;
                if (0 <= xProposed-this.height/2 && 0 <= yProposed-this.width/2 && xProposed+this.height/2 < totalHeight && yProposed+this.width/2 < totalWidth) {
                    this.x = xProposed;
                    this.y = yProposed;
                }
                break;
            case 115: // down
                var xProposed = this.x;
                var yProposed = this.y;
                xProposed += this.keyPressMove;
                if (0 <= xProposed-this.height/2 && 0 <= yProposed-this.width/2 && xProposed+this.height/2 < totalHeight && yProposed+this.width/2 < totalWidth) {
                    this.x = xProposed;
                    this.y = yProposed;
                }
                break;
            case 97: // left
                var xProposed = this.x;
                var yProposed = this.y;
                yProposed -= this.keyPressMove;
                if (0 <= xProposed-this.height/2 && 0 <= yProposed-this.width/2 && xProposed+this.height/2 < totalHeight && yProposed+this.width/2 < totalWidth) {
                    this.x = xProposed;
                    this.y = yProposed;
                }
                break;
        }
        console.log(this.x+' '+this.y);
    }
    reduceLife(reducedByValue) {
        this.life = Math.max(0, this.life-reducedByValue);
        if (this.life == 0) {
            io.to(this.id).emit('gameFinishedForPlayer');
        }
        console.log('life: '+this.life);
    }
}

class Match {
    constructor() {
        this.matchNumber = 0;
        this.players = [];
        this.elements = [];
        this.elements.push(new Background());
        this.activePlayerCount = 0; // players who are not dead and not disconnected
    }
    refreshView() {
        io.to(toString(this.matchNumber)).emit('resetGameView');
        for (var i = 0; i < this.players.length; i++) if (this.players[i].exists) {
            io.to(this.players[i].id).emit('sendUserScreenRatio');
            var actualHeight = Math.sqrt(this.players[i].scope/this.players[i].ratio);
            var actualWidth = actualHeight*this.players[i].ratio;
            for (var j = 0; j < this.elements.length; j++) if (this.elements[j].exists) {
                var fromTop = (this.elements[j].x-(this.players[i].x-actualHeight/2))/actualHeight*100;
                var fromLeft = (this.elements[j].y-(this.players[i].y-actualWidth/2))/actualWidth*100;
                // console.log(i.id);
                io.to(this.players[i].id).emit('addElementToGameView', Number(fromTop), Number(fromLeft), this.elements[j].height/actualHeight*100, this.elements[j].width/actualWidth*100, this.elements[j].code());
            }
        }
        io.to(toString(this.matchNumber)).emit('resetGameViewFinished');
    }
    calculateFreeCoordinates() {
        return [50, 50];
    }
    addPlayer(player) {
        this.players.push(player);
        this.elements.push(player); // elements contains all elements (drones, clouds, items)
        var coordinates = this.calculateFreeCoordinates();
        player.x = coordinates[0];
        player.y = coordinates[1];
        this.activePlayerCount++;
    }
    removePlayer(player) {
        console.log('player removed');
        var x = this.players.indexOf(player);
        if (x == -1) return; // not found
        for (var i = x; i < this.players.length; i++) this.players[i] = this.players[i+1];
        this.players.pop();
        x = this.elements.indexOf(player);
        if (x == -1) return; // not found, let's say user lost and disconnected at a very short time interval
        for (var i = x; i < this.elements.length; i++) this.elements[i] = this.elements[i+1];
        this.elements.pop();
        this.activePlayerCount--;
    }
    // looks for closest element to (x1, y1) that intersect with line [(x1, y1), (x2, y2)] and takes life from it
    processShot(x1, y1, x2, y2, shooter) {
        this.players.forEach(function(i) {
            var actualHeight = Math.sqrt(i.scope/i.ratio);
            var actualWidth = actualHeight*i.ratio;
            var fromTopX1 = (x1-(i.x-actualHeight/2))/actualHeight*100;
            var fromLeftY1 = (y1-(i.y-actualWidth/2))/actualWidth*100;
            var fromTopX2 = (x2-(i.x-actualHeight/2))/actualHeight*100;
            var fromLeftY2 = (y2-(i.y-actualWidth/2))/actualWidth*100;
            io.to(i.id).emit('shotFired', fromTopX1, fromLeftY1, fromTopX2, fromLeftY2, 10000);
        });
        var smallestDistance = totalHeight+totalWidth;
        var selectedElement = -1;
        this.elements.forEach(function(i) {
            // check whether diagonals intersect
            if (!i.immortal && i.id != shooter.id && (classicFunctions.lineSegmentIntersect(x1, y1, x2, y2, i.x-i.height/2, i.y-i.width/2) || classicFunctions.lineSegmentIntersect(x1, y2, x2, y2, i.x-i.height/2, i.y+i.width/2, i.x+i.height/2, i.y-i.height/2))) {
                if (classicFunctions.pointDistance(i.x, i.y, x1, y1) < smallestDistance) {
                    smallestDistance = classicFunctions.pointDistance(i.x, i.y, x1, y1);
                    selectedElement = i;
                }
            }
        });
        if (selectedElement != -1) {
            selectedElement.reduceLife(5);
        }
    }
}

function refreshViewAllMatches() {
    for (var i = 0; i < matches.length; i++) {
        matches[i].refreshView();
    }
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/pages/index.html');
});

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    var thisPlayer = null;
    var selectedMatch;
    socket.emit('launchHome');
    socket.on('player_name_set', (arg) => {
        console.log('player_name_set');
        if (arg != undefined) {
            thisPlayer.playerName = arg;
        }
    });
    socket.on('game_start_button_pressed', () => {
        console.log('game_start_button_pressed');
        thisPlayer = new Player(socket.id);
        selectedMatch = matches[0];
        selectedMatch.addPlayer(thisPlayer);
        socket.join(toString(selectedMatch.matchNumber));
    });
    // updates thisPlayer.ratio
    socket.on('user_screen_ratio', (localRatio) => {
        thisPlayer.ratio = localRatio;
    });
    socket.on('key_pressed', (key) => {
        thisPlayer.receiveKeyPress(key);
    });
    socket.on('game_finished_for_player', () => {
        thisPlayer.exists = false;
        selectedMatch.removePlayer(thisPlayer);
    });
    socket.on('disconnect', (key) => {
        if (thisPlayer != null) {
            thisPlayer.exists = false;
            selectedMatch.removePlayer(thisPlayer);
        }
    });
    socket.on('shot_fired', (xDir, yDir) => {
        // binarySearch the value to find two other points such that the resulting grid is still in bounds
        var k = 0;
        for (var i = (1<<30); i; i /= 2) {
            var proposedSecondX = thisPlayer.x+xDir*(k+i);
            var proposedSecondY = thisPlayer.y+yDir*(k+i);
            if (0 <= proposedSecondX && 0 <= proposedSecondY && proposedSecondX < totalHeight && proposedSecondY < totalWidth) {
                k += i;
            }
        }
        var secondX = thisPlayer.x+xDir*k;
        var secondY = thisPlayer.y+yDir*k;
        selectedMatch.processShot(thisPlayer.x, thisPlayer.y, secondX, secondY, thisPlayer);
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});

setInterval(refreshViewAllMatches, 200);
var matches = [];
matches.push(new Match());