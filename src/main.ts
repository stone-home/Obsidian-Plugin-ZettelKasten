// debug-main.ts - 简单的调试插件
import { App, Plugin, Notice, TFile } from 'obsidian';
import { NoteFactory } from './notes/factory';
import { BaseNote, NoteType} from './notes/note';
import { Logger } from './logger';
import { FleetingDefault, LiteratureDefault, AtomicDefault, PermanentDefault } from './notes/default';
import { IntegrationManager} from "./3rd/manager";


export default class DebugPlugin extends Plugin {
	private factory: NoteFactory;
	private integrations: IntegrationManager;
	private logger = Logger.createLogger('DebugPlugin');

	async onload() {
		console.log('Debug Plugin loaded');

		// 初始化工厂
		this.factory = new NoteFactory(this.app);

		// 注册笔记类型
		this.registerNoteTypes();

		// 添加调试命令
		this.addDebugCommands();

		// Initialize integrations
		this.integrations = new IntegrationManager(this.app);
		await this.integrations.initialize();

		new Notice('Debug Plugin loaded! Check console for debug info.');
	}

	private registerNoteTypes() {
		this.factory.registerNoteClass(NoteType.FLEETING, FleetingDefault);
		this.factory.registerNoteClass(NoteType.LITERATURE, LiteratureDefault);
		this.factory.registerNoteClass(NoteType.PERMANENT, PermanentDefault);
		this.factory.registerNoteClass(NoteType.ATOMIC, AtomicDefault);

		this.logger.info('All note types registered');
	}

	private addDebugCommands() {
		// 命令1: 创建测试笔记
		this.addCommand({
			id: 'debug-create-test-note',
			name: 'Create Test Note',
			callback: () => this.createTestNote()
		});

		// 命令2: 测试工厂功能
		this.addCommand({
			id: 'debug-test-factory',
			name: 'Test Factory Functions',
			callback: () => this.testFactoryFunctions()
		});

		// 命令3: 加载并调试现有笔记
		this.addCommand({
			id: 'debug-load-note',
			name: 'Load and Debug Note',
			callback: () => this.loadAndDebugNote()
		});

		// 命令4: 测试模板功能
		this.addCommand({
			id: 'debug-test-template',
			name: 'Test Template Functions',
			callback: () => this.testTemplateFunctions()
		});

		// 命令5: 综合测试
		this.addCommand({
			id: 'debug-comprehensive-test',
			name: 'Comprehensive Debug Test',
			callback: () => this.comprehensiveTest()
		});
	}

	private async createTestNote() {
		try {
			console.log('=== Creating Test Note ===');
			let filename = await this.integrations.getTemplater().getPrompt("Input filename")
			if (!filename) {
				filename = "unnamed"
			}
			const note = this.factory.createNote(NoteType.FLEETING);

			// 保存笔记
			const file = await note.save();

			console.log('Test note created:', file.path);
			console.log('Note properties:', note.getProperties().getProperties());
			console.log('Note content:', note.toString());

			new Notice(`Test note created: ${file.name}`);

		} catch (error) {
			console.error('Error creating test note:', error);
			new Notice(`Error: ${error.message}`);
		}
	}

	private async testFactoryFunctions() {
		try {
			console.log('=== Testing Factory Functions ===');

			// 测试1: 创建不同类型的笔记
			const types = [NoteType.FLEETING, NoteType.LITERATURE, NoteType.PERMANENT, NoteType.ATOMIC];

			for (const type of types) {
				const note = this.factory.createNote(type);
				console.log(`Created ${type} note:`, {
					type: note.getType(),
					path: note.getPath(),
					title: note.getTitle()
				});
			}

			// 测试2: 克隆笔记
			const originalNote = this.factory.createNote(NoteType.FLEETING);
			originalNote.setTitle('Original Note');
			originalNote.addTag(['original', 'test']);
			originalNote.addBodyContent('Original content', 'Main', 1);

			const clonedNote = this.factory.cloneNote(originalNote, 'Cloned Note');
			console.log('Cloned note:', {
				title: clonedNote.getTitle(),
				tags: clonedNote.getProperty('tags'),
				originalId: originalNote.getProperty('id'),
				clonedId: clonedNote.getProperty('id')
			});

			new Notice('Factory functions test completed - check console');

		} catch (error) {
			console.error('Error testing factory functions:', error);
			new Notice(`Error: ${error.message}`);
		}
	}

	private async loadAndDebugNote() {
		try {
			console.log('=== Loading and Debugging Note ===');

			// 获取当前活动文件
			const activeFile = this.app.workspace.getActiveFile();
			if (!activeFile || activeFile.extension !== 'md') {
				new Notice('Please open a markdown file first');
				return;
			}

			// 使用工厂加载笔记
			const note = await this.factory.loadFromFile(activeFile.path);

			console.log('Loaded note details:');
			console.log('- Title:', note.getTitle());
			console.log('- Type:', note.getType());
			console.log('- Path:', note.getPath());
			console.log('- Properties:', note.getProperties().getProperties());
			console.log('- Body:', note.getBody().toString());

			// 测试属性操作
			console.log('\n=== Testing Property Operations ===');
			console.log('- Tags:', note.getProperty('tags'));
			console.log('- Aliases:', note.getProperty('aliases'));
			console.log('- Sources:', note.getProperty('sources'));
			console.log('- ID:', note.getProperty('id'));
			console.log('- Created:', note.getProperty('create'));

			new Notice(`Loaded and debugged: ${note.getTitle()}`);

		} catch (error) {
			console.error('Error loading note:', error);
			new Notice(`Error: ${error.message}`);
		}
	}

