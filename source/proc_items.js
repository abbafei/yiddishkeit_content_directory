// B"H.
const util = require("util");
const fs = require("fs");
const path = require("path");

const jq = require("node-jq");
const js_yaml = require("js-yaml");
const ajv = require("ajv");
const fast_json_patch = require("fast-json-patch");

function make_schema_patch({types_info, item_ids, definitions_schema}) {
    return Object.keys(definitions_schema.$defs.types.$defs).map(type_name =>
        ({op: "add", path: `/$defs/types/$defs/${type_name}/enum`, value: Object.keys(types_info[type_name])})
    ).concat(
        [{op: "add", path: "/$defs/item_identifier/enum", value: item_ids}]
    );
}

function validate_schema({verifier_obj, schema, validating_name, data}={}) {
	const input_schema = (schema === undefined ? validating_name : schema);
    const valid = verifier_obj.validate(input_schema, data);
    if (!valid) {
        throw new Error(`${validating_name} validation error(s): ${JSON.stringify(verifier_obj.errors, null, 2)}`);
    } else {
        return {verifier_obj, valid};
    };
}

async function proc_items({prefix_path=""}={}) {
	const schemas_path = "schemas";
	const definitions_name = "definitions";
	const items_name = "items";
	const types_name = "types";
	const schemaid_prefix = "https://yiddishkeit.info/schemas/";

    // load data
    const proc_items_code = await util.promisify(fs.readFile)(path.join(__dirname, "proc_items_code.jq"), "utf8");
    const items_inp = js_yaml.safeLoad(await util.promisify(fs.readFile)(path.join(prefix_path, `${items_name}.yml`)));
    const items_inp_str = JSON.stringify(items_inp);
    const types_info = js_yaml.safeLoad(await util.promisify(fs.readFile)(path.join(prefix_path, `${types_name}.yml`)));
    const types_info_str = JSON.stringify(types_info);
	const definitions_schema_inp = JSON.parse(await util.promisify(fs.readFile)(path.join(prefix_path, schemas_path, `${definitions_name}.json`)));
    const items_schema = JSON.parse(await util.promisify(fs.readFile)(path.join(prefix_path, schemas_path, `${items_name}.json`)));
    const types_schema = JSON.parse(await util.promisify(fs.readFile)(path.join(prefix_path, schemas_path, `${types_name}.json`)));

    // process input item info
    const items_out_str = await jq.run(proc_items_code, [items_inp_str, types_info_str].join(""), {input: "string", output: "compact", slurp: true});
    const items_out = JSON.parse(items_out_str);

    // patch type values into definitions schema object
    const schema_type_values_patch = make_schema_patch({item_ids: Object.keys(items_inp), types_info, definitions_schema: definitions_schema_inp});
    const definitions_schema_out = fast_json_patch.applyPatch(definitions_schema_inp, schema_type_values_patch).newDocument;

    // validate output item info
	const schemas = [definitions_schema_out, items_schema, types_schema];
	const verifier_obj = ajv({schemas});
    validate_schema({verifier_obj, validating_name: `${schemaid_prefix}${types_name}.json`, data: types_info});
    validate_schema({verifier_obj, validating_name: `${schemaid_prefix}${items_name}.json`, data: items_out["dict"]});

    return items_out;
}

if (require.main === module) {
    const process = require("process");

    (async () => {
        process.stdout.write(JSON.stringify(await proc_items({})));
    })();
};

module.exports = async function(opts={}) {
    return await proc_items(opts);
};
