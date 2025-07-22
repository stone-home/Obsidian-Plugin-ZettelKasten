import { IRawDataviewScript } from "../types";

export const View: IRawDataviewScript = {
	id: "project-reference-manager-view",
	name: "Project Reference Manager",
	description:
		"A view to display literature references related to the cureent paper.",
	parameters: [],
	script: `
const currentPage =  dv.current()
const pathParts = dv.current().file.folder.split("/")
const rootFolder = pathParts.slice(0, pathParts.length - 1).join("/")

const refFolder = '"' + rootFolder + '/' + 'references' + '"'
const pages = dv.pages(refFolder).filter(refPage => {
    if (!currentPage.sources || !refPage.sources) {
        return false;
    }
    return refPage.sources.some(source => currentPage.sources.some(cSource => cSource.path === source.path));
});

const catTags = [
    "#research/background",
    "#research/problem",
    "#research/hypothesis",
    "#research/method",
    "#research/experiment",
    "#vocabulary",
    "#research/personal-points",
    "#research/other"
]

dv.table(
    ["Description", "Cat", "Note Date"],
    pages.map(p => {
        const desc = \`[[\${p.file.name}|📍]]\${p.DisplayName}\`
        const cat = p.file.etags.find(tag => catTags.includes(tag)) || "No Category"
        const pureCatName = cat.split("/").pop()
        return [desc, pureCatName, p.year]
    }).sort(p=> p[1] ? p[1] : "No Date")
)
	`,
};
