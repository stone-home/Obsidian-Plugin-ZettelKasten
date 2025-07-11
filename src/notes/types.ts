// [TS] KeyValue is a generic class that can hold any type of value
import {NoteType} from "./config";

export interface IKeyValue<T> {
	getValue(): T;
	setValue(value: T): void;
	toString(): string;
}

// IProperties interface defines the structure of properties for a note
export interface IProperties {
	title: IKeyValue<string>;
	type: IKeyValue<string>;
	tags: IKeyValue<string[]>;
	aliases: IKeyValue<string[]>;
	// [TS] new is a boolean indicating if the note is new
	[key: string]: IKeyValue<any>;
}

/*
 * IZettelkastenProperties interface extends IProperties to include specific properties for Zettelkasten notes
 */
export interface IZettelkastenProperties extends IProperties {
	url: IKeyValue<string>;
	create: IKeyValue<string>;
	id: IKeyValue<string>;
	sources: IKeyValue<string[]>;
	new: IKeyValue<boolean>;
}

/*
 * INoteLink interface defines the structure for linking notes
 */
export interface INoteLink {
	targetNote: string;
	header?: string;
	form?: 'list' | 'checklist';
	link(sourceNote: string): Promise<void>;
}

/*
 * BaseTemplate interface defines the structure for a template
 */
export interface ITemplateMetadata {
	"path": string,
}

/**
 * The Data is used to store metadata for each note type
 * all basic metadata is stored here
 */
export interface INoteTemplateMetadata {
	label: string;
	emoji: string;
	description: string;
	path: string;
	upgradePath: Array<NoteType>;
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
}


/**
 * Feature Toggles is used to control the availability of features in the plugin
 */
export interface IFeatureFlags {
	AUTO_SUGGEST_UPGRADES: boolean;
	SHOW_STATUS_BAR: boolean;
	AUTO_OPEN_CREATED_NOTES: boolean;
	BACKUP_ON_UPGRADE: boolean;
	SHOW_UPGRADE_NOTIFICATIONS: boolean;
	ENABLE_QUICK_CREATE: boolean;
	DEBUG_MODE: boolean;
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


/**
 * Debug and development settings
 */
export interface IDebugConfig {
	LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
	SHOW_PERFORMANCE_METRICS: boolean;
	ENABLE_ERROR_BOUNDARIES: boolean;
	MOCK_DATA: boolean;
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
 * Complete configuration object
 */
export interface IZettelkastenConfig {
	// PATHS: PathConfig;
	// NOTE_TYPES: Record<NoteType, NoteTypeConfig>;
	// UPGRADES: Record<NoteType, readonly NoteType[]>;
	// UI: UIConfig;
	FEATURES: IFeatureFlags;
	// TEMPLATES: TemplateConfig;
	NOTIFICATIONS: INotificationConfig;
	// SHORTCUTS: Shortcuts;
	NAMING: INamingPatterns;
	// PERFORMANCE: PerformanceConfig;
	DEBUG: IDebugConfig;
	// INTEGRATIONS: IntegrationConfig;
}



// Utility types
export type IFeatureFlag = keyof IFeatureFlags;
