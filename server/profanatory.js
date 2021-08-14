function isProfanatory(text) {
    var words = text.split(/,| |-|\|_|;|'|"|+|-|=|!|@|#|$|%|^|&|*|(|)|/);
    return false;
}

module.exports = {
    isProfanatory
};