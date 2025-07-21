import { IRawDataviewScript } from "../types";

export const View: IRawDataviewScript = {
	id: "research-custom-table-view",
	name: "Project Custom Table",
	description:
		"A view to display entire projects' timelines and tasks in a Gantt chart format.",
	updateDate: "2025-07-20",
	parameters: [
		{
			name: "tags",
			type: "array",
			required: true,
			description:
				"An array of tags to filter the notes by. The notes must have at least one of these tags.",
		},
		{
			name: "property",
			type: "array",
			required: true,
			description:
				"An array of properties to display in the table. Each property should be a string representing a field in the note.",
		},
		{
			name: "header",
			type: "array",
			required: true,
			description:
				"An array of headers for the table. The length of this array should match the length of the property array.",
		},
		{
			name: "inlink",
			type: "boolean",
			required: false,
			description:
				"If true, include notes that link to the current note.",
		},
		{
			name: "outlink",
			type: "boolean",
			required: false,
			description:
				"If true, include notes that the current note links to.",
		},
		{
			name: "query",
			type: "string",
			required: false,
			description:
				"A Dataview query to filter the notes. If not provided, all notes will be included.",
		},
	],
	script: `
	let tagArray = input.tags || []
let property = input.property
let header = input.header
let inlink = input.inlink || false
let outlink = input.outlink || false
let query = input.query? input.query : undefined
let pages = []
let current_note = dv.current()

if (inlink){
    let ins = current_note.file.inlinks.map(inlink => {
        return dv.page(inlink)
    })
    pages.push(...ins)
}
if (outlink){
    let outs = current_note.file.outlinks.map(outlink => {
        return dv.page(outlink)
    })
    pages.push(...outs)
}
if (!inlink && !outlink){
    pages.push(...dv.pages(query))
}
pages = pages.filter(page => {
    return tagArray.every(tag => {
        if (!tag.startsWith("#")) {
            tag = \`#\${tag}\`
        }
        return page.file.etags.includes(tag)
    })
})
let tableList = pages.map(page => {
    let resultList = []
    for(let item of property){
        let s_item = item.split(".")
        let value = page
        for(let field of s_item){
            value = value[field]
        }
        resultList.push(value)
    }
    return resultList
})
dv.table(header, tableList)
	`,
};
