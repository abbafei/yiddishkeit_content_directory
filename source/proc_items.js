// B"H.
const util = require("util");
const fs = require("fs");
const path = require("path");

const jq = require("node-jq");
const js_yaml = require("js-yaml");
const ajv = require("ajv");
const fast_json_patch = require("fast-json-patch");

function make_schema_patch({types_info, item_ids, items_schema}) {
    return Object.keys(items_schema.definitions.types).map(type_name =>
        ({op: "add", path: `/definitions/types/${type_name}/enum`, value: Object.keys(types_info[type_name])})
    ).concat(
        [{op: "add", path: "/definitions/item_identifier/enum", value: item_ids}]
    );
}

function validate_schema({schema, validating_name, data}={}) {
    const ajv_obj = ajv();
    const validate = ajv_obj.compile(schema);
    const valid = validate(data);
    if (!valid) {
        throw new Error(`${validating_name} validation error(s): ${JSON.stringify(validate.errors, null, 2)}`);
    } else {
        return {ajv: ajv_obj, valid, validate};
    };
}

async function proc_items({items_file_path, types_file_path, items_schema_file_path, types_schema_file_path}={}) {
    // load data
    const proc_items_code = await util.promisify(fs.readFile)(path.join(__dirname, "proc_items_code.jq"), "utf8");
    const items_inp = js_yaml.safeLoad(await util.promisify(fs.readFile)(items_file_path));
    const items_inp_str = JSON.stringify(items_inp);
    const types_info = js_yaml.safeLoad(await util.promisify(fs.readFile)(types_file_path));
    const types_info_str = JSON.stringify(types_info);
    const items_schema_inp = JSON.parse(await util.promisify(fs.readFile)(items_schema_file_path));
    const types_schema = JSON.parse(await util.promisify(fs.readFile)(types_schema_file_path));

    // process input item info
    const items_out_str = await jq.run(proc_items_code, [items_inp_str, types_info_str].join(""), {input: "string", output: "compact", slurp: true});
    const items_out = JSON.parse(items_out_str);

    // add type values to items schema
    const schema_type_values_patch = make_schema_patch({item_ids: Object.keys(items_inp), types_info, items_schema: items_schema_inp});
    const items_schema_out = fast_json_patch.applyPatch(items_schema_inp, schema_type_values_patch).newDocument;

    // validate output item info
    validate_schema({schema: items_schema_out, validating_name: "items.json", data: items_out["dict"]});

    return items_out;
}

if (require.main === module) {
    const process = require("process");

    (async () => {
        process.stdout.write(JSON.stringify(await proc_items({items_file_path: "items.yml", types_file_path: "types.yml", items_schema_file_path: "items.schema.json", types_schema_file_path: "types.schema.json"})));
    })();
};

module.exports = async function(opts={}) {
    return await proc_items(opts);
};
