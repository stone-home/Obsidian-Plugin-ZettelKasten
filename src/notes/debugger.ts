import {App, Notice} from "obsidian";
import {NoteFactory} from "./factory";



class NoteDebugger {
	private readonly app: App;
	private readonly factory: NoteFactory;

	constructor(app: App) {
		this.app = app;
		this.factory = new NoteFactory(app);

	}

	async loadAndDebugNote() {
		try {
			console.log('=== Loading and Debugging Note ===');
			// Fetch active file from the workspace
			const activeFile = this.app.workspace.getActiveFile();
			if (!activeFile || activeFile.extension !== 'md') {
				new Notice('Please open a markdown file first');
				return;
			}

			// Load note using the factory
			const note = await this.factory.loadFromFile(activeFile.path);

			console.log("Loaded note:" + activeFile.path)
			console.log(note.getProperties());
			console.log(note.getBody())
			console.log(note)


			new Notice(`Loaded and debugged: ${note.getTitle()}`);

		} catch (error) {
			console.error('Error loading note:', error);
			// @ts-ignore
			new Notice(`Error: ${error.message}`);
		}
	}

}
