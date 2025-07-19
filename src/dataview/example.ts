import { App, MarkdownView, Modal, Component} from "obsidian";
import { DataviewJSManager } from "./manager";
import { DataViewScriptPickerModal as ScriptPickerModal } from "./modals/DataviewScriptPicker";
import { IDataviewScript } from "./types";


// dataview-component.ts - Component for rendering scripts
export class DataviewScriptComponent extends Component {
	private manager: DataviewJSManager;
	private container: HTMLElement;
	private scriptId: string;
	private parameters: Record<string, any>;

	constructor(
		manager: DataviewJSManager,
		container: HTMLElement,
		scriptId: string,
		parameters: Record<string, any> = {}
	) {
		super();
		this.manager = manager;
		this.container = container;
		this.scriptId = scriptId;
		this.parameters = parameters;
	}

	async onload(): Promise<void> {
		await this.render();
	}

	async render(): Promise<void> {
		this.container.empty();

		const script = this.manager.getScript(this.scriptId);
		if (!script) {
			this.container.createDiv({
				text: `Script '${this.scriptId}' not found`,
				cls: 'dataview-error'
			});
			return;
		}

		// Add script info header
		if (script.description) {
			this.container.createDiv({
				text: script.description,
				cls: 'dataview-script-description'
			});
		}

		// Execute the script
		await this.manager.executeScript(this.scriptId, this.container, this.parameters);
	}

	updateParameters(newParameters: Record<string, any>): void {
		this.parameters = { ...this.parameters, ...newParameters };
		this.render();
	}
}



// usage-example.ts - Complete usage examples
export class DataviewJSUsageExample {
	private app: App;
	private jsManager: DataviewJSManager;

	constructor(app: App) {
		this.app = app;
		this.jsManager = new DataviewJSManager(app, 'my-dataview-scripts');
	}

	async initialize(): Promise<void> {
		await this.jsManager.onload();
		await this.createCustomScripts();
	}

	// Method that was referenced in the integration example
	private showScriptPicker(): void {
		new ScriptPickerModal(
			this.app,
			this.jsManager,
			async (scriptId: string, params: Record<string, any>) => {
				// Execute in active note or create a new preview
				const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeLeaf) {
					// Create a temporary container in the editor
					const editor = activeLeaf.editor;
					const cursor = editor.getCursor();

					// Insert a placeholder that will be replaced
					const placeholder = `\n\`\`\`dvjs\n${scriptId}\n${Object.entries(params).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join('\n')}\n\`\`\`\n`;
					editor.replaceRange(placeholder, cursor);
				} else {
					// Show in a modal preview
					this.showScriptPreview(scriptId, params);
				}
			}
		).open();
	}

	// Preview script results in a modal
	private showScriptPreview(scriptId: string, params: Record<string, any>): void {
		const modal = new Modal(this.app);
		modal.titleEl.setText(`Script Preview: ${this.jsManager.getScript(scriptId)?.name}`);

		const container = modal.contentEl.createDiv();
		this.jsManager.executeScript(scriptId, container, params);

		modal.open();
	}

	// Create custom scripts programmatically
	private async createCustomScripts(): Promise<void> {
		// Complex project dashboard script
		await this.jsManager
			.createScriptBuilder()
			.id('project-dashboard')
			.name('Project Dashboard')
			.description('Comprehensive project overview with tasks, notes, and progress')
			.category('dashboards')
			.parameter('project', 'string', true, undefined, 'Project tag or folder')
			.parameter('showCompleted', 'boolean', false, false, 'Include completed tasks')
			.content(`
const project = input.project;
const showCompleted = input.showCompleted || false;

// Get project pages
const projectPages = dv.pages(\`#\${project}\`);
const projectTasks = projectPages.file.tasks;

// Statistics
const totalNotes = projectPages.length;
const totalTasks = projectTasks.length;
const completedTasks = projectTasks.filter(t => t.completed).length;
const pendingTasks = totalTasks - completedTasks;

// Dashboard header
dv.header(2, \`📊 Project: \${project}\`);

// Stats overview
const statsContainer = container.createDiv();
statsContainer.innerHTML = \`
  <div style="display: flex; gap: 20px; margin: 20px 0; padding: 15px; background: var(--background-secondary); border-radius: 8px;">
    <div><strong>📝 Notes:</strong> \${totalNotes}</div>
    <div><strong>✅ Completed:</strong> \${completedTasks}</div>
    <div><strong>⏳ Pending:</strong> \${pendingTasks}</div>
    <div><strong>📈 Progress:</strong> \${totalTasks > 0 ? Math.round((completedTasks/totalTasks)*100) : 0}%</div>
  </div>
\`;

// Recent activity
dv.header(3, '📈 Recent Activity');
const recentNotes = projectPages
  .sort(p => p.file.mtime, 'desc')
  .limit(5);

dv.table(['Note', 'Last Modified'], 
  recentNotes.map(p => [p.file.link, p.file.mtime.toFormat('MMM dd, yyyy')])
);

// Task breakdown
if (totalTasks > 0) {
  dv.header(3, '📋 Task Overview');
  
  const tasksByFile = projectTasks
    .groupBy(t => t.path)
    .map(group => [
      dv.fileLink(group.key),
      group.rows.filter(t => t.completed).length + '/' + group.rows.length,
      group.rows.filter(t => !t.completed).map(t => t.text).join(', ') || 'All complete!'
    ]);
  
  dv.table(['File', 'Progress', 'Pending Tasks'], tasksByFile);
}
`)
			.build();
	}

	// Render script in a note
	async renderInNote(container: HTMLElement, scriptId: string, params: any = {}): Promise<void> {
		await this.jsManager.executeScript(scriptId, container, params);
	}

	// Create dynamic component
	createDynamicComponent(container: HTMLElement, scriptId: string): DataviewScriptComponent {
		return new DataviewScriptComponent(this.jsManager, container, scriptId);
	}

	// List available scripts
	getAvailableScripts(): IDataviewScript[] {
		return this.jsManager.getScripts();
	}

	// Get scripts by category
	getDashboardScripts(): IDataviewScript[] {
		return this.jsManager.getScripts('dashboards');
	}
}
