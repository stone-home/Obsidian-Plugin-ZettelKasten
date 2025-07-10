// src/zettelkasten/config.ts - Zettelkasten Configuration

import { NoteType } from '../notes/note';
import type {
	ZettelkastenConfig,
	PathConfig,
	NoteTypeConfig,
	UIConfig,
	FeatureFlags,
	TemplateConfig,
	NotificationConfig,
	Shortcuts,
	NamingPatterns,
	PerformanceConfig,
	DebugConfig,
	IntegrationConfig
} from './types';

/**
 * Default paths for different note types
 */
export const DEFAULT_PATHS: PathConfig = {
	[NoteType.FLEETING]: '000-inbox/1-fleeting',
	[NoteType.LITERATURE]: '000-inbox/2-literature',
	[NoteType.ATOMIC]: '000-inbox/4-atoms',
	[NoteType.PERMANENT]: '000-inbox/3-permanent',
	TEMPLATES: '900-templates',
	ARCHIVE: '900-archive',
	UPGRADES: '900-archive/upgrades'
} as const;

/**
 * Note type metadata and display configuration
 */
export const NOTE_TYPE_CONFIG: Record<NoteType, NoteTypeConfig> = {
	[NoteType.FLEETING]: {
		emoji: '🌱',
		label: 'Fleeting',
		fullLabel: 'Fleeting Note',
		description: 'Quick thoughts and ideas',
		color: '#22c55e', // green
		defaultSections: ['💥Ideas/Thoughts']
	},
	[NoteType.LITERATURE]: {
		emoji: '📚',
		label: 'Literature',
		fullLabel: 'Literature Note',
		description: 'Notes about external sources',
		color: '#3b82f6', // blue
		defaultSections: ['🗃️Content', '📖 Source Information', '📝 Key Insights']
	},
	[NoteType.ATOMIC]: {
		emoji: '⚛️',
		label: 'Atomic',
		fullLabel: 'Atomic Note',
		description: 'Single focused concept',
		color: '#8b5cf6', // purple
		defaultSections: ['💡 Core Concept', '📋 Context', '🔗 Connections']
	},
	[NoteType.PERMANENT]: {
		emoji: '🏛️',
		label: 'Permanent',
		fullLabel: 'Permanent Note',
		description: 'Well-developed knowledge',
		color: '#f59e0b', // amber
		defaultSections: ['🗃️Content', '🧠 Synthesis', '🔗 Connected Ideas']
	},
	[NoteType.UNKNOWN]: {
		emoji: '❓',
		label: 'Unknown',
		fullLabel: 'Unknown Note',
		description: 'Unclassified note',
		color: '#6b7280', // gray
		defaultSections: []
	}
} as const;

/**
 * Upgrade hierarchy configuration
 */
export const UPGRADE_HIERARCHY: Record<NoteType, readonly NoteType[]> = {
	[NoteType.FLEETING]: [NoteType.LITERATURE, NoteType.ATOMIC],
	[NoteType.LITERATURE]: [NoteType.ATOMIC, NoteType.PERMANENT],
	[NoteType.ATOMIC]: [NoteType.PERMANENT],
	[NoteType.PERMANENT]: [],
	[NoteType.UNKNOWN]: [NoteType.FLEETING, NoteType.LITERATURE, NoteType.ATOMIC, NoteType.PERMANENT]
} as const;

/**
 * Modal and UI configuration
 */
export const UI_CONFIG: UIConfig = {
	MODAL: {
		maxWidth: 600,
		minWidth: 350,
		cardGap: '0.5rem',
		sectionGap: '1.5rem'
	},
	CARDS: {
		NEW_NOTE: {
			minHeight: 50,
			columns: 4,
			iconSize: '1.2rem',
			titleSize: '0.7rem'
		},
		UPGRADE: {
			minHeight: 45,
			minWidth: 70,
			iconSize: '1rem',
			titleSize: '0.65rem'
		}
	},
	ANIMATIONS: {
		duration: '0.2s',
		hoverTransform: 'translateY(-1px)',
		transitionEasing: 'ease'
	}
} as const;

/**
 * Plugin feature flags
 */
