import {
	INoteMetadata,
	IFeatureFlags,
	INamingPatterns,
	IDebugConfig,
	IZettelkastenConfig
} from "./types";

// Pre-defined Types of Notes
export enum NoteType {
	FLEETING = 'fleeting',
	LITERATURE = 'literature',
	PERMANENT = 'permanent',
	ATOMIC = 'atomic',
}

export const NoteTypeData: Record<NoteType, INoteMetadata> = {
	[NoteType.FLEETING]: {
		label: 'Fleeting',
		emoji: '🌱',
		description: 'A temporary note for quick thoughts or ideas.',
		enabled: true,
		path: '001-fleeting/001-notes',
		upgradePath: [NoteType.LITERATURE, NoteType.ATOMIC]
	},
	[NoteType.LITERATURE]: {
		label: 'Literature',
		emoji: '📚',
		description: 'A note summarizing literature or research findings.',
		enabled: true,
		path: '002-literature/001-notes',
		upgradePath: [NoteType.ATOMIC, NoteType.PERMANENT]
	},
	[NoteType.ATOMIC]: {
		label: 'Atomic',
		emoji: '⚛️',
		description: 'A small, self-contained note that can be linked to others.',
		enabled: true,
		path: '003-atomic/001-notes',
		upgradePath: [NoteType.PERMANENT]
	},
	[NoteType.PERMANENT]: {
		label: 'Permanent',
		emoji: '💎',
		description: 'A well-structured note that is meant to be permanent.',
		enabled: true,
		path: '004-permanent/001-notes',
		upgradePath: []
	},
}


/**
 * Plugin feature flags
 */
export const FEATURES: IFeatureFlags = {
	AUTO_SUGGEST_UPGRADES: true,
	SHOW_STATUS_BAR: true,
	AUTO_OPEN_CREATED_NOTES: true,
	BACKUP_ON_UPGRADE: true,
	SHOW_UPGRADE_NOTIFICATIONS: true,
	ENABLE_QUICK_CREATE: true,
	DEBUG_MODE: false
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
 * Export a central config object for easy access
 */
export const CONFIG: IZettelkastenConfig = {
	// PATHS: DEFAULT_PATHS,
	// NOTE_TYPES: NOTE_TYPE_CONFIG,
	// UPGRADES: UPGRADE_HIERARCHY,
	// UI: UI_CONFIG,
	FEATURES,
	// TEMPLATES: TEMPLATE_CONFIG,
	// NOTIFICATIONS: NOTIFICATION_CONFIG,
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
	static getNoteTypeConfig(noteType: NoteType): INoteMetadata {
		return NoteTypeData[noteType];
	}

}
