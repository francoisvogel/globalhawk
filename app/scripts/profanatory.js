require('dotenv').config();
const fs = require('fs');
const path = require('path');

// returns levenshtein distance between strings a and b
const levenshteinDistance = (str1 = '', str2 = '') => {
    const dp = Array(str2.length + 1).fill(null).map(() =>
        Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i += 1) {
        dp[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
        dp[j][0] = j;
    }
    for (let j = 1; j <= str2.length; j += 1) {
        for (let i = 1; i <= str1.length; i += 1) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            dp[j][i] = Math.min(
                dp[j][i - 1] + 1, // deletion
                dp[j - 1][i] + 1, // insertion
                dp[j - 1][i - 1] + indicator, // substitution
            );
        }
    }
    return dp[str2.length][str1.length];
};

function isProfanatory(text) {
    var words = text.split(/_| |-/);
    var dictWords = fs.readFileSync(path.join(__dirname, '/../../', process.env.DB, 'profanatoryDictionary.txt'), 'utf-8').split('\n');
    var profanatory = false;
    words.forEach(function (i) {
        if (!i.length || i.length >= 20) return;
        dictWords.forEach(function (j) {
            if (levenshteinDistance(i, j) <= 0) {
                profanatory = true;
                return;
            }
        });
        if (profanatory) return;
    });
    return profanatory;
}

module.exports = {
    isProfanatory
};