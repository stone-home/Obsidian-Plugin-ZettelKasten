import { IRawDataviewScript } from "../types";

export const View: IRawDataviewScript = {
	id: "research-literature-metadata-display",
	name: "The metadata of this paper",
	description: "A view to display the metadata of the current paper.",
	parameters: [
		{
			name: "current",
			type: "boolean",
			required: false,
			description:
				"Whether to display the metadata of the current paper.",
		},
		{
			name: "query",
			type: "string",
			required: false,
			description:
				"Used to filter the papers to be displayed. If not provided, all papers will be displayed.",
		},
		{
			name: "groupEnable",
			type: "boolean",
			required: false,
			description:
				"Group the papers by a specific key, groupKey. If not provided, no grouping will be applied.",
		},
		{
			name: "groupKey",
			type: "string",
			required: false,
			description:
				"The key is used to group the papers. If not provided, no grouping will be applied.",
		},
		{
			name: "isDetailed",
			type: "boolean",
			required: false,
			description:
				"Statistics view will show all papers' links rather than the count of papers. Default is false.",
		},
		{
			name: "statisticOnly",
			type: "boolean",
			required: false,
			description:
				"Whether to only show the statistics view. Default is true.",
		},
	],
	script: `
const current = input.current;
const query = input.query;
const groupEnable = input.groupEnable ?? false;
const groupKey = input.groupKey;
const star = input.star ?? false;
const isDetailed = input.isDetailed ?? false;
const statisticOnly = input.statisticOnly ?? true;

const tagPattern = {
    direction: "#research/direction/",
    topic: "#research/topic/",
    venue: "#research/venue/",
    method: "#research/method/",
    author: "#research/author/",
    paper: "#writing/academic/literatureSummary"
};

//== Utility Functions ==//
const Utils = {
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    convertDateFormat(dateStr) {
        if (!dateStr) return "N/A";
        try {
            const dateObj = new Date(dateStr);
            if (isNaN(dateObj.getTime())) return "N/A";
            return dateObj.getFullYear() + "/" + this.months[dateObj.getMonth()];
        } catch (e) {
            return "N/A";
        }
    }
};

class PaperInfo {
    constructor(pages) {
        this.pages = pages;
    }

    _getTags(page, key) {
        const tagsArray = page.file?.etags ? [...page.file.etags] : [];
        return tagsArray.filter(tag => tag.includes(tagPattern[key]));
    }

    _getTagValue(tag) {
        return tag.split("/").pop();
    }

    getName(page) {
        const name = page.shortName || "✏️"+ page.id;
        const urlLink = page.url ? "[📑](" + page.url + ")" : "";
        const codeLink = page.code ? "[📀](" + page.code + ")" : "";
        return "[[" + page.file.path + "|" + name + "]]" + urlLink + codeLink;
    }

    getYear(page) {
        return Utils.convertDateFormat(page.year);
    }

    getVenue(page) {
        const venue = page.venue;
        if (typeof venue === "object" && venue !== null) {
            const venuePage = dv.page(venue);
            const venueRank = venuePage?.Ranking;
            if (typeof venueRank === 'string') {
                return "(" + venueRank + ")" + venue;
            }
        }
        return venue || this._getTags(page, "venue") || "Unpublished";
    }

    getTopics(page) {
        return this._getTags(page, "topic").map(tag => "🗯️" + this._getTagValue(tag));
    }

    getDirections(page) {
        return this._getTags(page, "direction").map(tag => {
            const parts = tag.split('/');
            return "🗺️" + parts[parts.length - 1];
        });
    }

    getMethods(page) {
        return this._getTags(page, "method").map(this._getTagValue).join(", ");
    }

    _getAuthorNames(page) {
        return this._getTags(page, "author").map(tag => this._getTagValue(tag));
    }

    _generateStatsDataObject(page) {
        const viewObj = {};
        // Get all necessary tags once to avoid redundant calls
        const authorTags = this._getTags(page, "author");
        const directionTags = this._getTags(page, "direction");
        const topicTags = this._getTags(page, "topic");


        // 1. Add author-related statistics
        if (authorTags.length > 0) {
            const firstAuthorTag = authorTags[0];
            const firstAuthorName = this._getTagValue(firstAuthorTag);
            viewObj["📑 " + firstAuthorName + " (1st)"] = () => dv.pages(firstAuthorTag + " and " + tagPattern.paper);

            if (authorTags.length > 1) {
                const lastAuthorTag = authorTags[authorTags.length - 1];
                const lastAuthorName = this._getTagValue(lastAuthorTag);
                viewObj["📑 " + lastAuthorName + " (last)"] = () => dv.pages(lastAuthorTag + " and " + tagPattern.paper);
            }
        }

        for (const [index, tag] of topicTags.entries()) {
            let objective = this._getTagValue(tag);
            let query = tag + " and " + tagPattern.paper;
            if (directionTags.length > 0) {
                query += " and (" + directionTags.join(" or ") + ")";
            }
            viewObj["🗯️ " + objective] = () => dv.pages(query);
            if (index > 2) {
                break
            }
        }

        return viewObj;
    }

    getStandardViewConfig() {
        return {
            "Name": this.getName,
            "Dir": this.getDirections,
            "Year": this.getYear,
            "Venue": this.getVenue,
            "Topic": this.getTopics,
            "Methods": this.getMethods,
        };
    }

    generateStandardViewData() {
        const viewConfig = this.getStandardViewConfig();
        const headers = Object.keys(viewConfig);

        let processedPages = this.pages.map(page => {
            const row = {};
            for (const header of headers) {
                row[header] = viewConfig[header].call(this, page);
            }
            row._sortKey = page.year ? new Date(page.year) : new Date(0);
            return row;
        });

        processedPages.sort((a, b) => b._sortKey - a._sortKey);

        const contents = processedPages.map(p => headers.map(h => p[h]));
        return [headers, contents, processedPages];
    }

    generateStatsViewData(isDetailed) {
        if (this.pages.length !== 1) return [[], []];

        const page = this.pages[0];
        const statsConfig = this._generateStatsDataObject(page);
        const headers = Object.keys(statsConfig);

        const contents = [headers.map(header => {
            const pages = statsConfig[header]();
            if (isDetailed) {
                return pages.map(p => p.file.link).join(", ");
            }
            return pages.length;
        })];

        return [headers, contents];
    }
}


class DataviewDisplay {
    display(headers, contents, { doGroup = false, groupKey = "Catalog", processedPages = [] }) {
        if (headers.length === 0) return;

        if (!doGroup) {
            dv.table(headers, contents);
            return;
        }

        const groupedData = {};
        const groupKeyIndex = headers.indexOf(groupKey);
        if (groupKeyIndex === -1) {
            dv.table(headers, contents);
            return;
        }

        processedPages.forEach(page => {
            const groupValues = Array.isArray(page[groupKey]) ? page[groupKey] : [page[groupKey]];
            const rowContent = headers.map(h => page[h]);

            if (groupValues.length === 0 || !groupValues[0]) {
                groupedData["(uncategorized)"] = groupedData["(uncategorized)"] || [];
                groupedData["(uncategorized)"].push(rowContent);
            } else {
                groupValues.forEach(key => {
                    groupedData[key] = groupedData[key] || [];
                    groupedData[key].push(rowContent);
                });
            }
        });

        Object.keys(groupedData).sort().forEach(groupName => {
            dv.header(3, groupName);
            dv.table(headers, groupedData[groupName]);
        });
    }
}

//== Main Execution ==//

let papers = current ? [dv.current()] : dv.pages(query);

if (star) {
    papers = papers.filter(p => p.star === true);
}

const paperInfo = new PaperInfo(papers);
const display = new DataviewDisplay();

// The statistics view is only shown for the current page.
if (current) {
    const [statHeaders, statContents] = paperInfo.generateStatsViewData(isDetailed);
    display.display(statHeaders, statContents, {});
}

if (!statisticOnly) {
    // In standard view, we always show the literature list.
    const [stdHeaders, stdContents, processedPages] = paperInfo.generateStandardViewData();
    display.display(stdHeaders, stdContents, {
        doGroup: groupEnable,
        groupKey: groupKey,
        processedPages: processedPages
    });
}
	`,
};
