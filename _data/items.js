// B"H.
const proc_items = require("../source/proc_items");

module.exports = async function() {
    return await proc_items({items_file_path: "source/items.yml", types_file_path: "source/types.yml", items_schema_file_path: "source/items.schema.json"});
};
