import {INoteOption} from "./notes";


// 插件设置接口 - 扩展更多配置项
export interface ZettelkastenSettings {
	// 路径设置
	fleetingPath: string;
	literaturePath: string;
	permanentPath: string;
	atomicPath: string;

	// 基础设置
	useTemplater: boolean;
	autoOpenNewNote: boolean;
	showUpgradeNotifications: boolean;

	// 模板设置
	includeTimestamp: boolean;
	defaultTags: string[];

	// 高级设置
	maxRecentNotes: number;
	enableAutoLinking: boolean;

	// New Note Options (for settings)
	createNoteOptions: INoteOption[];
}

