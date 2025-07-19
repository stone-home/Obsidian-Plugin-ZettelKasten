import { App, Plugin, TFile } from 'obsidian';
import { ResearchDashboardModal } from './ResearchDashboardModal';
import { SearchDashboardModal } from './SearchDashboardModal';

export class DataViewIntegrationHelper {
	private app: App;
	private plugin: Plugin;
	private scriptsPath: string;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;
		this.scriptsPath = `.obsidian/plugins/${plugin.manifest.id}/dataview-scripts`;
	}

	// Initialize DataView scripts
	async initializeDataViewScripts() {
		const scriptsFolder = this.app.vault.configDir + '/plugins/' + this.plugin.manifest.id + '/dataview-scripts';

		// Ensure the folder exists
		try {
			await this.app.vault.adapter.mkdir(scriptsFolder);
		} catch (error) {
			// Folder might already exist
		}

		// Write your DataView JS files
		const scripts = this.getDataViewScripts();

		for (const [filename, content] of Object.entries(scripts)) {
			const filePath = `${scriptsFolder}/${filename}`;
			await this.app.vault.adapter.write(filePath, content);
		}
	}

	// Get DataView script file paths (for use in dv.view())
	getScriptPath(scriptName: string): string {
		return `${this.scriptsPath}/${scriptName}`;
	}

	// Define your DataView scripts as strings
	private getDataViewScripts(): Record<string, string> {
		return {
			'research-dashboard.js': `
                // Research Dashboard DataView Script
                const { data, query, container } = input || {};
                
                // Create research dashboard view
                const dashboard = container.createDiv('research-dashboard');
                
                // Quick search section
                const quickSearch = dashboard.createDiv('quick-search');
                quickSearch.innerHTML = '<h3>Quick Search</h3>';
                
                const searchButtons = quickSearch.createDiv('search-buttons');
                ['Paper', 'Reference', 'Venue'].forEach(type => {
                    const btn = searchButtons.createEl('button', { text: type });
                    btn.onclick = () => {
                        // Handle search type
                        console.log('Search type:', type);
                    };
                });
                
                // Recent projects section
                const recentProjects = dashboard.createDiv('recent-projects');
                recentProjects.innerHTML = '<h3>Recent Projects</h3>';
                
                // Get recent projects from your data
                const projects = dv.pages('"Projects"').limit(5);
                
                if (projects.length > 0) {
                    const projectList = recentProjects.createEl('ul');
                    projects.forEach(project => {
                        const listItem = projectList.createEl('li');
                        listItem.createEl('a', {
                            text: project.file.name,
                            href: project.file.path
                        });
                    });
                } else {
                    recentProjects.createEl('p', { text: 'No recent projects found' });
                }
                
                // Literature import status
                const literatureStatus = dashboard.createDiv('literature-status');
                literatureStatus.innerHTML = '<h3>Literature Import Status</h3>';
                
                const pendingCount = dv.pages('"Literature" and #pending').length;
                const reviewedCount = dv.pages('"Literature" and #reviewed').length;
                
                literatureStatus.createEl('p', { text: \`Pending: \${pendingCount}\` });
                literatureStatus.createEl('p', { text: \`Reviewed: \${reviewedCount}\` });
            `,

			'search-results.js': `
                // Search Results DataView Script
                const { data, query, container } = input || {};
                
                // Extract search parameters
                const searchQuery = query?.search || '';
                const tagFilter = query?.tags || '';
                
                // Create search results view
                const resultsContainer = container.createDiv('search-results');
                
                // Search header
                const header = resultsContainer.createDiv('search-header');
                if (searchQuery) {
                    header.createEl('h3', { text: \`Search Results for: "\${searchQuery}"\` });
                } else {
                    header.createEl('h3', { text: 'All Results' });
                }
                
                // Build search criteria
                let searchCriteria = '';
                if (searchQuery) {
                    searchCriteria += \`"*\${searchQuery}*"\`;
                }
                if (tagFilter) {
                    searchCriteria += searchCriteria ? \` and \${tagFilter}\` : tagFilter;
                }
                
                // Get matching pages
                const results = searchCriteria ? dv.pages(searchCriteria) : dv.pages();
                
                if (results.length > 0) {
                    const resultsList = resultsContainer.createEl('div', { cls: 'results-list' });
                    
                    results.forEach(result => {
                        const resultItem = resultsList.createDiv('result-item');
                        
                        // Title
                        const title = resultItem.createEl('h4');
                        title.createEl('a', {
                            text: result.file.name,
                            href: result.file.path
                        });
                        
                        // Tags
                        if (result.tags && result.tags.length > 0) {
                            const tagsDiv = resultItem.createDiv('tags');
                            result.tags.forEach(tag => {
                                tagsDiv.createEl('span', { 
                                    text: tag,
                                    cls: 'tag'
                                });
                            });
                        }
                        
                        // Modified date
                        const modifiedDate = resultItem.createEl('p', { 
                            text: \`Modified: \${result.file.mtime.toDateString()}\`,
                            cls: 'modified-date'
                        });
                    });
                } else {
                    resultsContainer.createEl('p', { 
                        text: 'No results found matching your criteria.',
                        cls: 'no-results'
                    });
                }
                
                // Add some basic styling
                const style = document.createElement('style');
                style.textContent = \`
                    .search-results .result-item {
                        border: 1px solid var(--background-modifier-border);
                        border-radius: 4px;
                        padding: 10px;
                        margin-bottom: 10px;
                    }
                    .search-results .tag {
                        background: var(--tag-background);
                        color: var(--tag-color);
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-size: 12px;
                        margin-right: 5px;
                    }
                    .search-results .modified-date {
                        color: var(--text-muted);
                        font-size: 12px;
                    }
                    .search-results .no-results {
                        text-align: center;
                        color: var(--text-muted);
                        padding: 20px;
                    }
                \`;
                document.head.appendChild(style);
            `,

			'project-workflow.js': `
                // Project Workflow DataView Script
                const { data, query, container } = input || {};
                
                const projectName = query?.project || '';
                
                if (!projectName) {
                    container.createEl('p', { text: 'No project selected' });
                    return;
                }
                
                // Create workflow view
                const workflow = container.createDiv('project-workflow');
                workflow.createEl('h3', { text: \`Project: \${projectName}\` });
                
                // Get project data
                const projectPage = dv.page(\`"Projects/\${projectName}"\`);
                
                if (!projectPage) {
                    workflow.createEl('p', { text: 'Project not found' });
                    return;
                }
                
                // Workflow steps
                const steps = [
                    { name: 'Questions', status: 'completed' },
                    { name: 'Objectives', status: 'in-progress' },
                    { name: 'Literature Review', status: 'pending' },
                    { name: 'Methodology', status: 'pending' },
                    { name: 'Analysis', status: 'pending' }
                ];
                
                const stepsContainer = workflow.createDiv('workflow-steps');
                
                steps.forEach((step, index) => {
                    const stepDiv = stepsContainer.createDiv(\`workflow-step \${step.status}\`);
                    stepDiv.createEl('h4', { text: step.name });
                    stepDiv.createEl('p', { text: step.status });
                    
                    if (index < steps.length - 1) {
                        stepsContainer.createEl('div', { text: '→', cls: 'arrow' });
                    }
                });
                
                // Add styling
                const style = document.createElement('style');
                style.textContent = \`
                    .project-workflow .workflow-steps {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        margin: 20px 0;
                    }
                    .project-workflow .workflow-step {
                        padding: 15px;
                        border: 2px solid var(--background-modifier-border);
                        border-radius: 5px;
                        text-align: center;
                        min-width: 120px;
                    }
                    .project-workflow .workflow-step.completed {
                        border-color: var(--color-green);
                        background: var(--color-green-rgb);
                    }
                    .project-workflow .workflow-step.in-progress {
                        border-color: var(--color-orange);
                        background: var(--color-orange-rgb);
                    }
                    .project-workflow .workflow-step.pending {
                        border-color: var(--text-muted);
                        background: var(--background-secondary);
                    }
                    .project-workflow .arrow {
                        font-size: 18px;
                        color: var(--text-muted);
                    }
                \`;
                document.head.appendChild(style);
            `
		};
	}

	// Method to open Research Dashboard modal
	openResearchDashboard() {
		const modal = new ResearchDashboardModal(this.app);
		modal.open();
	}

	// Method to open Search Dashboard modal
	openSearchDashboard() {
		const modal = new SearchDashboardModal(this.app);
		modal.open();
	}

	// Method to render DataView in a note
	async renderDataViewInNote(notePath: string, scriptName: string, args: any = {}) {
		const file = this.app.vault.getAbstractFileByPath(notePath);
		if (!(file instanceof TFile)) {
			throw new Error('Note not found');
		}

		const scriptPath = this.getScriptPath(scriptName);
		const dataViewCode = ''

        // Get current content
        const currentContent = await this.app.vault.read(file);
        
        // Append DataView code
        const newContent = currentContent + '\\n\\n' + dataViewCode;
        
        // Write back to file
        await this.app.vault.modify(file, newContent);
    }
}
