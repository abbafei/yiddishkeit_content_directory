// B"H.
const util = require("util");
const fs = require("fs");
const path = require("path");

const jq = require("node-jq");
const js_yaml = require("js-yaml");

async function proc_items({items_file_path="items.yml", types_file_path="types.yml"}={}) {
    const proc_items_code = await util.promisify(fs.readFile)(path.join(__dirname, "proc_items_code.jq"), "utf8");
    const items_inp_str = JSON.stringify(js_yaml.safeLoad(await util.promisify(fs.readFile)(items_file_path)));
    const types_inp_str = JSON.stringify(js_yaml.safeLoad(await util.promisify(fs.readFile)(types_file_path)));
    const proced_items_str = await jq.run(proc_items_code, [items_inp_str, types_inp_str].join(""), {input: "string", output: "compact", slurp: true});
    return JSON.parse(proced_items_str);
}

if (require.main === module) {
    const process = require("process");

    (async () => {
        process.stdout.write(JSON.stringify(await proc_items()));
    })();
};

module.exports = async function(opts={}) {
    return await proc_items(opts);
};
