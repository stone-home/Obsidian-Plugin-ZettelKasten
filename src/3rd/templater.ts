// src/integrations/templater.ts
import { App } from 'obsidian';
import { Logger } from '../logger';

export class TemplaterIntegration {
	private app: App;
	private logger = Logger.createLogger('TemplaterIntegration');
	private templaterPlugin: any = null;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Initialize Templater integration
	 * Call this after your plugin loads and Templater is available
	 */
	public async initialize(): Promise<boolean> {
		try {
			// Check if Templater plugin is installed and enabled
			// @ts-ignore
			this.templaterPlugin = this.app.plugins.plugins['templater-obsidian'];

			if (!this.templaterPlugin) {
				this.logger.warn('Templater plugin is not installed');
				return false;
			}

			if (!this.templaterPlugin._loaded) {
				this.logger.warn('Templater plugin is not enabled');
				return false;
			}

			this.logger.info('Templater integration initialized successfully');
			return true;

		} catch (error) {
			this.logger.error(`Failed to initialize Templater integration: ${error}`);
			return false;
		}
	}

	/**
	 * Check if Templater is available and enabled
	 */
	public isAvailable(): boolean {
		return this.templaterPlugin !== null;
	}

	/**
	 * Get a specific module from Templater's internal functions
	 * @param moduleName - Name of the module to retrieve (e.g., 'system', 'file', 'date')
	 * @returns The module's static object or null if not found
	 */
	private getTemplaterModule(moduleName: string): any {
		if (!this.templaterPlugin) {
			this.logger.error('Templater plugin not available');
			return null;
		}

		try {
			const modules = this.templaterPlugin.templater.functions_generator.internal_functions.modules_array;
			const module = modules.find((module: any) => module.name === moduleName);

			if (!module || !module.static_object) {
				this.logger.error(`Templater module '${moduleName}' not found or not available`);
				return null;
			}

			this.logger.debug(`Successfully retrieved Templater module: ${moduleName}`);
			return module.static_object;

		} catch (error) {
			this.logger.error(`Failed to get Templater module '${moduleName}': ${error}`);
			return null;
		}
	}

	/**
	 * Get prompt from user using Templater's system prompt
	 */
	public async getPrompt(promptText: string, defaultValue?: string): Promise<string | null> {
		if (!this.isAvailable()) {
			this.logger.error('Templater is not available');
			return null;
		}

		try {
			const systemModule = this.getTemplaterModule('system');
			if (!systemModule || !systemModule.prompt) {
				this.logger.error('Templater system.prompt not available');
				return null;
			}

			const result = await systemModule.prompt(promptText, defaultValue);
			this.logger.info(`Got prompt result: ${result ? 'success' : 'cancelled'}`);
			return result;

		} catch (error) {
			this.logger.error(`Failed to get prompt: ${error}`);
			return null;
		}
	}

	/**
	 * Get suggestion from user using Templater's system suggester
	 */
	public async getSuggestion(
		textItems: string[] | ((item: any) => string),
		items: any[],
		throwOnCancel: boolean = false,
		placeholder?: string
	): Promise<any> {
		if (!this.isAvailable()) {
			this.logger.error('Templater is not available');
			return null;
		}

		try {
			const systemModule = this.getTemplaterModule('system');
			if (!systemModule || !systemModule.suggester) {
				this.logger.error('Templater system.suggester not available');
				return null;
			}

			const result = await systemModule.suggester(textItems, items, throwOnCancel, placeholder);
			this.logger.info(`Got suggester result: ${result ? 'success' : 'cancelled'}`);
			return result;

		} catch (error) {
			this.logger.error(`Failed to get suggestion: ${error}`);
			return null;
		}
	}
}



