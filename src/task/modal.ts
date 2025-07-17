import { App, Modal, Notice, TFile, TFolder } from 'obsidian';
import { WeeklyKanban } from "./kanban";
import { Logger } from '../logger';
import { ZettelkastenSettings } from '../types';
import { NoteFactory } from "../notes";


export class WeeklyKanbanModal extends Modal {
	private logger: Logger = Logger.createLogger('WeeklyKanbanModal');
	private settings: ZettelkastenSettings;
	private factory: NoteFactory;
	private kanban: WeeklyKanban;

	constructor(app: App, settings: ZettelkastenSettings, factory: NoteFactory) {
		super(app);
		this.settings = settings;
		this.factory = factory;
		this.kanban = new WeeklyKanban(app, settings, factory);
	}


	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Use a main container div to apply centering
		const container = contentEl.createDiv({ cls: 'cc-modal-content' });

		// Header
		container.createEl('h1', { text: 'Control Center', cls: 'cc-header-title' });
		container.createEl('p', { text: 'Your quick-access dashboard for notes and tasks.', cls: 'cc-header-subtitle' });

		// Button Container
		const buttonContainer = container.createDiv({ cls: 'cc-button-container' });

		// --- Button 1: Weekly Kanban ---
		const weeklyBtn = buttonContainer.createDiv({ cls: 'cc-button' });
		weeklyBtn.createDiv({ text: '📅', cls: 'cc-button-icon' });
		weeklyBtn.createDiv({ text: 'Weekly', cls: 'cc-button-label' });
		weeklyBtn.onclick = async () => {
			await this.kanban.openKanbanNote();
			this.close()
		}

		// --- Button 3: Weekly Summary ---
		const summaryBtn = buttonContainer.createDiv({ cls: 'cc-button' });
		summaryBtn.createDiv({ text: '📊', cls: 'cc-button-icon' });
		summaryBtn.createDiv({ text: 'Summary', cls: 'cc-button-label' });
		summaryBtn.onclick = async () => {
			await this.kanban.weeklyTaskSummary()
			this.close()
		}

		// --- Button 4: You can add another one here, e.g., for search ---
		const searchBtn = buttonContainer.createDiv({ cls: 'cc-button' });
		searchBtn.createDiv({ text: '🔍', cls: 'cc-button-icon' });
		searchBtn.createDiv({ text: 'Search', cls: 'cc-button-label' });
		searchBtn.onclick = () => {
			// Example: Open Obsidian's global search
			this.close();
		};

		// --- Quick Add Feature ---
		const quickAddContainer = container.createDiv({ cls: 'cc-quick-add-container' });
		const taskInput = quickAddContainer.createEl('input', {
			type: 'text',
			placeholder: 'Add task to today\'s note...',
		});
		const addButton = quickAddContainer.createEl('button', { text: 'Add' });

		addButton.onclick = async () => {
			const taskText = taskInput.value;
			if (taskText) {
				await this.kanban.taskCreate(taskText);
				taskInput.value = ''; // Clear the input field
			}
			this.close()
		};
		taskInput.onkeydown = (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				addButton.click();
			}
		};
	}

	// Modal 关闭时执行
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

}
