import { IRawDataviewScript } from "../types";


export const View: IRawDataviewScript = {
	id: "research-topic-papers",
	name: "Research Topic Papers",
	description: "A view to display papers related to a specific research topic.",
	parameters: [
		{
			name: "direction",
			type: "string",
			required: true,
			description: "The research direction to filter topics by."
		}
	],
	script: `
// Recent Notes Table View
// Parameters: days (number, default: 7), limit (number, default: 10)
// Contents of scripts/recent-notes.js
const currentPage =  dv.current()
const topicTag = currentPage.aliases.find(a => a.includes("research/topic"))
const pathParts = dv.current().file.folder.split("/")
const rootFolder = pathParts.slice(0, pathParts.length - 1).join("/")

const pages = dv.pages(\`"\${rootFolder}/literatures" and \${topicTag}\`);


dv.table(
    [
        "Name",
        "Year",
        "Problems",
        "Metrics",
        "Venue",
        "Methods",
        "Features",
    ],
    dv.pages(\`"\${rootFolder}/literatures" and \${topicTag}\`)
        .sort(p => p.file.ctime, 'desc')
        .map(p => {
            const codeExist = p.code? \`[🌐](\${p.code})\`: "";
            const urlPage = p.url ? \`[📜](\${p.url})\` : "";
            const isStarred = p.star ? "⭐" : "";
            const name = p.shortName || 'ShortName Unavailable';
            const year = p.year || '';
            const problems = p.file.etags.filter(tag => tag.startsWith("#research/problem/")).map(tag => \`\${tag.replace("#research/problem/", "")}\`) || ['Undefined'];
            const metrics = p.file.etags.filter(tag => tag.startsWith("#research/metric/")).map(tag => \`\${tag.replace("#research/metric/", "")}\`) || ['Undefined'];
            const venue = p.venue || 'Unknown Venue';
            const methods = p.file.etags.filter(tag => tag.startsWith("#research/method/")).map(tag => \`\${tag.replace("#research/method/", "")}\`) || ['Undefined'];
            const features = p.file.etags.filter(tag => tag.startsWith("#research/feature/")).map(tag => \`\${tag.replace("#research/feature/", "")}\`) || ['Undefined'];
            return [
                \`[[\${p.file.path}|\${name}]] \${isStarred}\${urlPage}\${codeExist}\`,
                year,
                problems,
                metrics,
                venue,
                methods,
                features
            ]
        })
);
	`
}
