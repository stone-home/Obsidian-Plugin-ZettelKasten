import ZettelkastenPlugin from "../../main";
import {
	IAnnotationSection,
	IDashboardKeyTags,
	IResearchPath,
	ISearchResult,
	IZoteroNoteItems
} from "../types";
import {
	DataviewHelper,
	ViewProjectReference,
	ViewResearchDirectionLiteratureReview,
	ViewResearchDirectionTopic,
	ViewResearchTopicMyPapers,
	ViewResearchTopicPapers
} from "../../dataview";
import {App, MarkdownView, Notice, TFile} from "obsidian";
import {BaseDefault, Body, NoteFactory, NoteType} from "../../notes";
import {Utils} from "../../utils";
import {projectReformResearchNote} from "../../project";
import {Logger} from "../../logger";
import {SearchDashboardModal} from "./search";


export abstract class AbsSearchHandler {
	protected app: App;
	protected plugin: ZettelkastenPlugin;
	protected factory: NoteFactory;

	constructor(app: App, plugin: ZettelkastenPlugin, factory: NoteFactory) {
		this.app = app;
		this.plugin = plugin;
		this.factory = factory;
	}

	abstract process(notes: ISearchResult | ISearchResult[]): Promise<void>;

	protected getResearchRootPath(): string {
		return this.plugin.settings.researchPath
	}

	protected getKeyDirectionTag(): IDashboardKeyTags {
		return {
			zotero: '#software/Zotero',
			direction: "#software/Zotero/direction",
			topic: "#software/Zotero/topic",
		}
	}

	protected getResearchPath(): IResearchPath {
		return {
			directions: this.getResearchRootPath() + '/directions',
			topics: this.getResearchRootPath() + '/topics',
			references: this.getResearchRootPath() + '/references',
			literatures: this.getResearchRootPath() + '/literatures',
			reviews: this.getResearchRootPath() + '/reviews',
			papers: this.getResearchRootPath() + '/papers',
		}
	}

	protected formatProjectName(project: string): string {
		return `${Utils.generateDate()} - ${project}`;
	}

	protected formatDirectionName(direction: string): string {
		return `Direction - ${direction}`;
	}

	protected formatTopicName(direction: string): string {
		return `Topic - ${direction}`;
	}

	protected formatLiteraturePaperName(paperName: string, year: string): string {
		const safeFilename = paperName.replace(/[^a-zA-Z0-9_.\- ]/g, '_');
		return `Summary - ${year} - ${safeFilename}`;
	}
}


export class ActiveNoteInsertCallback extends AbsSearchHandler {
	protected logger = Logger.createLogger("ResearchActiveNoteInsertCallback");

	async process(selectedNotes: ISearchResult | ISearchResult[]): Promise<void> {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView)
		if (!activeView) {
			this.logger.warn("No active Markdown view found.");
			return;
		}
		const editor = activeView.editor;

		// Get current cursor position
		const cursor = editor.getCursor();

		// Insert content
		if (!(Array.isArray(selectedNotes))) {
			selectedNotes = [selectedNotes];
		}
		const content = selectedNotes.map(note => `[[${note.basename}]]`).join(", ")

		// Insert the selected item at cursor position
		editor.replaceRange(content, cursor);

		// Optional: Move cursor to end of inserted text
		const newCursor = {
			line: cursor.line,
			ch: cursor.ch + content.length
		};
		editor.setCursor(newCursor);
	}
}


export class ImportLiteraturePaperCallback extends AbsSearchHandler {
	protected logger = Logger.createLogger("ResearchImportLiteraturePaperCallback");

	async process(selectedNotes: ISearchResult | ISearchResult[]): Promise<void> {
		if (!(Array.isArray(selectedNotes))) {
			selectedNotes = [selectedNotes];
		}
		selectedNotes.map(async (selectedNote: ISearchResult) => {
			this.logger.info(`Executing importLiteraturePaper for note: ${selectedNote.name} in path: ${selectedNote.path}`);
			const zoteroItems = await this.loadZoteroFromFile(selectedNote.path)
			if (!zoteroItems) {
				this.logger.error(`Failed to load note from path: ${selectedNote.path}`);
				new Notice(`Failed to load note from path: ${selectedNote.path}`);
				return;
			}
			// Create all directions' notes based on the tags
			let copiedSelectedNote = Utils.deepClone(selectedNote);
			await this.createDirectionNote(copiedSelectedNote, zoteroItems)

			// Create all directions' notes based on the tags
			copiedSelectedNote = Utils.deepClone(selectedNote);
			await this.createTopicNote(copiedSelectedNote, zoteroItems)

			// Create all annotations' notes based on the tags
			copiedSelectedNote = Utils.deepClone(selectedNote);
			await this.createAnnotationNote(copiedSelectedNote, zoteroItems)

			// Create the literature paper note
			copiedSelectedNote = Utils.deepClone(selectedNote);
			await this.createLiteraturePaperNote(copiedSelectedNote, zoteroItems)
		})
	}


