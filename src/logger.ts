import { Notice } from 'obsidian';


// src/logger.ts - 适配 Obsidian 环境的简化 Logger
export class Logger {
	static isDebugMode: boolean = false;

	// 设置调试模式
	public static setDebugMode(debug: boolean): void {
		Logger.isDebugMode = debug;
	}

	/**
	 * Safely extracts error message from unknown error type
	 * @param error - The error object of unknown type
	 * @returns {string} A safe error message string
	 */
	public static getErrorMessage(error: unknown): string {
		if (error instanceof Error) {
			return error.message;
		}
		if (typeof error === 'string') {
			return error;
		}
		if (error && typeof error === 'object') {
			// Try to get message property from object
			const errorObj = error as any;
			if (errorObj.message && typeof errorObj.message === 'string') {
				return errorObj.message;
			}
			// Try to stringify the object
			try {
				return JSON.stringify(error);
			} catch {
				return '[Object object]';
			}
		}
		return String(error);
	}

	/**
	 * Safely extracts error details including message and stack trace
	 * @param error - The error object of unknown type
	 * @returns {object} Error details with message and stack
	 */
	public static getErrorDetails(error: unknown): { message: string; stack?: string } {
		const message = Logger.getErrorMessage(error);

		if (error instanceof Error && error.stack) {
			return { message, stack: error.stack };
		}

		return { message };
	}

	// 错误日志 - 总是显示，支持 unknown 类型
	public static error(message: string, error?: unknown): void {
		if (error !== undefined) {
			const errorDetails = Logger.getErrorDetails(error);
			console.error(`[Zettelkasten] ERROR: ${message} - ${errorDetails.message}`, errorDetails.stack ? { stack: errorDetails.stack } : {});
		} else {
			console.error(`[Zettelkasten] ERROR: ${message}`);
		}
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

	/**
	 * Logs error with context and shows user notification
	 * @param context - Context description for the error
	 * @param error - The error object
	 * @param showNotice - Whether to show user notification (default: true)
	 */
	public static logError(context: string, error: unknown, showNotice: boolean = true): void {
		Logger.error(context, error);

		if (showNotice) {
			const errorMessage = Logger.getErrorMessage(error);
			// Try to show notice if available
			if (typeof Notice !== 'undefined') {
				new Notice(`${context}: ${errorMessage}`, 6000);
			}
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

	public error(message: string, error?: unknown): void {
		if (error !== undefined) {
			const errorDetails = Logger.getErrorDetails(error);
			console.error(this.formatMessage('ERROR', `${message} - ${errorDetails.message}`), errorDetails.stack ? { stack: errorDetails.stack } : {});
		} else {
			console.error(this.formatMessage('ERROR', message));
		}
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

	/**
	 * Logs error with context and shows user notification
	 * @param message - Error context message
	 * @param error - The error object
	 * @param showNotice - Whether to show user notification (default: true)
	 */
	public logError(message: string, error: unknown, showNotice: boolean = true): void {
		this.error(message, error);

		if (showNotice) {
			const errorMessage = Logger.getErrorMessage(error);
			// Try to show notice if available
			if (typeof Notice !== 'undefined') {
				new Notice(`${message}: ${errorMessage}`, 6000);
			}
		}
	}

	/**
	 * Get safe error message for custom handling
	 * @param error - The error object
	 * @returns {string} Safe error message
	 */
	public getErrorMessage(error: unknown): string {
		return Logger.getErrorMessage(error);
	}
}

// 为了保持与原有代码的兼容性，导出一个默认实例
export const logger = Logger;
