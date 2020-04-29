// B"H.
const util = require("util");
const fs = require("fs");

const js_yaml = require("js-yaml");

module.exports = async function() {
    return js_yaml.safeLoad(await util.promisify(fs.readFile)("source/types.yml"));
};