	private async createDirectionNote(selectedNote: ISearchResult, zoteroItems: IZoteroNoteItems): Promise<void> {
		const directionTag = this.getKeyDirectionTag().direction.toLowerCase();
		const directions = selectedNote.tags.filter( tag => tag.contains(directionTag));
		const directionNotePromise = directions.map( async (direction) => {
			const directionFullName = direction.replace(directionTag, '');
			const directionList = directionFullName.split('/').map( part => part.trim()).filter(part => part.length > 0);
			// Ensure the last element is the direction name
			let directionName = directionList.pop();
			if (!directionName) {
				this.logger.error(`Invalid direction name extracted from tag: ${direction}`);
				new Notice(`Invalid direction name extracted from tag: ${direction}`);
				return;
			}
			let directionPath = this.getResearchPath().directions;
			if (directionList.length >= 1) {
				directionPath = directionPath + '/' + directionList.join('/');
			}
			const directionNote = this.factory.createNote(NoteType.LITERATURE) as BaseDefault;
			directionName = this.formatDirectionName(directionName);
			directionNote.setTitle(directionName);
			directionNote.setPath(directionPath);
			if ((await directionNote.exist())) {
				this.logger.warn(`Note with title "${directionName}" already exists in path "${directionPath}". Skipping creation.`);
				return;
			}
			const zoteroKeyTagPath = this.getKeyDirectionTag().zotero.toLowerCase();
			directionNote.addTag(["📍tagNode", direction.replace(this.getKeyDirectionTag().zotero.toLowerCase(), "research")])
			directionNote.addAlias(`"#${direction.replace(zoteroKeyTagPath, "research").trim()}"`);
			directionNote.setProperty("new", false)
			directionNote.addBodyContent([DataviewHelper.getCodeBlockContent(this.plugin.settings.dataviewCodeBlockType, ViewResearchDirectionTopic)], "Topics in Direction", 1);
			directionNote.addBodyContent([DataviewHelper.getCodeBlockContent(this.plugin.settings.dataviewCodeBlockType, ViewResearchDirectionLiteratureReview)], "Literature Reviews", 1);
			// add the zotero note as a source note
			const sourceNote = zoteroItems.note.getProperty("id") || zoteroItems.note.getProperty("citekey") || zoteroItems.note.getTitle() || undefined;
			if (sourceNote) {
				directionNote.addSourceNote(`[[${sourceNote}]]`)
			}

			await directionNote.save();
		})
		try {
			await Promise.all(directionNotePromise);
		} catch (error) {
			this.logger.error("An error occurred while processing directions:", error);
		}
	}