export const FEATURES: FeatureFlags = {
	AUTO_SUGGEST_UPGRADES: true,
	SHOW_STATUS_BAR: true,
	AUTO_OPEN_CREATED_NOTES: true,
	BACKUP_ON_UPGRADE: true,
	SHOW_UPGRADE_NOTIFICATIONS: true,
	ENABLE_QUICK_CREATE: true,
	DEBUG_MODE: false
} as const;

/**
 * Template configuration
 */
export const TEMPLATE_CONFIG: TemplateConfig = {
	DEFAULT_NAME: 'default',
	FILE_EXTENSION: '.md',
	INCLUDE_TIMESTAMP: true,
	PROTECTED_PROPERTIES: ['id', 'create', 'template']
} as const;

/**
 * Notification settings
 */
export const NOTIFICATION_CONFIG: NotificationConfig = {
	SUCCESS_DURATION: 4000,
	ERROR_DURATION: 6000,
	WARNING_DURATION: 5000,
	INFO_DURATION: 3000,
	SUGGESTION_COOLDOWN: 24 * 60 * 60 * 1000 // 24 hours
} as const;

/**
 * Keyboard shortcuts
 */
export const SHORTCUTS: Shortcuts = {
	OPEN_DASHBOARD: {
		modifiers: ['Mod', 'Shift'] as const,
		key: 'z'
	},
	QUICK_CREATE_FLEETING: {
		modifiers: ['Mod', 'Shift'] as const,
		key: 'f'
	},
	QUICK_CREATE_LITERATURE: {
		modifiers: ['Mod', 'Shift'] as const,
		key: 'l'
	}
} as const;

/**
 * File naming patterns
 */
