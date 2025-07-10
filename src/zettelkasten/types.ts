// src/zettelkasten/types.ts - Zettelkasten specific type definitions

import { NoteType } from '../notes/note';

/**
 * Configuration for note type display and behavior
 */
export interface NoteTypeConfig {
	emoji: string;
	label: string;
	fullLabel: string;
	description: string;
	color: string;
	defaultSections: string[];
}

/**
 * Option for creating new notes in the modal
 */
export interface NoteOption {
	type: NoteType;
	label: string;
	emoji: string;
	description: string;
}

/**
 * Option for upgrading notes in the modal
 */
export interface UpgradeOption {
	type: NoteType;
	label: string;
	emoji: string;
	description: string;
	enabled: boolean;
}

/**
 * UI configuration for modal components
 */
export interface UIConfig {
	MODAL: {
		maxWidth: number;
		minWidth: number;
		cardGap: string;
		sectionGap: string;
	};
	CARDS: {
		NEW_NOTE: {
			minHeight: number;
			columns: number;
			iconSize: string;
			titleSize: string;
		};
		UPGRADE: {
			minHeight: number;
			minWidth: number;
			iconSize: string;
			titleSize: string;
		};
	};
	ANIMATIONS: {
		duration: string;
		hoverTransform: string;
		transitionEasing: string;
	};
}

/**
 * Feature flags for enabling/disabling functionality
 */
export interface FeatureFlags {
	AUTO_SUGGEST_UPGRADES: boolean;
	SHOW_STATUS_BAR: boolean;
	AUTO_OPEN_CREATED_NOTES: boolean;
	BACKUP_ON_UPGRADE: boolean;
	SHOW_UPGRADE_NOTIFICATIONS: boolean;
	ENABLE_QUICK_CREATE: boolean;
	DEBUG_MODE: boolean;
}

/**
 * Template configuration
 */
export interface TemplateConfig {
	DEFAULT_NAME: string;
	FILE_EXTENSION: string;
	INCLUDE_TIMESTAMP: boolean;
	PROTECTED_PROPERTIES: string[];
}

/**
 * Notification settings
 */
export interface NotificationConfig {
	SUCCESS_DURATION: number;
	ERROR_DURATION: number;
	WARNING_DURATION: number;
	INFO_DURATION: number;
	SUGGESTION_COOLDOWN: number;
}

/**
 * Keyboard shortcut configuration
 */
export interface ShortcutConfig {
	modifiers: readonly string[];
	key: string;
}

/**
 * All keyboard shortcuts
 */
export interface Shortcuts {
	OPEN_DASHBOARD: ShortcutConfig;
	QUICK_CREATE_FLEETING: ShortcutConfig;
	QUICK_CREATE_LITERATURE: ShortcutConfig;
}

/**
 * File naming patterns and rules
 */
export interface NamingPatterns {
	DATE_FORMAT: string;
	TIME_FORMAT: string;
	ID_LENGTH: number;
	TITLE_MAX_LENGTH: number;
	INVALID_CHARS: RegExp;
	REPLACEMENT_CHAR: string;
}

/**
 * Performance related settings
 */
export interface PerformanceConfig {
	MAX_RECENT_NOTES: number;
	SEARCH_DEBOUNCE_MS: number;
	AUTO_SAVE_DELAY_MS: number;
	BATCH_SIZE: number;
}

/**
 * Debug and development settings
 */
export interface DebugConfig {
	LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
	SHOW_PERFORMANCE_METRICS: boolean;
	ENABLE_ERROR_BOUNDARIES: boolean;
	MOCK_DATA: boolean;
}

/**
 * Integration settings with other plugins
 */
export interface IntegrationConfig {
	TEMPLATER: {
		enabled: boolean;
		promptOnMissingTitle: boolean;
	};
	DATAVIEW: {
		enabled: boolean;
		autoRefresh: boolean;
	};
	GRAPH_VIEW: {
		highlightZettelTypes: boolean;
		colorByType: boolean;
	};
}

/**
 * Path configuration for different note types and special directories
 */
export interface PathConfig {
	[NoteType.FLEETING]: string;
	[NoteType.LITERATURE]: string;
	[NoteType.ATOMIC]: string;
	[NoteType.PERMANENT]: string;
	TEMPLATES: string;
	ARCHIVE: string;
	UPGRADES: string;
}

/**
 * Complete configuration object
 */
export interface ZettelkastenConfig {
	PATHS: PathConfig;
	NOTE_TYPES: Record<NoteType, NoteTypeConfig>;
	UPGRADES: Record<NoteType, readonly NoteType[]>;
	UI: UIConfig;
	FEATURES: FeatureFlags;
	TEMPLATES: TemplateConfig;
	NOTIFICATIONS: NotificationConfig;
	SHORTCUTS: Shortcuts;
	NAMING: NamingPatterns;
	PERFORMANCE: PerformanceConfig;
	DEBUG: DebugConfig;
	INTEGRATIONS: IntegrationConfig;
}

/**
 * Vault statistics interface
 */
export interface VaultStats {
	total: number;
	byType: Record<string, number>;
	recentNotes: string[];
}

/**
 * Upgrade metadata that gets added to notes
 */
export interface UpgradeMetadata {
	from: NoteType;
	to: NoteType;
	date: string;
	original_id: string;
}

/**
 * Modal state interface
 */
export interface ModalState {
	isOpen: boolean;
	currentNote: any | null;
	currentNoteType: NoteType;
	hasUpgradeOptions: boolean;
}

/**
 * Error handling interface
 */
export interface ErrorDetails {
	message: string;
	stack?: string;
}

/**
 * Event payload for note creation
 */
export interface NoteCreationEvent {
	type: NoteType;
	title: string;
	path: string;
	timestamp: string;
}

/**
 * Event payload for note upgrade
 */
export interface NoteUpgradeEvent {
	from: NoteType;
	to: NoteType;
	originalTitle: string;
	newTitle: string;
	timestamp: string;
}

// Type guards for runtime type checking
export function isNoteType(value: any): value is NoteType {
	return Object.values(NoteType).includes(value);
}

export function isUpgradeOption(value: any): value is UpgradeOption {
	return (
		value &&
		typeof value === 'object' &&
		'type' in value &&
		'label' in value &&
		'emoji' in value &&
		'description' in value &&
		'enabled' in value &&
		isNoteType(value.type)
	);
}

// Utility types
export type NoteTypeConfigKey = keyof typeof NoteType;
export type FeatureFlag = keyof FeatureFlags;
export type ConfigPath = keyof PathConfig;

// Union types for better type safety
export type LogLevel = DebugConfig['LOG_LEVEL'];
export type SupportedNoteType = Exclude<NoteType, NoteType.UNKNOWN>;