	private async createTopicNote(selectedNote: ISearchResult, zoteroItems: IZoteroNoteItems): Promise<void> {
		const topicTags = this.getKeyDirectionTag().topic.toLowerCase();
		const topics = selectedNote.tags.filter( tag => tag.contains(topicTags));
		const directionNotePromise = topics.map( async (topic) => {
			const topicFullName = topic.replace(topicTags, '');
			const topicList = topicFullName.split('/').map( part => part.trim()).filter(part => part.length > 0);
			// Ensure the last element is the direction name
			let topicName = topicList.pop();
			if (!topicName) {
				this.logger.error(`Invalid direction name extracted from tag: ${topic}`);
				new Notice(`Invalid direction name extracted from tag: ${topic}`);
				return;
			}
			let topicPath = this.getResearchPath().topics;
			if (topicList.length >= 1) {
				topicPath = topicPath + '/' + topicList.join('/');
			}
			const topicNote = this.factory.createNote(NoteType.LITERATURE) as BaseDefault;
			topicName = this.formatTopicName(topicName);
			topicNote.setTitle(topicName);
			topicNote.setPath(topicPath);
			if ((await topicNote.exist())) {
				this.logger.warn(`Note with title "${topicName}" already exists in path "${topicPath}". Skipping creation.`);
				return;
			}
			const zoteroKeyTagPath = this.getKeyDirectionTag().zotero.toLowerCase();
			topicNote.addTag(["📍tagNode", topic.replace(this.getKeyDirectionTag().zotero.toLowerCase(), "research")])
			topicNote.setProperty("new", false)
			topicNote.addAlias(`"#${topic.replace(zoteroKeyTagPath, "research").trim()}"`);
			topicNote.addBodyContent([DataviewHelper.getCodeBlockContent(this.plugin.settings.dataviewCodeBlockType, ViewResearchTopicPapers)], "Papers", 1);
			topicNote.addBodyContent([DataviewHelper.getCodeBlockContent(this.plugin.settings.dataviewCodeBlockType, ViewResearchTopicMyPapers)], "My Papers", 1);
			topicNote.addBodyContent(
				[
					DataviewHelper.getCodeBlockContent(
						this.plugin.settings.dataviewCodeBlockType,
						ViewProjectReference,
						[
							{ name: "fromSameSource", type: "boolean", required: false, value: false},
							{ name: "includeTopicTags", type: "boolean", required: false, value: true},
						]
					)
				],
				"References",
				1
			);
			topicNote.addBodyContent([], "Knowledges", 1);
			topicNote.addBodyContent([], "Methods", 1);

			// add the zotero note as a source note
			const sourceNote = zoteroItems.note.getProperty("id") || zoteroItems.note.getProperty("citekey") || zoteroItems.note.getTitle() || undefined;
			if (sourceNote) {
				topicNote.addSourceNote(`[[${sourceNote}]]`)
			}

			await topicNote.save();
		})
		try {
			await Promise.all(directionNotePromise);
		} catch (error) {
			this.logger.error("An error occurred while processing topics:", error);
		}
	}

	private async createAnnotationNote(selectedNote: ISearchResult, zoteroItems: IZoteroNoteItems): Promise<void> {
		const annotationPromises =  zoteroItems.annotations
			// Filter annotations that have only one tag and do not include "vocabulary" in the tag
			.filter((annotation => annotation.tags.length === 1 && annotation.tags.some((tag) => !tag.toLowerCase().includes("vocabulary"))))
			.map(async (annotation) => {
				const zoteroId = zoteroItems.note.getProperty("id") || zoteroItems.note.getProperty("citekey") || zoteroItems.note.getTitle() || undefined;
				const name = `${zoteroId} - Annotation ${annotation.id}`;
				const annotationNote = this.factory.createNote(NoteType.LITERATURE) as BaseDefault;
				annotationNote.setTitle(name);
				annotationNote.setPath(this.getResearchPath().references);
				if ((await annotationNote.exist())) {
					this.logger.info(`Note with title "${annotationNote.getTitle()}" already exists in path "${annotationNote.getPath()}". Skipping creation.`);
					return;
				}
				annotationNote.setProperty("url", annotation.url);
				annotationNote.setProperty("new", false);
				annotationNote.addSourceNote(`[[${zoteroId}]]`);
				annotationNote.addTag(annotation.tags);
				annotationNote.addTag("research/reference");
				annotationNote.addBodyContent([], "**🔗Source**", 4);
				const displayName = annotation.content.filter((line => line.trim().length > 0)).join(". ")
				annotationNote.addBodyContent(
					[
						"> [!INFO] Annotation Metadata",
						`> **Article**:: ${annotation.article}`,
						`> **Year**:: ${annotation.year}`,
						`> **Page**:: ${annotation.page}`,
						`> **Note Date**:: ${annotation.date}`,
						`> **Bibliography**:: ${annotation.bibliography}`,
						'',
						`DisplayName:: ${displayName.length > 100 ? displayName.substring(0, 100) + '...' : displayName}`,
						'',
						...annotation.content
					],
					"Quote",
					1);
				if (annotation.comments && annotation.comments.length > 0) {
					annotationNote.addBodyContent(annotation.comments, "Comments", 1);
				}
				await annotationNote.save()

			})
		try {
			await Promise.all(annotationPromises);
		} catch (error) {
			this.logger.error("An error occurred while processing annotation:", error);
		}
	}

