import { INoteTemplateMetadata, NoteType, IKeyValue } from "./notes";

export interface INoteOptionExtraParams {
	tags?: string[];
	prefix?: string;
	properties?: IKeyValue<any>[];
}

/**
 * INoteOption interface defines the structure for options available in the 'New Note' modal
 */
export interface INoteOption {
	enabled: boolean;
	type: NoteType;
	label: string;
	toKanban?: boolean;
	emoji?: string;
	path?: string;
	template?: string;
	metadata?: INoteTemplateMetadata; // Default metadata of a particular note type
	folderNote?: boolean;
	openAfterCreation?: boolean;
	openMode?: string;
	extraInfo?: INoteOptionExtraParams;
}

export interface DefaultTemplate {
	[NoteType.FLEETING]: string;
	[NoteType.LITERATURE]: string;
	[NoteType.PERMANENT]: string;
	[NoteType.ATOMIC]: string;
}

export interface ISubFeature {
	enabled: boolean;
	description: string;
	[key: string]: any;
}

export interface IDataviewFeature {
	enabled: boolean;
	description: string;
	path: string;
	codeBlockType: string;
}

/**
 * Feature Toggles is used to control the availability of features in the plugin
 */
export interface IFeatureFlags {
	AUTO_OPEN_CREATED_NOTES: boolean;
	SHOW_UPGRADE_NOTIFICATIONS: boolean;
	DEBUG_MODE: boolean;
	FOLDER_NOTES: boolean;
}

/**
 * Notification settings
 */
export interface INotificationConfig {
	SUCCESS_DURATION: number;
	ERROR_DURATION: number;
	WARNING_DURATION: number;
	INFO_DURATION: number;
	SUGGESTION_COOLDOWN: number;
}

export interface ZettelkastenSettings {
	// Naming and formatting settings
	dateFormat: string;
	// Default paths for different types of notes
	fleetingPath: string;
	literaturePath: string;
	permanentPath: string;
	atomPath: string;
	// Basic settings
	useTemplater: boolean;
	autoOpenNewNote: boolean;
	showUpgradeNotifications: boolean;
	// Folder Notes settings
	folderNotesEnabled: boolean;
	// Template settings
	includeTimestamp: boolean;
	defaultTags: string[];
	templateDirPath: string;
	default: DefaultTemplate;

	// Research settings
	researchEnabled: boolean;
	researchPath: string;
	researchZoteroPath: string;

	// Dataview settings
	dataviewEnabled: boolean;
	dataviewQueryPath: string;
	dataviewCodeBlockType: string;

	// Kanban settings
	kanbanEnabled: boolean;
	kanbanPath: string;

	// Project settings
	projectEnabled: boolean;
	projectPath: string;

	// New Note Options (for settings)
	createNoteOptions: INoteOption[];
}
