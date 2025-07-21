import { IRawDataviewScript } from "../types";


export const View: IRawDataviewScript = {
	id: "research-literature-paper-references",
	name: "Research Literature References",
	description: "A view to display literature references related to the cureent paper.",
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

console.error(pages)
dv.table(
    ["Description", "Note Date"],
    pages.map(p => [
        \`[[\${p.file.name}|📍]]\${p.DisplayName}\`,
        p.year
    ])
)
	`
}
