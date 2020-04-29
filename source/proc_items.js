// B"H.
const util = require("util");
const fs = require("fs");
const path = require("path");

const jq = require("node-jq");
const js_yaml = require("js-yaml");
const ajv = require("ajv");

function validate_schema({schema, data}={}) {
    const ajv_obj = ajv();
    const validate = ajv_obj.compile(schema);
    const valid = validate(data);
    return {ajv: ajv_obj, valid, validate};
}

async function proc_items({items_file_path, types_file_path, items_schema_file_path}={}) {
    const proc_items_code = await util.promisify(fs.readFile)(path.join(__dirname, "proc_items_code.jq"), "utf8");
    const items_inp_str = JSON.stringify(js_yaml.safeLoad(await util.promisify(fs.readFile)(items_file_path)));
    const types_inp_str = JSON.stringify(js_yaml.safeLoad(await util.promisify(fs.readFile)(types_file_path)));
    const items_schema = JSON.parse(await util.promisify(fs.readFile)(items_schema_file_path));
    const proced_items_str = await jq.run(proc_items_code, [items_inp_str, types_inp_str].join(""), {input: "string", output: "compact", slurp: true});
    const out_json = JSON.parse(proced_items_str);
    const items_validation_result = validate_schema({schema: items_schema, data: out_json["dict"]});
    if (!items_validation_result.valid) {
        throw new Error(`items.json validation error(s): ${JSON.stringify(items_validation_result.validate.errors, null, 2)}`);
        //console.error(items_validation_result.validate.errors);
    };
    return out_json;
}

if (require.main === module) {
    const process = require("process");

    (async () => {
        process.stdout.write(JSON.stringify(await proc_items({items_file_path: "items.yml", types_file_path: "types.yml", items_schema_file_path: "items.schema.json"})));
    })();
};

module.exports = async function(opts={}) {
    return await proc_items(opts);
};