	private async testTemplateFunctions() {
		try {
			console.log('=== Testing Template Functions ===');

			// 创建一个模板笔记
			const template = this.factory.createNote(NoteType.FLEETING);
			template.setTitle('Template Note');
			template.addTag(['template', 'daily']);
			template.addBodyContent('Daily reflection template', 'Reflection', 1);
			template.addBodyContent('What did I learn today?', 'Learning', 2);
			template.addBodyContent('What am I grateful for?', 'Gratitude', 2);

			// 注册模板
			this.factory.registerTemplate(NoteType.FLEETING, 'daily-reflection', template);
			this.factory.setDefaultTemplate(NoteType.FLEETING, 'daily-reflection');

			console.log('Template registered');

			// 测试模板列表
			const templates = this.factory.listTemplates(NoteType.FLEETING);
			console.log('Available templates:', templates);

			// 从模板创建笔记
			const newNote = this.factory.createFromTemplate(NoteType.FLEETING, 'daily-reflection');
			newNote.setTitle('Daily Reflection - Today');

			console.log('Created from template:', {
				title: newNote.getTitle(),
				tags: newNote.getProperty('tags'),
				body: newNote.getBody().toString()
			});

			new Notice('Template functions test completed - check console');

		} catch (error) {
			console.error('Error testing template functions:', error);
			new Notice(`Error: ${error.message}`);
		}
	}

	private async comprehensiveTest() {
		try {
			console.log('=== Comprehensive Debug Test ===');

			// 测试1: 创建和保存各种类型的笔记
			const testData = [
				{
					type: NoteType.FLEETING,
					title: 'Fleeting Test',
					content: 'Quick thought that came to mind',
					tags: ['fleeting', 'idea']
				},
				{
					type: NoteType.LITERATURE,
					title: 'Literature Test',
					content: 'Summary of an important paper',
					tags: ['literature', 'research']
				},
				{
					type: NoteType.PERMANENT,
					title: 'Permanent Test',
					content: 'Well-developed permanent knowledge',
					tags: ['permanent', 'knowledge']
				},
				{
					type: NoteType.ATOMIC,
					title: 'Atomic Test',
					content: 'Single atomic concept',
					tags: ['atomic', 'concept']
				}
			];

			const createdNotes: BaseNote[] = [];

			for (const data of testData) {
				const note = this.factory.createNote(data.type);
				note.setTitle(data.title);
				note.addTag(data.tags);
				note.addBodyContent(data.content, 'Main Content', 1);
				note.addBodyContent('Additional details and examples', 'Details', 2);

				// 保存笔记
				await note.save();
				createdNotes.push(note);

				console.log(`Created ${data.type} note: ${note.getTitle()}`);
			}

			// 测试2: 链接笔记
			console.log('\n=== Testing Note Linking ===');
			const mainNote = createdNotes[0];
			const linkedNote = createdNotes[1];

			mainNote.addLinkedPage(linkedNote.getTitle(), 'Related Notes', 'list');
			console.log('Added link from', mainNote.getTitle(), 'to', linkedNote.getTitle());

			// 测试3: 属性操作
			console.log('\n=== Testing Property Operations ===');
			const testNote = createdNotes[2];

			// 添加各种属性
			testNote.setProperty('custom_field', 'custom_value');
			testNote.setProperty('priority', 'high');
			testNote.setProperty('due_date', '2024-01-01');

			console.log('Custom properties added:', {
				custom_field: testNote.getProperty('custom_field'),
				priority: testNote.getProperty('priority'),
				due_date: testNote.getProperty('due_date')
			});

			// 测试4: 工厂修改功能
			console.log('\n=== Testing Factory Modifications ===');
			this.factory.applyModifications(testNote, {
				properties: {
					'modified_by': 'debug_plugin',
					'test_mode': true
				},
				sections: [
					{
						name: 'Debug Info',
						content: 'This section was added by debug plugin',
						level: 1
					}
				]
			});

			console.log('Applied modifications to note');

			console.log('\n=== Comprehensive Test Completed ===');
			console.log(`Created ${createdNotes.length} test notes`);
			console.log('All tests passed successfully!');

			new Notice(`Comprehensive test completed! Created ${createdNotes.length} notes.`);

		} catch (error) {
			console.error('Error in comprehensive test:', error);
			new Notice(`Error: ${error.message}`);
		}
	}

	onunload() {
		console.log('Debug Plugin unloaded');
	}
}
