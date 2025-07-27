import { IRawDataviewScript } from "../types";

export const View: IRawDataviewScript = {
	id: "research-synthesis-matrix",
	name: "Research Synthesis Matrix for Literature Reviews",
	description: "A useful tool, Synthesis Martix, to organize and synthesize literature reviews in Obsidian.",
	parameters: [
		{
			name: "topic",
			type: "string",
			required: true,
			description: "The topic of the literature review.",
		},
		{
			name: "tags",
			type: "array",
			required: false,
			description: " The tags to filter the literature.",
		},
	],
	script: `
const currentPage =  dv.current()
const topicTag = currentPage.aliases.find(a => a.includes("research/topic"))
const pathParts = dv.current().file.folder.split("/")
const rootFolder = pathParts.slice(0, pathParts.length - 1).join("/")

const pages = dv.pages(\`"\${rootFolder}/literatures" and \${topicTag}\`);


dv.table(
    [
        "Name",
        "Problems",
        "Methods",
        "Topic",
        "Position",
        "Contribution"
    ],
    dv.pages(\`"\${rootFolder}/literatures" and \${topicTag}\`)
        .sort(p => p.file.ctime, 'desc')
        .map(p => {
            console.error(p)
            const codeExist = p.code? \`[🌐](\${p.code})\`: "";
            const urlPage = p.url ? \`[📜](\${p.url})\` : "";
            const isStarred = p.star ? "⭐" : "";
            const name = p.shortName || 'ShortName Unavailable';
            const year = p.year.year || '';
            const problems = p.file.etags.filter(tag => tag.startsWith("#research/problem/")).map(tag => \`\${tag.replace("#research/problem/", "")}\`) || ['Undefined'];
            const methods = p.file.etags.filter(tag => tag.startsWith("#research/method/")).map(tag => \`\${tag.replace("#research/method/", "")}\`) || ['Undefined'];
            return [
                \`[[\${p.file.path}|\${name}(\${year})]] \${isStarred}\${urlPage}\${codeExist}\`,
                problems,
                methods,
                p.topic ?? 'Undefined',
                p.position ?? 'Undefined',
                p.contributions ?? 'Undefined'
            ]
        })
);
\t
	`,
};
