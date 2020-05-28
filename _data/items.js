// B"H.
const proc_items = require("../source/proc_items");

const source_dir_path = "source/";

module.exports = async function() {
    return await proc_items({items_file_path: `${source_dir_path}items.yml`, types_file_path: `${source_dir_path}types.yml`, items_schema_file_path: `${source_dir_path}items.schema.json`, types_schema_file_path: `${source_dir_path}types.schema.json`});
};
