var socket = io();
const generalStatesStyle = 'background-color: white; height: 100%; width: 100%; position:fixed; top: 0;'
var removedGameChildCount; // number of children that have to be removed
var state;

function setScoreBoard() {
    
}

function setState(localState) {
    state = localState;
    switch (state) {
        case 0:
            document.getElementById('home').style = generalStatesStyle+' visibility: visible;';
            document.getElementById('game').style = generalStatesStyle+' visibility: hidden;';
            document.getElementById('scoreBoard').style = generalStatesStyle+' visibility: hidden;';
            break;
        case 1:
            document.getElementById('home').style = generalStatesStyle+' visibility: hidden;';
            document.getElementById('game').style = generalStatesStyle+' visibility: visible;';
            document.getElementById('scoreBoard').style = generalStatesStyle+' visibility: hidden;';
            break;
        case 2:
            document.getElementById('home').style = generalStatesStyle+' visibility: hidden;';
            document.getElementById('game').style = generalStatesStyle+' visibility: hidden;';
            document.getElementById('scoreBoard').style = generalStatesStyle+' visibility: visible;';
            break;
    }
    console.log('state set to '+state);
}

function startGameButtonPressed() {
    socket.emit('game_start_button_pressed');
    socket.emit('player_name_set', document.getElementById('playerNameInput').value);
    setState(1);
}

function keyPressed(e) {
    if (state != 1) return;
    console.log(e.keyCode);
    socket.emit('key_pressed', e.keyCode)
}

function userClicked() {
    var mouseX = event.clientY; // normal that width and height should be inverted (ref. project standards)
    var mouseY = event.clientX;
    var compareX = window.innerHeight/2;
    var compareY = window.innerWidth/2;
    if (mouseX != compareX || mouseY != compareY)  { // to avoid case where coordinates are EXACTLY the same
        // calculate function formed between (mouseX, mouseY) and (compareX, compareY) as f(x) = ax+b, here we return a
        var xDiff = mouseX-compareX;
        var yDiff = mouseY-compareY;
        socket.emit('shot_fired', xDiff, yDiff);
    }
}

function percentageHeightToPixel(x) {
    return (x*window.innerHeight)/100;
}

function percentageWidthToPixel(x) {
    return (x*window.innerWidth)/100;
}

// removes all elements in the game view & update canvas height, width
socket.on('resetGameView', () => {
    removedGameChildCount = document.getElementById('elements').childElementCount;
    // console.log('D');
});

// adds an element to the game view in terms of percentages
socket.on('addElementToGameView', (top, left, targetHeight, targetWidth, source) => {
    // console.log('E');
    var newElement = document.createElement('img');
    newElement.setAttribute('src', '/images/'+source+'.png');
    var proposedHeight = (targetHeight*window.innerHeight)/100;
    var proposedWidth = (targetWidth*window.innerWidth)/100;
    newElement.setAttribute('height', proposedHeight);
    newElement.setAttribute('width', proposedWidth);
    var topOffset = top-targetHeight/2;
    var leftOffset = left-targetWidth/2;
    var styleAssign = 'object-fit:fill; position: absolute; top: '+topOffset+'%; left: '+leftOffset+'%;';
    newElement.style = styleAssign;
    document.getElementById('elements').appendChild(newElement);
});

socket.on('resetGameViewFinished', () => {
    for (var i = 0; i < removedGameChildCount; i++) {
        var firstChild = document.getElementById('elements').firstChild;
        document.getElementById('elements').removeChild(firstChild);
    }
});

socket.on('shotFired', (x1, y1, x2, y2) => {
    var shotCanvas = document.createElement('canvas');
    shotCanvas.id = toString(x1)+toString(y1)+toString(x2)+toString(y2)+toString(Math.random()); // a good hash
    document.getElementById('game').appendChild(shotCanvas);
    x1 = percentageHeightToPixel(x1);
    y1 = percentageWidthToPixel(y1);
    x2 = percentageHeightToPixel(x2);
    y2 = percentageWidthToPixel(y2);
    var alpha = 0;
    var delta = 0.04;
    var line = shotCanvas.getContext('2d');
    var interval = setInterval(display, 1);
    function display() {
        shotCanvas.height = window.innerHeight;
        shotCanvas.width = window.innerWidth;
        alpha += delta;
        if (alpha >= 1) {
            delta *= -1;
            alpha = 1;
        }
        else if (alpha <= 0) {
            clearInterval(interval);
            document.getElementById('game').removeChild(shotCanvas);
            return;
        }
        line.clearRect(x1, y1, x2, y2);
        line.beginPath();
        line.moveTo(y1, x1);
        line.lineTo(y2, x2);
        line.lineWidth = 5;
        line.globalAlpha = alpha;
        line.stroke();
    }
});

socket.on('gameFinishedForPlayer', () => {
    socket.emit('game_finished_for_player');
    setScoreBoard();
    setState(2);
});

socket.on('launchHome', () => {
    setState(0);
});

socket.on('sendUserScreenRatio', () => {
    socket.emit('user_screen_ratio', window.innerWidth/window.innerHeight);
});

document.getElementById('startGameButton').onclick = function () { startGameButtonPressed() };
document.getElementById('game').addEventListener('click', userClicked);
document.onkeypress = keyPressed;