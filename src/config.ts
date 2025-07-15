import {NoteType, NoteTypeData, INoteTemplateMetadata} from "./notes";
import {
	ZettelkastenSettings,
	IFeatureFlags,
	INamingPatterns,
	IDebugConfig,
	INotificationConfig,
	IZettelkastenConfig
} from "./types";



/**
 * Plugin feature flags
 */
export const FEATURES: IFeatureFlags = {
	AUTO_OPEN_CREATED_NOTES: true,
	SHOW_UPGRADE_NOTIFICATIONS: true,
	DEBUG_MODE: false,
	FOLDER_NOTES:true
} as const;


/**
 * File naming patterns
 */
export const NAMING_PATTERNS: INamingPatterns = {
	DATE_FORMAT: 'YYYY-MM-DD',
	TIME_FORMAT: 'HH:mm:ss',
	ID_LENGTH: 8,
	TITLE_MAX_LENGTH: 100,
	INVALID_CHARS: /[<>:"/\\|?*]/g,
	REPLACEMENT_CHAR: '-'
} as const;


/**
 * Development and debugging
 */
export const DEBUG_CONFIG: IDebugConfig = {
	LOG_LEVEL: 'info' as const,
	SHOW_PERFORMANCE_METRICS: false,
	ENABLE_ERROR_BOUNDARIES: true,
	MOCK_DATA: false
} as const;


/**
 * Notification settings
 */
export const NOTIFICATION_CONFIG: INotificationConfig = {
	SUCCESS_DURATION: 4000,
	ERROR_DURATION: 6000,
	WARNING_DURATION: 5000,
	INFO_DURATION: 3000,
	SUGGESTION_COOLDOWN: 24 * 60 * 60 * 1000 // 24 hours
} as const;


/**
 * Export a central config object for easy access
 */
export const CONFIG: IZettelkastenConfig = {
	// PATHS: DEFAULT_PATHS,
	// NOTE_TYPES: NOTE_TYPE_CONFIG,
	// UPGRADES: UPGRADE_HIERARCHY,
	// UI: UI_CONFIG,
	FEATURES,
	// TEMPLATES: TEMPLATE_CONFIG,
	NOTIFICATIONS: NOTIFICATION_CONFIG,
	// SHORTCUTS,
	NAMING: NAMING_PATTERNS,
	// PERFORMANCE,
	DEBUG: DEBUG_CONFIG,
	// INTEGRATIONS
} as const;



export class ConfigHelper {
	/**
	 * Get note type configuration
	 */
	static getNoteTypeConfig(noteType: NoteType): INoteTemplateMetadata {
		return NoteTypeData[noteType];
	}

	static getNotificationDuration(type: 'success' | 'error' | 'warning' | 'info'): number {
		const durations = {
			success: NOTIFICATION_CONFIG.SUCCESS_DURATION,
			error: NOTIFICATION_CONFIG.ERROR_DURATION,
			warning: NOTIFICATION_CONFIG.WARNING_DURATION,
			info: NOTIFICATION_CONFIG.INFO_DURATION
		};
		return durations[type];
	}

}


export const DEFAULT_SETTINGS: ZettelkastenSettings = {
	// Paths for different types of notes
	fleetingPath: 'inbox/fleeting',
	literaturePath: 'inbox/literature',
	permanentPath: 'inbox/permanent',
	atomicPath: 'inbox/atoms',

	// Basic settings
	useTemplater: true,
	autoOpenNewNote: true,
	showUpgradeNotifications: true,

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

	// Initialize createNoteOptions with the default values from config.ts
	createNoteOptions: [],

	// Advanced Plugin settings
	systemSettings: CONFIG

}
