const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");

module.exports = function(eleventyConfig) {
    eleventyConfig.addPlugin(eleventyNavigationPlugin);
    eleventyConfig.addWatchTarget("./source/items.yml");
    eleventyConfig.addWatchTarget("./source/types.yml");
};
