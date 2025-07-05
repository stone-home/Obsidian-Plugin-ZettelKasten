import { App } from 'obsidian';
import { Logger } from '../logger';
import { TemplaterIntegration } from './templater';


export class IntegrationManager {
	// The single instance of IntegrationManager
	private static instance: IntegrationManager;

	private app: App;
	private templater: TemplaterIntegration;
	private logger = Logger.createLogger('IntegrationManager');

	// Make the constructor private to prevent direct instantiation
	private constructor(app: App) {
		this.app = app;
		this.templater = new TemplaterIntegration(app);
	}

	/**
	 * Provides the single instance of IntegrationManager.
	 * Initializes it if it doesn't already exist.
	 * @param app The Obsidian App instance. Required for the first call.
	 * @returns The singleton instance of IntegrationManager.
	 */
	public static getInstance(app: App): IntegrationManager {
		if (!IntegrationManager.instance) {
			IntegrationManager.instance = new IntegrationManager(app);
		}
		return IntegrationManager.instance;
	}

	public async initialize(): Promise<void> {
		this.logger.info('Initializing integrations...');

		// Initialize Templater
		const templaterSuccess = await this.templater.initialize();
		if (templaterSuccess) {
			this.logger.info('Templater integration ready');
		} else {
			this.logger.warn('Templater integration failed to initialize.');
		}

		// Add other integrations here in the future

		this.logger.info('Integration initialization complete');
	}

	public getTemplater(): TemplaterIntegration {
		return this.templater;
	}
}
