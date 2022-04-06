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
    eleventyConfig.addFilter("as_post_date", function(date_obj) {
        return date_obj.toLocaleDateString("default", {calendar: "hebrew", timeZone: "utc", weekday: "long", year: "numeric", month: "numeric", day: "numeric"});
    });
    eleventyConfig.addFilter("select_zachin", function(zachin, select_type, selecting) {
		if (['target_audience', 'container_type'].includes(select_type)) {
			return zachin.filter(zach => {
				if (zach.hasOwnProperty(select_type)) {
					const zach_key_data = zach[select_type];
					if (Array.isArray(zach_key_data)) {
						if (Array.isArray(selecting)) {
							return selecting.some(select_item => zach_key_data.includes(select_item));
						} else if (typeof selecting === 'string') {
							return zach_key_data.includes(selecting);
						} else {
							return false;
						};
					} else if (typeof(zach_key_data) === "string") {
						if (Array.isArray(selecting)) {
							return selecting.includes(zach_key_data);
						} else if (typeof selecting === 'string') {
							return zach_key_data === selecting;
						} else {
							return false;
						};
					} else {
						return false;
					}
				} else {
					return false;
				};
			});
		};
    });
};
