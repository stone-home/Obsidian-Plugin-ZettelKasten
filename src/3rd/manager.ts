import { App } from 'obsidian';
import { Logger } from '../logger';
import { TemplaterIntegration } from './templater';


export class IntegrationManager {
	private app: App;
	private templater: TemplaterIntegration;
	private logger = Logger.createLogger('IntegrationManager');

	constructor(app: App) {
		this.app = app;
		this.templater = new TemplaterIntegration(app);
	}

	public async initialize(): Promise<void> {
		this.logger.info('Initializing integrations...');

		// Initialize Templater
		const templaterSuccess = await this.templater.initialize();
		if (templaterSuccess) {
			this.logger.info('Templater integration ready');
		}

		// Add other integrations here in the future

		this.logger.info('Integration initialization complete');
	}

	public getTemplater(): TemplaterIntegration {
		return this.templater;
	}
}
