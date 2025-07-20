import { IRawDataviewScript } from "../types";


export const View: IRawDataviewScript = {
	id: "research-gantt-chart-view",
	name: "Project Gantt Chart",
	description: "A view to display entire projects' timelines and tasks in a Gantt chart format.",
	parameters: [
		{
			name: "direction",
			type: "string",
			required: true,
			description: "The research direction to filter topics by."
		}
	],
	script: `

const fs = require("fs");
const path = require("path");

let dirPath = input.dirPath;
let ganttName = input.name;
let pages = dv.pages(\`"\${dirPath}"\`);
let sections = {};
let itemsWithoutDependencies = [];
let itemsWithDependencies = [];
let keyList = [];
let tabSpace = "    ";

function getDate(date) {
    let d = new Date(date);
    return \`\${d.getFullYear()}-\${(d.getMonth() + 1).toString().padStart(2, '0')}-\${d.getDate().toString().padStart(2, '0')}\`;
}

function getID(page) {
    return page.id.toString().split(".")[1];
}

function createMermaidStr(page, start, end) {
    let title = page.shortName;
    let id = getID(page);
    let stats = page.Active ? "active" : page.Done ? "done" : undefined;
    let mermaidStr = \`\${tabSpace}\${tabSpace}\${title}: \`;
    if (stats) {
        mermaidStr += \`\${stats},\`;
    }
    mermaidStr += \`\${id}, \${start}, \${end}\`;
    return mermaidStr;
}

function addToSection(page, start, end) {
    let section = page.Section || "Default";
    if (page.articles !== undefined) {
        let article = dv.page(page.articles);
        section = article.shortName || section
    }
    let mermaidStr = createMermaidStr(page, start, end);

    if (!sections[section]) {
        sections[section] = [];
    }

    keyList.push(getID(page));
    sections[section].push(mermaidStr);
}

if (pages && pages.length > 0) {
    pages.forEach(page => {
        if (page.Dependencies && page.Dependencies.length > 0) {
            let dependenciesCheck = true
            page.Dependencies.map(dep => {
                try {
                    getID(dv.page(dep))
                } catch (error) {
                    dependenciesCheck = false
                    console.error(\`Page's (\${page.id}) dependency not exist\`)
                    console.error(\`\${dep} dropped\`)
                }
            });
            if (dependenciesCheck === true){
                itemsWithDependencies.push(page);
            }
        } else {
            itemsWithoutDependencies.push(page);
        }
    });

    itemsWithoutDependencies.forEach(page => {
        let end = page.Length ? \`\${page.Length}d\` : page.EndDate ? getDate(page.EndDate) : "1d";
        let start = page.StartDate ? getDate(page.StartDate) : undefined;
        addToSection(page, start, end);
    });

    let retry = 0;
    while (itemsWithDependencies.length > 0 && retry <= 50) {
        let unassignedList = [];
        retry += 1;

        itemsWithDependencies.forEach(page => {
            let dependencies = page.Dependencies.map(dep => getID(dv.page(dep)));
            if (dependencies.every(dep => keyList.includes(dep))) {
                let end = page.Length ? \`\${page.Length}d\` : page.EndDate ? getDate(page.EndDate) : "1d";
                let start = \`after \${dependencies.join(" ")}\`;
                addToSection(page, start, end);
            } else {
                unassignedList.push(page);
            }
        });

        if (unassignedList.length === itemsWithDependencies.length) {
            console.error("Unresolved dependencies, exiting to avoid infinite loop.");
            break;
        }

        itemsWithDependencies = unassignedList;
    }
    let mermaid = \`gantt\\n\${tabSpace}title \${ganttName}\\n\${tabSpace}dateFormat YYYY-MM-DD\`;
    for (let section in sections) {
        mermaid += \`\\n\${tabSpace}section \${section}\\n\${sections[section].join("\n")}\\n\`;
    }
	ganttChart = "\`\`\`mermaid\\n" + mermaid + "\n\`\`\`";
    console.log(mermaid);
    dv.paragraph(mermaid);
    
    let dataviewList = '\`\`\`dataview \nTABLE section, active\nFROM "' + dirPath + '"\nWHERE one = false\nSORT section\n\`\`\`';
    dv.paragraph(dataviewList);
    
    let dataviewDoneList = '\`\`\`dataview \\nTABLE section, active\\nFROM "' + dirPath + '"\\nWHERE done = true\\nSORT section\\n\`\`\`';
    dv.paragraph(dataviewDoneList);
    
} else {
    dv.paragraph("No Activities Found.");
}

	`
}
