import { IRawDataviewScript } from "../types";

export const View: IRawDataviewScript = {
	id: "research-gantt-chart-view",
	name: "Project Gantt Chart",
	description:
		"A view to display entire projects' timelines and tasks in a Gantt chart format.",
	parameters: [
		{
			name: "dirPath",
			type: "string",
			required: true,
			description:
				"The directory path to the project files, which you want to visualize in the Gantt chart.",
		},
		{
			name: "name",
			type: "string",
			required: true,
			description:
				"Name of the Gantt Chart, which will be displayed as the title of the chart.",
		},
	],
	script: `
const fs = require("fs");
const path = require("path");

// Configuration
const CONFIG = { MAX_RETRIES: 50, TAB: "    ", DEFAULT_DURATION: "1d" };

// Utility functions
const formatDate = (date) => {
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return null;
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return year + "-" + month + "-" + day;
    } catch { return null; }
};

const getPageId = (page) => {
    try {
        if (!page || !page.id) throw new Error('Invalid page');
        const id = page.id.toString();
        if (!id) throw new Error('Invalid ID format');
        return id;
    } catch (error) {
        console.error("Page ID error: " + error.message);
        throw error;
    }
};

const sanitize = (str) => {
    if (!str) return 'Untitled';
    return str
        .replace(/[:\\[\\](){}\\/\\\\|"'~!@#%^&*+=<>?.,;-]/g, '_') // Replace special chars with underscore
        .replace(/\\s+/g, '_') // Replace spaces with underscore
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .replace(/^_|_$/g, '') // Remove leading/trailing underscores
        .substring(0, 50) || 'Untitled'; // Limit length
};

// Main generator class
class GanttGenerator {
    constructor() {
        this.sections = {};
        this.keyList = [];
        this.dirPath = input && input.dirPath ? input.dirPath : this.getDefaultPath();
        this.ganttName = sanitize(input && input.name ? input.name : "Project Timeline");
        console.log("Generating: " + this.ganttName + " from " + this.dirPath);
    }

    getDefaultPath() {
        try {
            return path.join(dv.current().file.folder, "objectives");
        } catch {
            return "objectives";
        }
    }

    getValidPages() {
        try {
            const pages = dv.pages('"' + this.dirPath + '"');
            if (!pages || !pages.length) {
                console.warn("No pages found in: " + this.dirPath);
                return [];
            }
            return Array.from(pages).filter(page => {
                try {
                    getPageId(page);
                    return true;
                } catch {
                    const fileName = page.file && page.file.name ? page.file.name : 'unknown';
                    console.warn("Skipping invalid page: " + fileName);
                    return false;
                }
            });
        } catch (error) {
            console.error("Failed to get pages: " + error.message);
            return [];
        }
    }

    createMermaidString(page, start, end) {
        const title = sanitize(page.shortName || (page.file && page.file.name ? page.file.name : 'Untitled'));
        const id = getPageId(page).replace(/[^a-zA-Z0-9_]/g, '_'); // Sanitize ID too
        const status = page.Active ? 'active,' : page.Done ? 'done,' : '';
        const startStr = start ? start + ", " : '';
        return CONFIG.TAB + CONFIG.TAB + title + " : " + status + id + ", " + startStr + end;
    }

    addToSection(page, start, end) {
        try {
            let sectionName = page.Section || "Default";

            // Handle article-based sections
            if (page.articles) {
                try {
                    const article = dv.page(page.articles);
                    if (article && article.shortName) sectionName = article.shortName;
                } catch {}
            }

            sectionName = sanitize(sectionName);

            if (!this.sections[sectionName]) this.sections[sectionName] = [];

            const pageId = getPageId(page);
            const mermaidStr = this.createMermaidString(page, start, end);

            this.keyList.push(pageId);
            this.sections[sectionName].push(mermaidStr);

            const displayName = page.shortName || pageId;
            console.log("Added: " + displayName + " to " + sectionName);
        } catch (error) {
            console.error("Failed to add page to section: " + error.message);
        }
    }

    validateDependencies(page) {
        if (!page.Dependencies || !page.Dependencies.length) return { valid: true, deps: [] };

        const resolved = [];
        let allValid = true;

        for (const dep of page.Dependencies) {
            try {
                const depPage = dv.page(dep);
                if (!depPage) throw new Error("Not found: " + dep);
                resolved.push(getPageId(depPage));
            } catch (error) {
                const pageId = getPageId(page);
                console.warn("Invalid dependency " + dep + " for " + pageId + ": " + error.message);
                allValid = false;
            }
        }

        return { valid: allValid, deps: resolved };
    }

    getPageTiming(page, deps = []) {
        let end = CONFIG.DEFAULT_DURATION;
        if (page.Length && !isNaN(page.Length)) {
            end = page.Length + "d";
        } else if (page.EndDate) {
            const formatted = formatDate(page.EndDate);
            if (formatted) end = formatted;
        }

        let start;
        if (deps.length > 0) {
            start = "after " + deps.join(" ");
        } else if (page.StartDate) {
            start = formatDate(page.StartDate);
        }

        return { start, end };
    }

    processIndependentPages(pages) {
        console.log("Processing " + pages.length + " independent pages");
        pages.forEach(page => {
            try {
                const timing = this.getPageTiming(page);
                this.addToSection(page, timing.start, timing.end);
            } catch (error) {
                const name = page.shortName || 'unknown';
                console.error("Failed to process " + name + ": " + error.message);
            }
        });
    }

    processDependentPages(pages) {
        console.log("Processing " + pages.length + " dependent pages");
        let remaining = pages.slice(); // Create copy
        let retries = 0;

        while (remaining.length > 0 && retries < CONFIG.MAX_RETRIES) {
            const unprocessed = [];
            let processed = 0;
            retries++;

            remaining.forEach(page => {
                try {
                    const validation = this.validateDependencies(page);
                    const canProcess = validation.deps.every(dep => this.keyList.includes(dep));

                    if (canProcess) {
                        const timing = this.getPageTiming(page, validation.deps);
                        this.addToSection(page, timing.start, timing.end);
                        processed++;
                    } else {
                        unprocessed.push(page);
                    }
                } catch (error) {
                    const name = page.shortName || 'unknown';
                    console.error("Error processing " + name + ": " + error.message);
                }
            });

            if (processed === 0 && unprocessed.length > 0) {
                console.error("Circular dependencies detected. " + unprocessed.length + " pages unprocessed");
                unprocessed.forEach(p => {
                    const name = p.shortName || 'unknown';
                    console.error("- Unprocessed: " + name);
                });
                break;
            }

            remaining = unprocessed;
        }
    }

    generateMermaid() {
        if (Object.keys(this.sections).length === 0) {
            return "\`\`\`mermaid\\ngantt\\n    title No Data Available\\n\`\`\`";
        }

        let mermaid = "gantt\\n" + CONFIG.TAB + "title " + this.ganttName + "\\n" + CONFIG.TAB + "dateFormat YYYY-MM-DD\\n";

        Object.keys(this.sections).sort().forEach(section => {
            mermaid += CONFIG.TAB + "section " + section + "\\n" + this.sections[section].join("\\n") + "\\n";
        });

        return "\`\`\`mermaid\\n" + mermaid + "\`\`\`";
    }

    generateTables() {
        const activeTable = "\`\`\`dataview\\nTABLE section, new as Active\\nFROM \\"" + this.dirPath + "\\"\\nWHERE new = true\\nSORT section\\n\`\`\`";
        const doneTable = "\`\`\`dataview\\nTABLE section, new as Active\\nFROM \\"" + this.dirPath + "\\"\\nWHERE new = false\\nSORT section\\n\`\`\`";
        return { activeTable: activeTable, doneTable: doneTable };
    }

    execute() {
        try {
            // Validate environment
            if (typeof dv === 'undefined') {
                throw new Error('Dataview not available');
            }

            const pages = this.getValidPages();
            if (!pages.length) {
                dv.paragraph("No Activities Found.");
                return;
            }

            // Separate pages by dependencies
            const independent = [];
            const dependent = [];

            pages.forEach(page => {
                const validation = this.validateDependencies(page);
                if (validation.deps.length > 0 && validation.valid) {
                    dependent.push(page);
                } else {
                    independent.push(page);
                }
            });

            // Process pages
            this.processIndependentPages(independent);
            this.processDependentPages(dependent);

            // Generate output
            const mermaidDiagram = this.generateMermaid();
            const tables = this.generateTables();

            console.log(mermaidDiagram);
            dv.paragraph(mermaidDiagram);
            dv.paragraph(tables.activeTable);
            dv.paragraph(tables.doneTable);

            const sectionsCount = Object.keys(this.sections).length;
            console.log("Completed: " + this.keyList.length + " pages, " + sectionsCount + " sections");

        } catch (error) {
            console.error("Fatal error: " + error.message);
            dv.paragraph("**Error**: " + error.message);
        }
    }
}

// Execute
try {
    if (typeof dv !== 'undefined') {
        new GanttGenerator().execute();
    } else {
        console.error('Dataview not available');
    }
} catch (error) {
    console.error("Initialization failed: " + error.message);
}
	`,
};
