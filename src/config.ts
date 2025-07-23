import { NoteType, NoteTypeData, INoteTemplateMetadata } from "./notes";
import {
	ZettelkastenSettings,
	INotificationConfig,
	INoteOption,
} from "./types";

/**
 * A list of all available note templates that can be created in 'New Note' modal
 */
export const CreateNoteOptions: INoteOption[] = [
	{
		enabled: true,
		type: NoteType.FLEETING,
		label: "Fleeting",
	},
	{
		enabled: true,
		type: NoteType.LITERATURE,
		label: "Literature",
	},
	{
		enabled: true,
		type: NoteType.ATOMIC,
		label: "Atomic",
	},
	{
		enabled: true,
		type: NoteType.PERMANENT,
		label: "Permanent",
	},
];

/**
 * Notification settings
 */
export const NOTIFICATION_CONFIG: INotificationConfig = {
	SUCCESS_DURATION: 4000,
	ERROR_DURATION: 6000,
	WARNING_DURATION: 5000,
	INFO_DURATION: 3000,
	SUGGESTION_COOLDOWN: 24 * 60 * 60 * 1000, // 24 hours
} as const;

export class ConfigHelper {
	/**
	 * Get note type configuration
	 */
	static getNoteTypeConfig(noteType: NoteType): INoteTemplateMetadata {
		return NoteTypeData[noteType];
	}

	static getNotificationDuration(
		type: "success" | "error" | "warning" | "info",
	): number {
		const durations = {
			success: NOTIFICATION_CONFIG.SUCCESS_DURATION,
			error: NOTIFICATION_CONFIG.ERROR_DURATION,
			warning: NOTIFICATION_CONFIG.WARNING_DURATION,
			info: NOTIFICATION_CONFIG.INFO_DURATION,
		};
		return durations[type];
	}
}

export const DEFAULT_SETTINGS: ZettelkastenSettings = {
	dateFormat: "yyyy-MM-dd",

	// Paths for different types of notes
	fleetingPath: "inbox/fleeting",
	literaturePath: "inbox/literature",
	permanentPath: "inbox/permanent",
	atomicPath: "inbox/atoms",

	// Basic settings
	useTemplater: true,
	autoOpenNewNote: true,
	showUpgradeNotifications: true,
	// Folder notes enabled
	folderNotesEnabled: true,

	// Initialize createNoteOptions with the default values from config.ts
	createNoteOptions: [],

	// Template settings
	includeTimestamp: true,
	defaultTags: [],
	templateDirPath: "templates",
	default: {
		[NoteType.FLEETING]: "default",
		[NoteType.LITERATURE]: "default",
		[NoteType.PERMANENT]: "default",
		[NoteType.ATOMIC]: "default",
	},

	// Research settings
	researchEnabled: true,
	researchPath: "research",
	researchZoteroPath: "zotero",

	// Dataview settings
	dataviewEnabled: true,
	dataviewQueryPath: "dataview",
	dataviewCodeBlockType: "zettelkasten-query",

	// Project settings
	projectEnabled: true,
	projectPath: "projects",

	// Kanban settings
	kanbanEnabled: true,
	kanbanPath: "kanban",
};
