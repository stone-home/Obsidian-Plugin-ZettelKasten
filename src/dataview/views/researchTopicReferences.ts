import { IRawDataviewScript } from "../types";


export const View: IRawDataviewScript = {
	id: "research-topic-references",
	name: "Research Topic References",
	description: "A view to display references related to a specific research topic.",
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


const papers = dv.pages(\`"\${rootFolder}/references"\`).filter(page => page.file.etags.some(tag => tag.includes(topicTag)))

dv.table(
    ["Description", "Year", "Source"],
    papers.map(paper => [
        paper.DisplayName,
        paper.year,
        \`[[\${paper.file.path}|View]]\`
    ])
)
	`
}
