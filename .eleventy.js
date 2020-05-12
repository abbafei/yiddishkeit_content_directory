const pluginNavigation = require("@11ty/eleventy-navigation");
const pluginFeed = require("@11ty/eleventy-plugin-rss");

module.exports = function(eleventyConfig) {
    // plugins
    eleventyConfig.addPlugin(pluginNavigation);
    eleventyConfig.addPlugin(pluginFeed);

    // processing
    eleventyConfig.addWatchTarget("./source/items.yml");
    eleventyConfig.addWatchTarget("./source/types.yml");
    eleventyConfig.setFrontMatterParsingOptions({
        excerpt: true
    });

    // content
    eleventyConfig.addCollection("blog", function(collection) {
        return collection.getFilteredByGlob("blog/post/*");
    });
    eleventyConfig.addFilter("as_post_date", function(date_obj) {
        return date_obj.toLocaleDateString("default", {calendar: "hebrew", timeZone: "utc", weekday: "long", year: "2-digit", month: "numeric", day: "numeric"});
    });
};
