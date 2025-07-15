import { App, Modal, TFolder } from 'obsidian';
import { INoteOption } from "../../notes";


export class GroupNoteCards extends Modal {
	private modalTitle: string = 'Select Note Type';
	private options: INoteOption[];
	private callback: (noteMeta: INoteOption) => Promise<void>;

	constructor(app: App, name: string, options: INoteOption[],  callback: (noteMeta: INoteOption) => Promise<void>) {
		super(app);
		this.modalTitle = name;
		this.options = options;
		this.callback = callback;
	}

	onOpen() {
		this.display();
	}

	onClose() {
		this.contentEl.empty();
	}

	private display() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('zettelkasten-modal');
		contentEl.createEl('h2', {
			text: this.modalTitle,
			cls: 'modal-title'
		});
		const cardsContainer = contentEl.createDiv('note-cards-container');
		this.options.forEach(option => {
			if (option.enabled) {
				const card = cardsContainer.createDiv('note-card clickable-card');
				const iconDiv = card.createDiv('note-card-icon');
				iconDiv.createEl('span', { text: option.emoji, cls: 'card-emoji' });

				// Title only (no description for compact design)
				card.createEl('div', { text: option.label, cls: 'note-card-title' });

				// Make card clickable
				card.addEventListener('click', async () => {
					await this.callback(option);
					this.close()
				});
			}
		});
	}
}
