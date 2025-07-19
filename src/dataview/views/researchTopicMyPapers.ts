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