	private async createLiteraturePaperNote(selectedNote: ISearchResult, zoteroItem: IZoteroNoteItems): Promise<void> {
		const literatureNote = this.factory.createNote(NoteType.LITERATURE) as BaseDefault;
		literatureNote.setTitle(this.formatLiteraturePaperName(selectedNote.name, zoteroItem.note.getProperty("year") || ''));
		literatureNote.setPath(this.getResearchPath().literatures)
		if ((await literatureNote.exist())) {
			this.logger.warn(`Note with title "${literatureNote.getTitle()}" already exists in path "${literatureNote.getPath()}". Skipping creation.`);
			new Notice(`Note with title "${literatureNote.getTitle()}" already exists in path "${literatureNote.getPath()}". Skipping creation.`);
			return;
		}
		const zoteroId = zoteroItem.note.getProperty("id") || zoteroItem.note.getProperty("citekey") || zoteroItem.note.getTitle() || undefined;
		const tags = zoteroItem.note.getProperties().getTags().map((tag) => tag.replace(this.getKeyDirectionTag().zotero.replace("#", ""), "research"));
		const reformedNote = projectReformResearchNote(
			literatureNote,
			{
				codeblockKey: this.plugin.settings.dataviewCodeBlockType,
				ongoingProject: false,
				sourceNotes: [zoteroId],
				url: zoteroItem.note.getProperty("url") || '',
				year: zoteroItem.note.getProperty("date") || '',
				eTags: [...tags]
			})

		await reformedNote.save()
		if (this.plugin.settings?.autoOpenNewNote) {
			await this.app.workspace.openLinkText(literatureNote.getTitle(), '', false, { state: { mode: 'read' } });
		}
	}

	private async loadZoteroFromFile(filePath: string): Promise<IZoteroNoteItems> {
		const file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
		if (!file) {
			throw new Error(`File not found at path: ${filePath}`);
		}

		// create a new note based on the file's frontmatter type
		const cache = this.app.metadataCache.getFileCache(file);
		const frontmatter = cache!.frontmatter
		let enumKey = Utils.getKeyByValue(NoteType, frontmatter!.type)
		if (!enumKey){
			enumKey = "FLEETING";
		}
		const zoteroNote = this.factory.createNote(NoteType[enumKey], false) as BaseDefault;


		const fileContent = await this.app.vault.read(file);

		const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
		const match = fileContent.match(frontmatterRegex);
		let properties = zoteroNote.getProperties();
		if (match && match[1]) {
			if (frontmatter) {
				for (const [key, propValue] of Object.entries(frontmatter)) {
					properties.setPropertyValue(key, propValue, true)
				}
			}
		}
		//parse the file content to extract the body
		const annotations = await this.parseBody(file, zoteroNote);
		//supplement the annotations with the properties from frontmatter
		annotations.forEach((annotation) => {
			annotation.bibliography = properties.getPropertyValue("bibliography") || '';
			annotation.url = properties.getPropertyValue("url") || '';
		})

		// ensure the note has a right title and path
		// the title name may be updated in parseBody method
		zoteroNote.setTitle(file.basename)
		zoteroNote.setPath(file.path)

		return {
			note: zoteroNote,
			annotations: annotations
		}
	}

	private async parseBody(file: TFile, note: BaseDefault): Promise<IAnnotationSection[]> {
		const cache = this.app.metadataCache.getFileCache(file);
		const fileContent = await this.app.vault.read(file);
		const lines = fileContent.split('\n');
		const body = new Body();
		const sections = Array.from(cache?.sections || []);
		const headings = Array.from(cache?.headings || []);

		// fetch extra tags, which are not exist in frontmatter
		if (sections.length >= 2 && sections[1].type === 'paragraph' && sections[0].type === 'yaml') {
			let extraTags: Array<string> = [];
			const startPosition = sections[1].position.start.line;
			const endPosition = sections.length > 2 ? sections[2].position.start.line : lines.length;
			lines.slice(startPosition, endPosition).forEach((line) => {
				const tags = line.split('#');
				tags.forEach(tag => {
					tag = tag.trim().replace("#", "");
					if (tag.length > 0 && !tag.contains(" ")){
						extraTags.push(tag)
					}
				})
			})
			const uniqueTags = Array.from(new Set(extraTags));
			note.addTag(uniqueTags);
			sections.pop()
			sections.pop()
		}

		// Fetch extra properties, which are not exist in frontmatter
		if (headings.length >= 1 && headings[0].heading === "Abstract") {
			const startPosition = headings[0].position.start.line;
			const endPosition = headings.length > 1 ? headings[1].position.start.line : lines.length;
			lines.slice(startPosition, endPosition).forEach((line) => {
				const regex = /^\s*([^:]+?)\s*::\s*(.*)$/;
				const match = line.match(regex);

				if (match) {
					const key = match[1].replace(">", "").trim();
					const value = match[2].trim();
					const properties = note.getProperties();
					if (!Object.prototype.hasOwnProperty.call(properties, key)) {
						properties.setPropertyValue(key, value);
					}
				}
			})
		}

		const annotations: IAnnotationSection[] = [];
		for (const [index, heading] of headings.entries()) {
			const annotationRegex = /^Annotation ID\s*-\s*(\S+)/;
			const startPosition = heading.position.start.line + 1; // +1 to skip the heading line itself
			const endPosition = headings.length > index + 2 ? headings[index+1].position.start.line - 1 : lines.length; // -1 to exclude the next heading line
			const blockLines = lines.slice(startPosition, endPosition);
			const annotationMatch = heading.heading.match(annotationRegex);
			if (annotationMatch) {
				const annotationBlock = this.parseAnnotationSection(blockLines, annotationMatch[1].trim())
				annotations.push(annotationBlock);
			}
			body.addContent(blockLines, heading.heading, heading.level)
		}

		note.setBody(body)
		return annotations
	}



