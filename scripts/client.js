var socket = io();
var state = 0;
function setState1()
socket.on("viewUpdate", (arg) => {

});
function startGameButtonPressed() {
    socket.emit("player_name_set", document.getElementById("playerNameInput"));
    socket.emit("game_start_button_pressed");
    setState1();
}
document.getElementById("startGameButton").onclick = function () { startGameButtonPressed() };