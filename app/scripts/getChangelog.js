const fs = require('fs');

function get() {
    const jsonString = fs.readFileSync(process.env.DB+'/changelog.json');
    return jsonString.toString();
}

module.exports = {
    get
}