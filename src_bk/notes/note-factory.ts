// src/note/note-factory.ts
import { App } from 'obsidian';
import { NoteType } from '../types';
import { BaseNote, INoteTemplate } from './base-note';

// 简化的笔记实现，直接继承 BaseNote
class SimpleNote extends BaseNote {
	private noteType: NoteType;

	constructor(app: App, noteType: NoteType, template?: INoteTemplate) {
		super(app, template);
		this.noteType = noteType;
	}

	protected getDefaultProperties() {
		const baseProps = {
			type: this.noteType
		};

		switch (this.noteType) {
			case NoteType.FLEETING:
				return {
					...baseProps,
					tags: ['fleeting', 'quick-capture']
				};
			case NoteType.LITERATURE:
				return {
					...baseProps,
					tags: ['literature', 'reference']
				};
			case NoteType.ATOMIC:
				return {
					...baseProps,
					tags: ['atomic', 'concept']
				};
			case NoteType.PERMANENT:
				return {
					...baseProps,
					tags: ['permanent', 'synthesis']
				};
			default:
				return baseProps;
		}
	}

	protected getDefaultNoteType(): NoteType {
		return this.noteType;
	}
}

// 笔记工厂类
export class NoteFactory {
	private app: App;
	private customTemplates: Map<NoteType, INoteTemplate> = new Map();

	constructor(app: App) {
		this.app = app;
	}

	// 注册自定义模板
	public registerTemplate(noteType: NoteType, template: INoteTemplate): void {
		this.customTemplates.set(noteType, template);
	}

	// 创建笔记
	public createNote(noteType: NoteType, title?: string): BaseNote {
		const template = this.customTemplates.get(noteType);
		const note = new SimpleNote(this.app, noteType, template);

		if (title) {
			note.setTitle(title);
		}

		return note;
	}

	// 创建指定模板的笔记
	public createNoteWithTemplate(
		noteType: NoteType,
		title: string,
		template: INoteTemplate
	): BaseNote {
		const note = new SimpleNote(this.app, noteType, template);
		note.setTitle(title);
		return note;
	}
}
