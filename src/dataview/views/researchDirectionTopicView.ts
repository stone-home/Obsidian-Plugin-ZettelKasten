import { IRawDataviewScript } from "../types";

export const View: IRawDataviewScript = {
	id: "research-direction-topic-view",
	name: "Research Direction Topic View",
	description: "A view to display topics organized by research direction.",
	parameters: [
		{
			name: "direction",
			type: "string",
			required: true,
			description: "The research direction to filter topics by.",
		},
	],
	script: `
// Recent Notes Table View
// Parameters: days (number, default: 7), limit (number, default: 10)
// Contents of scripts/recent-notes.js
const currentPage =  dv.current()
const directionTag = currentPage.aliases.find(a => a.includes("research/direction"))
const pathParts = dv.current().file.folder.split("/")
const rootFolder = pathParts.slice(0, pathParts.length - 1).join("/")


const pages = dv.pages(directionTag)
const titles = [
    "Topic",
    "Problem",
    "Metrics",
]

const allTags = []
pages.forEach(page => allTags.push(...page.file.etags))
const uniqueTags = [...new Set(allTags)]
const content = uniqueTags.filter(tag => tag.startsWith("#research/topic/")).map(tag => {
    const topicPage = dv.pages(\`"\${rootFolder}/topics" and \${tag}\`).filter(page => page.aliases.some(a => a.includes(tag))) || []
    const tageDisplayName = topicPage.length >= 1? \`[[\${topicPage[0].file.path}|\${tag.replace("#research/topic/", "")}]]\` : tag.replace("#research/topic/", "")

    const topicPages = dv.pages(tag)
    const allTopicPagesTags = []
    topicPages.forEach(page => allTopicPagesTags.push(...page.file.etags))
    const uniqueTopicPagesTags = [...new Set(allTopicPagesTags)]
    const allProblems = uniqueTopicPagesTags.filter(t => t.startsWith("#research/problem/")).map(tag => tag.replace("#research/problem/", ""))
    const allMetrics = uniqueTopicPagesTags.filter(t => t.startsWith("#research/metric/")).map(tag => tag.replace("#research/metric/", ""))
    return [
        tageDisplayName,
        allProblems,
        allMetrics,
    ]
})


dv.table(
    titles,
    content
)
	`,
};
