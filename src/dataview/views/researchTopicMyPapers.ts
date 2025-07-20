import { IRawDataviewScript } from "../types";


export const View: IRawDataviewScript = {
	id: "research-topic-my-papers",
	name: "My Papers by Research Topic",
	description: "A view to display my papers organized by research topic.",
	parameters: [
		{
			name: "direction",
			type: "string",
			required: true,
			description: "The research direction to filter topics by."
		}
	],
	script: `
const currentPage =  dv.current()
const directionTag = currentPage.aliases.find(a => a.includes("research/direction"))
const pathParts = dv.current().file.folder.split("/")
const rootFolder = pathParts.slice(0, pathParts.length - 1).join("/")

let tags = "#✍️writing/academic/literatureReview"
let papers = dv.pages(\`"\${rootFolder}" and \${tags} and #🗂️project/PhD\`)

let titles = ["Research Problem", "ID", "Status", "Raised By"]
let contents = []

papers.forEach(page => {
    let literature = page.file.inlinks.filter(inlink => dv.page(inlink).file.etags.includes(tags))
    let title = [
        \`[[\${page.file.path}|\${page.shortName}]]\`,
        page.id,
        page?.status,
        literature,
    ]
    contents.push(title)
})

dv.table(
    titles,
    contents
)
	`
}
