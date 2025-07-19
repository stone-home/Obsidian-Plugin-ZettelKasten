import { IRawDataviewScript } from "../types";


export const View: IRawDataviewScript = {
	id: "research-direction-literature-review-view",
	name: "Research Direction Literature Review View",
	description: "A view to display literature reviews organized by research direction.",
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
dv.table(["File", "Creation Date"],
    dv.pages()
        .sort(p => p.file.ctime, 'desc')
        .limit(10)
        .map(p => [p.file.link, p.file.ctime])
);
	`
}