export const NAMING_PATTERNS: NamingPatterns = {
	DATE_FORMAT: 'YYYY-MM-DD',
	TIME_FORMAT: 'HH:mm:ss',
	ID_LENGTH: 8,
	TITLE_MAX_LENGTH: 100,
	INVALID_CHARS: /[<>:"/\\|?*]/g,
	REPLACEMENT_CHAR: '-'
} as const;

/**
 * Performance settings
 */
export const PERFORMANCE: PerformanceConfig = {
	MAX_RECENT_NOTES: 10,
	SEARCH_DEBOUNCE_MS: 300,
	AUTO_SAVE_DELAY_MS: 1000,
	BATCH_SIZE: 50
} as const;

/**
 * Development and debugging
 */
export const DEBUG_CONFIG: DebugConfig = {
	LOG_LEVEL: 'info' as const,
	SHOW_PERFORMANCE_METRICS: false,
	ENABLE_ERROR_BOUNDARIES: true,
	MOCK_DATA: false
} as const;

/**
 * Integration settings
 */
export const INTEGRATIONS: IntegrationConfig = {
	TEMPLATER: {
		enabled: true,
		promptOnMissingTitle: true
	},
	DATAVIEW: {
		enabled: false,
		autoRefresh: true
	},
	GRAPH_VIEW: {
		highlightZettelTypes: true,
		colorByType: true
	}
} as const;

/**
 * Export a central config object for easy access
 */
export const CONFIG: ZettelkastenConfig = {
	PATHS: DEFAULT_PATHS,
	NOTE_TYPES: NOTE_TYPE_CONFIG,
	UPGRADES: UPGRADE_HIERARCHY,
	UI: UI_CONFIG,
	FEATURES,
	TEMPLATES: TEMPLATE_CONFIG,
	NOTIFICATIONS: NOTIFICATION_CONFIG,
	SHORTCUTS,
	NAMING: NAMING_PATTERNS,
	PERFORMANCE,
	DEBUG: DEBUG_CONFIG,
	INTEGRATIONS
} as const;

/**
 * Type-safe configuration access helpers
 */
export class ConfigHelper {
	/**
	 * Get note type configuration
	 */
	static getNoteTypeConfig(noteType: NoteType): NoteTypeConfig {
		return NOTE_TYPE_CONFIG[noteType];
	}

	/**
	 * Get available upgrade options for a note type
	 */
	static getUpgradeOptions(noteType: NoteType): readonly NoteType[] {
		return UPGRADE_HIERARCHY[noteType] || [];
	}

	/**
	 * Check if upgrade is allowed
	 */
	static isUpgradeAllowed(from: NoteType, to: NoteType): boolean {
		return ConfigHelper.getUpgradeOptions(from).includes(to);
	}

	/**
	 * Get path for note type
	 */
	static getPathForType(noteType: NoteType): string {
		return DEFAULT_PATHS[noteType] || DEFAULT_PATHS[NoteType.FLEETING];
	}

	/**
	 * Get emoji for note type
	 */
	static getEmojiForType(noteType: NoteType): string {
		return NOTE_TYPE_CONFIG[noteType]?.emoji || '❓';
	}

	/**
	 * Get color for note type
	 */
	static getColorForType(noteType: NoteType): string {
		return NOTE_TYPE_CONFIG[noteType]?.color || '#6b7280';
	}

	/**
	 * Get full label for note type
	 */
	static getFullLabelForType(noteType: NoteType): string {
		return NOTE_TYPE_CONFIG[noteType]?.fullLabel || 'Unknown Note';
	}

	/**
	 * Get default sections for note type
	 */
	static getDefaultSections(noteType: NoteType): string[] {
		return NOTE_TYPE_CONFIG[noteType]?.defaultSections || [];
	}

	/**
	 * Check if feature is enabled
	 */
	static isFeatureEnabled(feature: keyof FeatureFlags): boolean {
		return FEATURES[feature];
	}

	/**
	 * Get notification duration by type
	 */
	static getNotificationDuration(type: 'success' | 'error' | 'warning' | 'info'): number {
		const durations = {
			success: NOTIFICATION_CONFIG.SUCCESS_DURATION,
			error: NOTIFICATION_CONFIG.ERROR_DURATION,
			warning: NOTIFICATION_CONFIG.WARNING_DURATION,
			info: NOTIFICATION_CONFIG.INFO_DURATION
		};
		return durations[type];
	}

	/**
	 * Get UI configuration for specific component
	 */
	static getUIConfig(): UIConfig {
		return UI_CONFIG;
	}

	/**
	 * Get keyboard shortcut for command
	 */
	static getShortcut(command: keyof Shortcuts): { modifiers: readonly string[]; key: string } {
		return SHORTCUTS[command];
	}

	/**
	 * Check if debug mode is enabled
	 */
	static isDebugMode(): boolean {
		return DEBUG_CONFIG.LOG_LEVEL === 'debug' || FEATURES.DEBUG_MODE;
	}

	/**
	 * Get performance setting
	 */
	static getPerformanceSetting<K extends keyof PerformanceConfig>(setting: K): PerformanceConfig[K] {
		return PERFORMANCE[setting];
	}

	/**
	 * Get integration setting
	 */
	static getIntegrationSetting<K extends keyof IntegrationConfig>(integration: K): IntegrationConfig[K] {
		return INTEGRATIONS[integration];
	}

	/**
	 * Get template directory for note type
	 */
	static getTemplateDir(noteType: NoteType): string {
		return `${DEFAULT_PATHS.TEMPLATES}/${noteType}`;
	}

	/**
	 * Get archive directory for upgrades
	 */
	static getUpgradeArchiveDir(): string {
		return DEFAULT_PATHS.UPGRADES;
	}

	/**
	 * Validate configuration at runtime
	 */
	static validateConfig(): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		// Check if all note types have configurations
		for (const noteType of Object.values(NoteType)) {
			if (!NOTE_TYPE_CONFIG[noteType]) {
				errors.push(`Missing configuration for note type: ${noteType}`);
			}
		}

		// Check if all paths are valid strings
		for (const [key, path] of Object.entries(DEFAULT_PATHS)) {
			if (typeof path !== 'string' || path.trim() === '') {
				errors.push(`Invalid path for ${key}: ${path}`);
			}
		}

		// Check UI configuration
		if (UI_CONFIG.MODAL.maxWidth <= UI_CONFIG.MODAL.minWidth) {
			errors.push('Modal maxWidth must be greater than minWidth');
		}

		return {
			valid: errors.length === 0,
			errors
		};
	}
}

// Default export for easy access
export default CONFIG;
