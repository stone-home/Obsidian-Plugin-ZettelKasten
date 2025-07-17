import {App, Notice} from 'obsidian';
import { Logger } from '../logger';
import { ZettelkastenSettings } from '../types';
import {NoteFactory, NoteType, BaseDefault, BodySection} from "../notes";
import { format } from 'date-fns';


export class WeeklyKanban {
	private app: App;
	private settings: ZettelkastenSettings;
	private factory: NoteFactory;
	private logger = Logger.createLogger('WeeklyKanban');

	constructor(app: App, settings: ZettelkastenSettings, factory: NoteFactory) {
		this.app = app;
		this.settings = settings;
		this.factory = factory;
	}

	/**
	 * Calculates the ISO 8601 week number for a given date.
	 * @param d The date.
	 * @returns The ISO week number.
	 */
	private getWeekNumber(d: Date): number {
		// Create a copy of the date to avoid modifying the original object.
		const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

		// Set to the nearest Thursday: current date + 4 - current day number
		// Sunday is day 0, so we use || 7 to make it 7
		date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));

		// Get the start of the year
		const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));

		// Calculate the week number by finding the number of days between the dates
		// and dividing by 7.
		return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
	}

	public getCureentWeekNumber(): number {
		const today = new Date();
		return this.getWeekNumber(today);
	}

	public getPreviousWeekNumber(): number {
		const today = new Date();
		today.setDate(today.getDate() - 7); // Subtract 7 days to get the previous week
		return this.getWeekNumber(today);
	}

	public getNextWeekNumber(): number {
		const today = new Date();
		today.setDate(today.getDate() + 7); // Add 7 days to get the next week
		return this.getWeekNumber(today);
	}

	public getKanbanRoot(): string {
		return this.settings.features.WEEKLY_KANBAN!.path || this.app.vault.getRoot() + '/Kanban';
	}

	public getKanbanDir(): string {
		const root = this.getKanbanRoot();
		return`${root}/${new Date().getFullYear()}/Week ${this.getCureentWeekNumber()}`;
	}

	public getTaskDir(): string {
		const kanbanDir = this.getKanbanDir();
		return`${kanbanDir}/tasks`;
	}

	private kanbanConfig(nodeFolder?: string): string[] {
		this.logger.debug(`call function kanbanConf: ${nodeFolder}`)
		let conf = {
			"kanban-plugin": "basic",
			"hide-card-count": false,
			"date-picker-week-start": 1,
			"date-colors":[
				{
					"distance":2,
					"unit":"days",
					"direction":"after",
					"color":"rgba(58, 196, 35, 1)"
				},
				{
					"distance":1,
					"unit":"days",
					"direction":"after",
					"isToday":true,
					"color":"rgba(158, 168, 79, 1)"
				},
				{
					"distance":1,
					"unit":"days",
					"direction":"after",
					"isBefore":true,
					"color":"rgba(255, 0, 0, 1)"
				}
			],
			"tag-colors": [
				{
					"tagKey":"#🟧todo/🔥🔥🔥",
					"color":"",
					"backgroundColor":"rgba(211, 55, 55, 0.78)"
				},
				{
					"tagKey":"#🟧todo/🔥",
					"color":"",
					"backgroundColor":"rgba(76, 213, 230, 0.63)"
				},
				{
					"tagKey":"#🟧todo/🔥🔥",
					"color":"",
					"backgroundColor":"rgba(230, 221, 76, 0.73)"
				},
				{
					"tagKey":"#question",
					"color":"",
					"backgroundColor":"rgba(187, 11, 212, 0.67)"
				}
			],
			"link-date-to-daily-note":false,
			"archive-date-separator":"🕰️",
			"new-note-folder": this.getKanbanDir() + "/tasks",
		}
		if (nodeFolder !== undefined){
			conf["new-note-folder"] = nodeFolder
		}
		return [
			"%% kanban:settings",
			"```",
			`${JSON.stringify(conf)}`,
			"```",
			"%%"
		]
	}

	public getKanbanNoteName(): string {
		return `Kanban - ${new Date().getFullYear()}W${this.getCureentWeekNumber()}`
	}

	public getSummaryNoteName(): string {
		return `Weekly Summary - ${new Date().getFullYear()}W${this.getCureentWeekNumber()}`
	}

	public getTaskName(title: string): string {
		return `Task - ${new Date().getFullYear()}W${this.getCureentWeekNumber()} - ${title}`
	}

	private createKanbanNote(): BaseDefault {
		this.logger.info(`Creating weekly kanban for week ${this.getCureentWeekNumber()}`);
		const kanban = this.factory.createNote(NoteType.FLEETING) as BaseDefault;
		kanban.setTitle(this.getKanbanNoteName());
		kanban.setPath(this.getKanbanDir())
		kanban.emptyBody()
		kanban.addBodyContent("", "Unfinished", 2)
		kanban.addBodyContent("", "Backlogs", 2)
		kanban.addBodyContent("", "In Progress", 2)
		kanban.addBodyContent("\*\*Complete\*\*\n\n\n", "Done", 2)
		kanban.addBodyContent("\*\*Complete\*\*\n\n\n", "Vanished", 2)
		// Make sure the config is placed at the bottom of the file
		kanban.addBodyContent(this.kanbanConfig(), "Vanished", 2)
		kanban.addTag('kanban')
		kanban.setProperty("kanban-plugin", "basic")
		kanban.setProperty("year", format(new Date(), this.settings.naming.DATE_FORMAT))
		return kanban
	}


	public async kanbanCreate(open: boolean = true) {
		const kanban = this.createKanbanNote()
		await kanban.save()
		// Open the new note if feature is enabled
		if (open) {
			await this.app.workspace.openLinkText(kanban.getObPath(true), '', false, { state: { mode: 'source' } });
		}
	}

	public async openKanbanNote(): Promise<void> {
		if (await this.kanbanExists()) {
			await this.app.workspace.openLinkText(`${this.getKanbanNoteName()}.md`, '', false, {state: {mode: 'source'}});
		} else {
			await this.kanbanCreate(true)
		}
	}

	public async kanbanExists(): Promise<boolean> {
		const kanban = this.createKanbanNote()
		return await kanban.exist()
	}

	public async weeklyTaskSummary(): Promise<void> {
		this.logger.info(`Creating weekly summary note for week ${this.getCureentWeekNumber()}`);
		const summary = this.factory.createNote(NoteType.FLEETING) as BaseDefault;
		summary.setTitle(this.getSummaryNoteName());
		summary.setPath(this.getKanbanDir())
		summary.addBodyContent(`- kanban link: \[\[${this.getKanbanNoteName()}|here\]\]`, "**🔗Source**", 4)
		summary.addBodyContent("", "🔥Highlights", 1)
		summary.addBodyContent("", "📝Conclusion", 1)
		summary.addTag('kanban/summary')
		if (!(await summary.exist())) {
			await summary.save();
		}
		// Open the new note if feature is enabled
		if (this.settings?.features.AUTO_OPEN_CREATED_NOTES) {
			await this.app.workspace.openLinkText(summary.getObPath(true), '', false, { state: { mode: 'source' } });
		}
	}


	public async taskCreate(title: string) {
		if (!(await this.kanbanExists())) {
			this.logger.warn("Weekly Kanban does not exist, creating it now.");
			await this.kanbanCreate(false);
		}
		const kanbanFilePath = this.createKanbanNote().getObPath(true)
		const kanbanNote = await this.factory.loadFromFile(kanbanFilePath)
		const header = new BodySection('BackLogs', 2);
		this.logger.info(`Creating weekly task for week ${this.getCureentWeekNumber()}`);
		const task = this.factory.createNote(NoteType.FLEETING) as BaseDefault;
		task.setTitle(this.getTaskName(title));
		task.setPath(this.getTaskDir())
		task.addBodyContent("", "📝Note", 1)
		task.addTag('kanban/task')
		task.setProperty("done", false)
		// insert current task note name into header
		header.addContent(task.getTitle())
		task.addLinkedPage(kanbanNote, header, "checklist")
		if (!(await task.exist())) {
			await task.save();
		} else {
			new Notice(`Task "${task.getTitle()}" already exists!`, 5000);
		}
		// Open the new note if feature is enabled
		if (this.settings?.features.AUTO_OPEN_CREATED_NOTES) {
			await this.app.workspace.openLinkText(task.getObPath(true), '', false, { state: { mode: 'source' } });
		}

	}
}
