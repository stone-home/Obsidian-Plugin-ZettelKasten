// src/logger.ts - 适配 Obsidian 环境的简化 Logger
export class Logger {
	static isDebugMode: boolean = false;

	// 设置调试模式
	public static setDebugMode(debug: boolean): void {
		Logger.isDebugMode = debug;
	}

	// 错误日志 - 总是显示
	public static error(message: string, ...args: any[]): void {
		console.error(`[Zettelkasten] ERROR: ${message}`, ...args);
	}

	// 警告日志 - 总是显示
	public static warn(message: string, ...args: any[]): void {
		console.warn(`[Zettelkasten] WARN: ${message}`, ...args);
	}

	// 信息日志 - 总是显示
	public static info(message: string, ...args: any[]): void {
		console.log(`[Zettelkasten] INFO: ${message}`, ...args);
	}

	// HTTP 日志 - 调试模式下显示
	public static http(message: string, ...args: any[]): void {
		if (Logger.isDebugMode) {
			console.log(`[Zettelkasten] HTTP: ${message}`, ...args);
		}
	}

	// 调试日志 - 调试模式下显示
	public static debug(message: string, ...args: any[]): void {
		if (Logger.isDebugMode) {
			console.log(`[Zettelkasten] DEBUG: ${message}`, ...args);
		}
	}

	// 创建带上下文的 Logger 实例
	public static createLogger(context: string): ContextLogger {
		return new ContextLogger(context);
	}
}

// 带上下文的 Logger 类
export class ContextLogger {
	private context: string;

	constructor(context: string) {
		this.context = context;
	}

	private formatMessage(level: string, message: string): string {
		const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
		return `[Zettelkasten:${this.context}] ${level}: ${message}`;
	}

	public error(message: string, ...args: any[]): void {
		console.error(this.formatMessage('ERROR', message), ...args);
	}

	public warn(message: string, ...args: any[]): void {
		console.warn(this.formatMessage('WARN', message), ...args);
	}

	public info(message: string, ...args: any[]): void {
		console.log(this.formatMessage('INFO', message), ...args);
	}

	public http(message: string, ...args: any[]): void {
		if (Logger.isDebugMode) {
			console.log(this.formatMessage('HTTP', message), ...args);
		}
	}

	public debug(message: string, ...args: any[]): void {
		if (Logger.isDebugMode) {
			console.log(this.formatMessage('DEBUG', message), ...args);
		}
	}
}

// 为了保持与原有代码的兼容性，导出一个默认实例
export const logger = Logger;
