// src/zettelkasten/index.ts - Zettelkasten Module Main Export

// Core components
export { ZettelkastenModal } from './zettelkasten-modal';
export { ZettelkastenCommand } from './zettelkasten-command';

// Configuration
export { CONFIG, ConfigHelper, DEFAULT_PATHS, NOTE_TYPE_CONFIG, UPGRADE_HIERARCHY } from './config';
export { default as ZettelkastenConfig } from './config';

// Types
export type {
	ZettelkastenConfig,
	NoteTypeConfig,
	NoteOption,
	UpgradeOption,
	UIConfig,
	FeatureFlags,
	TemplateConfig,
	NotificationConfig,
	ShortcutConfig,
	Shortcuts,
	NamingPatterns,
	PerformanceConfig,
	DebugConfig,
	IntegrationConfig,
	PathConfig,
	VaultStats,
	UpgradeMetadata,
	ModalState,
	ErrorDetails,
	NoteCreationEvent,
	NoteUpgradeEvent,
	NoteTypeConfigKey,
	FeatureFlag,
	ConfigPath,
	LogLevel,
	SupportedNoteType
} from './types';

// Type guards
export { isNoteType, isUpgradeOption } from './types';

// Constants for external use
export const ZETTELKASTEN_MODULE_VERSION = '1.0.0';

/**
 * Initialize the Zettelkasten module
 * Validates configuration and sets up defaults
 */
export function initializeZettelkastenModule(): { success: boolean; errors?: string[] } {
	const validation = ConfigHelper.validateConfig();

	if (!validation.valid) {
		console.error('Zettelkasten module configuration validation failed:', validation.errors);
		return { success: false, errors: validation.errors };
	}

	console.log('Zettelkasten module initialized successfully');
	return { success: true };
}

/**
 * Get module information
 */
export function getModuleInfo() {
	return {
		name: 'Zettelkasten',
		version: ZETTELKASTEN_MODULE_VERSION,
		description: 'Advanced note-taking system for Obsidian',
		features: Object.keys(CONFIG.FEATURES),
		supportedNoteTypes: Object.values(NOTE_TYPE_CONFIG).map(config => config.label)
	};
}

// Re-export commonly used utilities from config
export const {
	getNoteTypeConfig,
	getUpgradeOptions,
	isUpgradeAllowed,
	getPathForType,
	getEmojiForType,
	getColorForType,
	isFeatureEnabled,
	getNotificationDuration,
	getUIConfig,
	isDebugMode
} = ConfigHelper;

// Convenience exports for quick access
export const PATHS = CONFIG.PATHS;
export const FEATURES = CONFIG.FEATURES;
export const UI = CONFIG.UI;
export const SHORTCUTS = CONFIG.SHORTCUTS;
