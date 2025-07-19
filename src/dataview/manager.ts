import { App, Component, TFile, TFolder } from 'obsidian';
import { IDataviewScript, IDataviewParameter, IDataviewExecution } from "./types";
import { DataviewScriptBuilder } from "./builder";
import { Logger } from "../logger";


export class DataviewJSManager extends Component {
	private app: App;
	private scripts: Map<string, IDataviewScript> = new Map();
	private scriptCache: Map<string, string> = new Map();
	private scriptsFolder: string;
	private logger = Logger.createLogger("DataviewJSManager");

	constructor(app: App, scriptsFolder: string = 'dataview-scripts') {
		super();
		this.app = app;
		this.scriptsFolder = scriptsFolder;
	}

	async onload(): Promise<void> {
		await this.initializeScriptsFolder();
		await this.loadAllScripts();
		this.registerFileWatchers();
	}

	// Initialize the scripts folder structure
	private async initializeScriptsFolder(): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(this.scriptsFolder);
		if (!folder) {
			await this.app.vault.createFolder(this.scriptsFolder);
			await this.createDefaultScripts();
		}
	}

	// Create some default example scripts
	private async createDefaultScripts(): Promise<void> {
		const defaultScripts = [
			{
				id: 'recent-notes-table',
				name: 'Recent Notes Table',
				description: 'Display recently modified notes in a table format',
				script: `
// Recent Notes Table View
// Parameters: days (number, default: 7), limit (number, default: 10)

const days = input?.days || 7;
const limit = input?.limit || 10;

const pages = dv.pages('')
  .where(p => p.file.mtime >= dv.date('today') - dv.duration(\`\${days} days\`))
  .sort(p => p.file.mtime, 'desc')
  .limit(limit);

dv.table(
  ['Name', 'Modified', 'Size'],
  pages.map(p => [
    p.file.link,
    p.file.mtime.toFormat('yyyy-MM-dd HH:mm'),
    p.file.size + ' bytes'
  ])
);
`,
				parameters: [
					{ name: 'days', type: 'number', required: false, default: 7, description: 'Number of days to look back' },
					{ name: 'limit', type: 'number', required: false, default: 10, description: 'Maximum number of notes to show' }
				]
			},
			{
				id: 'task-progress-chart',
				name: 'Task Progress Chart',
				description: 'Visual chart showing task completion by project',
				script: `
// Task Progress Chart
// Parameters: projectTag (string, default: 'project')

const projectTag = input?.projectTag || 'project';

const tasks = dv.pages(\`#\${projectTag}\`)
  .file.tasks
  .groupBy(t => t.path)
  .map(group => ({
    project: group.key.split('/').pop().replace('.md', ''),
    completed: group.rows.filter(t => t.completed).length,
    total: group.rows.length
  }));

// Create a simple progress visualization
const container = dv.container;
container.style.cssText = 'font-family: monospace;';

tasks.forEach(project => {
  const progress = project.total > 0 ? (project.completed / project.total) * 100 : 0;
  const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
  
  const div = container.createDiv();
  div.innerHTML = \`
    <div style="margin: 8px 0;">
      <strong>\${project.project}</strong><br>
      <code>\${progressBar}</code> \${progress.toFixed(1)}% (\${project.completed}/\${project.total})
    </div>
  \`;
});
`,
				parameters: [
					{ name: 'projectTag', type: 'string', required: false, default: 'project', description: 'Tag to identify project notes' }
				]
			}
		] as const;

		for (const script of defaultScripts) {
			await this.createScript(script.id, script.name, script.script, {
				description: script.description,
				parameters: script.parameters
			});
		}
	}

	// Register file watchers for auto-reload
	private registerFileWatchers(): void {
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file.path.startsWith(this.scriptsFolder) && file.path.endsWith('.js')) {
					this.reloadScript(file.path);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file.path.startsWith(this.scriptsFolder) && file.path.endsWith('.js')) {
					this.removeScript(file.path);
				}
			})
		);
	}

	// Load all scripts from the scripts folder
	async loadAllScripts(): Promise<void> {
		const scriptsFolder = this.app.vault.getAbstractFileByPath(this.scriptsFolder) as TFolder;
		if (!scriptsFolder) return;

		const scriptFiles = scriptsFolder.children
			.filter(file => file instanceof TFile && file.extension === 'js') as TFile[];

		for (const file of scriptFiles) {
			await this.loadScript(file);
		}
	}

	// Load individual script file
	private async loadScript(file: TFile): Promise<void> {
		const content = await this.app.vault.read(file);
		const metadata = this.parseScriptMetadata(content);

		if (metadata) {
			const script: IDataviewScript = {
				id: metadata.id || file.basename,
				name: metadata.name || file.basename,
				description: metadata.description,
				filePath: file.path,
				category: metadata.category,
				parameters: metadata.parameters,
				tags: metadata.tags
			};

			this.scripts.set(script.id, script);
			this.scriptCache.set(script.id, content);
		}
	}

	// Parse metadata from script comments
	private parseScriptMetadata(content: string): any {
		const metadataRegex = /\/\*\*\s*\n([\s\S]*?)\*\//;
		const match = content.match(metadataRegex);

		if (!match) return null;

		const metadataText = match[1];
		const metadata: any = {};

		// Parse @tag value patterns
		const tagRegex = /@(\w+)\s+(.+)/g;
		let tagMatch;

		while ((tagMatch = tagRegex.exec(metadataText)) !== null) {
			const [, tag, value] = tagMatch;

			if (tag === 'param') {
				if (!metadata.parameters) metadata.parameters = [];
				const paramMatch = value.match(/\{(\w+)\}\s+(\w+)\s+-\s+(.+)/);
				if (paramMatch) {
					metadata.parameters.push({
						name: paramMatch[2],
						type: paramMatch[1],
						required: value.includes('required'),
						description: paramMatch[3]
					});
				}
			} else {
				metadata[tag] = value.trim();
			}
		}

		return metadata;
	}

	// Create a new script file
	async createScript(
		id: string,
		name: string,
		scriptContent: string,
		options: {
			description?: string;
			category?: string;
			parameters?: IDataviewParameter[];
			tags?: string[];
		} = {}
	): Promise<IDataviewScript> {
		const filePath = `${this.scriptsFolder}/${id}.js`;

		// Generate metadata header
		let header = `/**\n * @id ${id}\n * @name ${name}\n`;
		if (options.description) header += ` * @description ${options.description}\n`;
		if (options.category) header += ` * @category ${options.category}\n`;

		if (options.parameters) {
			options.parameters.forEach(param => {
				header += ` * @param {${param.type}} ${param.name} - ${param.description || ''}\n`;
			});
		}

		if (options.tags) {
			header += ` * @tags ${options.tags.join(', ')}\n`;
		}

		header += ' */\n\n';

		const fullContent = header + scriptContent;

		await this.app.vault.create(filePath, fullContent);

		const script: IDataviewScript = {
			id,
			name,
			filePath,
			...options
		};

		this.scripts.set(id, script);
		this.scriptCache.set(id, fullContent);

		return script;
	}

	// Get script by ID
	getScript(id: string): IDataviewScript | undefined {
		return this.scripts.get(id);
	}

	// Get all scripts, optionally filtered by category
	getScripts(category?: string): IDataviewScript[] {
		const allScripts = Array.from(this.scripts.values());
		return category ? allScripts.filter(s => s.category === category) : allScripts;
	}

	// Execute a script with parameters
	async executeScript(
		scriptId: string,
		container: HTMLElement,
		parameters: Record<string, any> = {},
		context: any = {}
	): Promise<void> {
		const script = this.getScript(scriptId);
		if (!script) {
			throw new Error(`Script '${scriptId}' not found`);
		}

		const dataviewApi = (this.app as any).plugins.plugins.dataview?.api;
		if (!dataviewApi) {
			throw new Error('Dataview plugin not found or not enabled');
		}

		// Prepare the execution context
		const executionContext = {
			dv: dataviewApi,
			input: parameters,
			container,
			app: this.app,
			...context
		};

		try {
			// Get script content
			let scriptContent = this.scriptCache.get(scriptId);
			if (!scriptContent) {
				const file = this.app.vault.getAbstractFileByPath(script.filePath) as TFile;
				scriptContent = await this.app.vault.read(file);
				this.scriptCache.set(scriptId, scriptContent);
			}

			// Remove metadata comments for execution
			const cleanScript = scriptContent.replace(/\/\*\*[\s\S]*?\*\/\s*/, '');

			// Execute the script
			const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
			const executor = new AsyncFunction('dv', 'input', 'container', 'app', cleanScript);

			await executor(
				executionContext.dv,
				executionContext.input,
				executionContext.container,
				executionContext.app
			);

		} catch (error) {
			this.logger.logError(`Error executing script '${scriptId}':`, error);
		}
	}

	// Reload a script from file
	private async reloadScript(filePath: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
		if (file) {
			await this.loadScript(file);
		}
	}

	// Remove script from memory
	private removeScript(filePath: string): void {
		const scriptToRemove = Array.from(this.scripts.values())
			.find(s => s.filePath === filePath);

		if (scriptToRemove) {
			this.scripts.delete(scriptToRemove.id);
			this.scriptCache.delete(scriptToRemove.id);
		}
	}

	// Create a script builder for programmatic creation
	createScriptBuilder(): DataviewScriptBuilder {
		return new DataviewScriptBuilder(this);
	}

	// Export scripts metadata
	exportScriptsManifest(): string {
		const scripts = Array.from(this.scripts.values());
		return JSON.stringify(scripts, null, 2);
	}
}
