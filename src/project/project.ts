import ZettelkastenPlugin from "../main";
import {App} from "obsidian";
import {BaseDefault, NoteFactory, NoteType} from "../notes";
import {IProjectData} from "./types";
import {ProjectConfig, ProjectFileType} from "./config";
import {projectReformResearchNote} from "./utils";
import {Utils} from "../utils";
import {Logger} from "../logger";
import {ISearchResult} from "../research/types";
import {DataviewHelper} from "../dataview";
import {ViewProjectCustomTable} from "../dataview/views";


export class Project {
	private app: App;
	private factory: NoteFactory;
	public property: IProjectData;
	private plugin: ZettelkastenPlugin;
	private logger = Logger.createLogger('ZettelkastenProject');

	/*
	 * @param app - The Obsidian application instance.
	 * @param factory - The factory to create notes.
	 * @param entrypoing - The entry point for the project.
	 */
	constructor(app: App, plugin: ZettelkastenPlugin, factory: NoteFactory, property?: IProjectData) {
		this.app = app;
		this.plugin = plugin;
		this.factory = factory;
		this.property = property || ProjectConfig;
	}

	public getBaseName(): string {
		return this.property.basename
	}

	public getProjectName(): string {
		return this.property.entrypoint.split("/").pop() || "Untitled Project";
	}

	public getTargetFolderPath(type: ProjectFileType): string {
		return this.property.entrypoint + "/" + this.property.subfolderPaths[type];
	}

	public projectNameToFileName(name: string): string {
		return `${Utils.generateDate()} - Project - ${name}`;
	}

	public async createSubtaskProject(sources: ISearchResult | ISearchResult[], taskType?: ProjectFileType): Promise<void> {
		if (!Array.isArray(sources)) {
			sources = [sources];
		}
		if (!taskType) {
			const targetSource = sources[0];
			for (const fileType of Object.values(ProjectFileType)) {
				const targetPath = this.getTargetFolderPath(fileType)
				if (targetSource.path.startsWith(targetPath)) {
					if (fileType === ProjectFileType.questionType) {
						taskType = ProjectFileType.objectiveType
					} else if (fileType === ProjectFileType.objectiveType) {
						taskType = ProjectFileType.stepType
					} else {
						taskType = ProjectFileType.otherType;
					}
					break;
				}
			}
			// other type is the default type if no other type is found
			// Therefore, check if the Input file is a main file of project
			if (taskType === ProjectFileType.otherType && targetSource.path.startsWith(this.property.entrypoint)) {
				taskType = ProjectFileType.questionType;
			}
		}
		if (!taskType) {
			this.logger.error("Task type is not defined. Please provide a valid task type.");
			return;
		}

		let subtaskTags: string[] = []
		if (taskType === ProjectFileType.questionType) {
			subtaskTags = this.property.exclusiveTags[ProjectFileType.objectiveType];
		} else if (taskType === ProjectFileType.objectiveType) {
			subtaskTags = this.property.exclusiveTags[ProjectFileType.stepType];
		}

		const name = await this.plugin.integrationManager.getTemplater().getPrompt(`Please enter file name of ${taskType}:`);
		if (!name) {
			this.logger.error("Question note's name is an empty string. Please set a valid name.");
			return;
		}
		const note = this.factory.createNote(NoteType.LITERATURE) as BaseDefault;
		note.setTitle(`${Utils.generateDate()} - ${name}`);
		note.setPath(this.getTargetFolderPath(taskType));
		if (taskType === ProjectFileType.objectiveType) {
			note.setProperty("StartDate", Utils.generateDate())
			note.setProperty("EndDate", "")
			note.setProperty("Section", "inbox")
			note.setProperty("Dependencies", "")
			note.setProperty("Length", 1)
		}
		note.addTag([
			"🗂️project/PhD",
			...this.property.exclusiveTags[taskType],
		])
		note.addBodyContent([], `${taskType[0].toUpperCase()}${taskType.slice(1, taskType.length)}`, 1)
		if (taskType !== ProjectFileType.stepType) {
			note.addBodyContent(
				[DataviewHelper.getCodeBlockContent(
					this.plugin.settings.DataviewConfig.codeBlockType,
					ViewProjectCustomTable,
					[
						{ name: "inlink", type: "boolean", required: true, value: true},
						{ name: "outlink", type: "boolean", required: true, value: false},
						{ name: "header", type: "array", required: true, value: [`🐾${taskType} Tasks`, "Active"]},
						{ name: "property", type: "array", required: true, value: ["file.link","new"]},
						{ name: "tags", type: "array", required: true, value: subtaskTags},
					])
				],
				`🛤️Research Path - ${taskType}`,
				1
			)
		}
		sources.forEach((source) => {
			note.addSourceNote(`[[${source.basename}]]`);
		})
		await note.save()

		if (this.plugin.settings.features.AUTO_OPEN_CREATED_NOTES) {
			await this.app.workspace.openLinkText(note.getTitle(), '', false, { state: { mode: 'source' } });
		}
	}

	public async createProject(sources: ISearchResult|ISearchResult[]): Promise<void> {
		if (!Array.isArray(sources)) {
			sources = [sources];
		}
		const name = this.getProjectName();
		if (!name) {
			this.logger.error('Project entrypoint is an empty string. Please set a valid entrypoint in the settings.');
			return;
		}
		const projectNote = this.factory.createNote(NoteType.LITERATURE) as BaseDefault;
		const projectName = this.projectNameToFileName(name);
		projectNote.setTitle(projectName);
		projectNote.setPath(this.property.entrypoint)
		if (Utils.fileExists(this.app, this.property.entrypoint, true)) {
			this.logger.warn(`Project with name ${name} already exists. Skipping creation.`);
			return;
		}
		let tags = [
			"🗂️project/PhD",
		]
		sources.forEach((source) => {
			source.tags.forEach((tag) => {
				if (tag.contains("research/topic")) {
					tags.push(tag);
				}
			})
		})
		const reformedNote = projectReformResearchNote(
			projectNote,
			{
				codeblockKey: this.plugin.settings.DataviewConfig.codeBlockType,
				ongoingProject: true,
				sourceNotes: sources.map(sources=> sources.basename),
				eTags: tags,
				year: Utils.generateDate(),
				new: true,
			}
		);
		await reformedNote.save();

		if (this.plugin.settings.features.AUTO_OPEN_CREATED_NOTES) {
			await this.app.workspace.openLinkText(reformedNote.getTitle(), '', false, { state: { mode: 'source' } });
		}
	}


}
