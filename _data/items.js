// B"H.
const proc_items = require("../source/proc_items");

const source_dir_path = "source";

module.exports = async function() {
    return await proc_items({prefix_path: source_dir_path});
};
