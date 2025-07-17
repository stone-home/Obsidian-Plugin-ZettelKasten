import { INoteTemplateMetadata, NoteType, IKeyValue} from "./notes";



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
	emoji?: string;
	path?: string;
	template?: string;
	metadata?: INoteTemplateMetadata;
	folderNote?: boolean;
	extraInfo?: INoteOptionExtraParams;
}


export interface DefaultTemplate {
	[NoteType.FLEETING]: string
	[NoteType.LITERATURE]: string
	[NoteType.PERMANENT]: string
	[NoteType.ATOMIC]: string
}


export interface ISubFeature {
	enabled: boolean;
	description: string;
	[key: string]: any
}

/**
 * Feature Toggles is used to control the availability of features in the plugin
 */
export interface IFeatureFlags {
	AUTO_OPEN_CREATED_NOTES: boolean;
	SHOW_UPGRADE_NOTIFICATIONS: boolean;
	DEBUG_MODE: boolean;
	FOLDER_NOTES: boolean;
	WEEKLY_KANBAN: ISubFeature
}

/**
 * Debug and development settings
 */
export interface IDebugConfig {
	LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
	SHOW_PERFORMANCE_METRICS: boolean;
	ENABLE_ERROR_BOUNDARIES: boolean;
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

/**
 * File naming patterns and rules
 */
export interface INamingPatterns {
	DATE_FORMAT: string;
	TIME_FORMAT: string;
	ID_LENGTH: number;
	TITLE_MAX_LENGTH: number;
	INVALID_CHARS: RegExp;
	REPLACEMENT_CHAR: string;
}


export interface ZettelkastenSettings {
	// Default paths for different types of notes
	fleetingPath: string;
	literaturePath: string;
	permanentPath: string;
	atomicPath: string;

	// Basic settings
	useTemplater: boolean;
	autoOpenNewNote: boolean;
	showUpgradeNotifications: boolean;

	// Template settings
	includeTimestamp: boolean;
	defaultTags: string[];
	templateDirPath: string;
	default: DefaultTemplate;

	// New Note Options (for settings)
	createNoteOptions: INoteOption[];

	// Advanced settings
	naming: INamingPatterns
	features: IFeatureFlags
	debug: IDebugConfig;
}

