import { IRawDataviewScript } from "../types";

export const View: IRawDataviewScript = {
	id: "note-index",
	name: "Group Card Index",
	description: "A dataview to dirsplay a list of group cards.",
	updateDate: "2025-07-20",
	parameters: [],
	script: `
const folderPath = dv.current().file.folder;
dv.table(
    ["name", "category"],
    dv.pages(\`"\${folderPath}"\`)
        .where(p => p.file.path !== dv.current().file.path)
        .map(p => [\`[[\${p.file.path}|📍 \${p.title || p.file.name}]]\`, p.category])
);
	`,
};