	private parseAnnotationSection(lines: string[], id: string): IAnnotationSection {
		const annotation: IAnnotationSection = {
			id: id,
			tags: [],
			article: '',
			year: '',
			page: '',
			date: '',
			content: [],
			comments: [],
			bibliography: '',
			url: ''
		}
		let collectingComments = false;
		for (const line of lines) {
			if (line.startsWith('*article*:')) {
				annotation.article = line.split('*article*:')[1].trim();
			} else if (line.startsWith('*year*:')) {
				annotation.year = line.split('*year*:')[1].trim();
			} else if (line.startsWith('*page*:')) {
				annotation.page = line.split('*page*:')[1].trim();
			} else if (line.startsWith('*note date*:')) {
				annotation.date = line.split('*note date*:')[1].trim();
			} else if (line.startsWith('Auto Tags:')) {
				line.split('Auto Tags: ')[1].trim().split("#").forEach(tag => {
					tag = tag.replace("#", "").trim();
					if (tag.length > 0 && !tag.includes(" ")) {
						annotation.tags.push(tag);
					}
				})
			} else if (line.startsWith('```ad-comments')) {
				collectingComments = true;
				annotation.comments?.push(line);
			} else if (line.startsWith('```') && collectingComments) {
				collectingComments = false;
				annotation.comments?.push(line);
			} else if (collectingComments) {
				annotation.comments?.push(line);
			} else {
				const specificTagRegex = /#\S+/g;
				if (line.match(specificTagRegex)) {
					line.split('#').forEach(tag => {
						tag = tag.replace("#", "").replace(",", "").trim();
						if (tag.length > 0 && !tag.includes(" ")) {
							annotation.tags.push(tag);
						}
					});
				} else {
					// Collect content lines
					// Ignore empty lines and code blocks deviated by backticks
					if (line.trim().length > 0 && !line.contains('```')) {
						annotation.content.push(line.trim());
					}
				}
			}
		}
		return annotation;
	}
}


export class CreateLiteratureReviewCallback extends AbsSearchHandler {
	protected logger = Logger.createLogger("ResearchCreateLiteratureReviewCallback");

	async process(selectedNotes: ISearchResult | ISearchResult[]): Promise<void> {
		if (!(Array.isArray(selectedNotes))) {
			selectedNotes = [selectedNotes];
		}
		selectedNotes.map(async (selectedNote: ISearchResult) => {
			const topicTag = selectedNote.tags
				.filter(tag => tag.includes("research/topic"))

			const noteName = await this.plugin.integrationManager.getTemplater().getPrompt("Enter the name of the Literature Review note:");
			const note = this.factory.createNote(NoteType.LITERATURE) as BaseDefault;
			if (!noteName) {
				this.logger.warn("Note Name cannot be empty.");
				new Notice("Note name cannot be empty.");
				return;
			}
			note.setTitle(`${Utils.generateDate()} - ${noteName}`)
			note.setPath(this.getResearchPath().reviews);
			if ((await note.exist())) {
				this.logger.warn(`Note with title "${note.getTitle()}" already exists in path "${note.getPath()}". Skipping creation.`);
				new Notice(`Note with title "${note.getTitle()}" already exists in path "${note.getPath()}". Skipping creation.`);
				return;
			}
			note.addSourceNote(`[[${selectedNote.basename}]]`);
			note.addTag("🗂️project/PhD")
			note.addTag("✍️writing/academic/literatureReview")
			note.addTag(topicTag)
			note.addBodyContent([], "ℹTopic", 1)
			note.addBodyContent([], "🫆Position", 1)
			note.addBodyContent([
				"| Paper | Column 1|",
				"| :---: | :---: |",
				"| sample 1| |",
			], "🧩Evidence", 1)
			note.addBodyContent([], "⭐Potential Solutions", 1)
			await note.save()
		})

	}
}
