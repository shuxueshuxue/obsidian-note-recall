import { App, Editor, FileManager, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import * as path from 'path';
import { getRandomIndexes, similarity } from 'tools';

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

class SavedData {
	words: Array<string>
	path: string
	constructor(words: Array<string>, path: string) {
		this.words = words
		this.path = path
	}
}

export default class NoteRecall extends Plugin {
	settings: MyPluginSettings;

	async get_file_content(){
		const { vault } = this.app;
		const activeFile = app.workspace.getActiveFile();

		if (activeFile) {
		return vault.cachedRead(activeFile);
		}
		else{
			return ""
		}
	}

	async create_file(content: string){
		this.app.vault.create("challenge.md", content)
		this.app.workspace.openLinkText("challenge.md", "/");

		// await this.saveData(new SavedData(['1', '2']))
		// let loaded_data = await this.loadData()
		// console.log(loaded_data.words)
	}

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		this.addCommand({
			id: 'start-game',
			name: 'Start game',
			callback: async () => {
				let modified_article = await this.get_file_content()
				
				const englishWords: string[] = [];
				const wordPositions: number[] = [];

				const wordRegex: RegExp = /\b[a-zA-Z]+\b/g;
				let match: RegExpExecArray | null = wordRegex.exec(modified_article);

				while (match !== null) {
					englishWords.push(match[0]);
					wordPositions.push(match.index);
					match = wordRegex.exec(modified_article);
				}

				const number_range = [...Array(englishWords.length).keys()];

				const chosenIndexes = getRandomIndexes(number_range, Math.round(englishWords.length / 10));
				chosenIndexes.sort((a, b) => b - a);

				const chosenWords = chosenIndexes.map(index => englishWords[index]);
				
				const activeFile = app.workspace.getActiveFile();

				// save it to data.json

				if (activeFile){
					this.saveData(new SavedData(chosenWords.slice().reverse(), activeFile.path))
				}
				console.log(chosenWords.slice().reverse(), chosenWords)
				

				// console.log(englishWords, chosenIndexes, chosenWords)
				// console.log(chosenIndexes, chosenWords)
				for (const index of chosenIndexes) {
					modified_article = modified_article.slice(0, wordPositions[index]) + "🏴🏴" + modified_article.slice(wordPositions[index] + englishWords[index].length);
				}
				
				console.log(modified_article)
				
				let challenge_file = this.app.vault.getAbstractFileByPath("challenge.md")
				if (challenge_file instanceof TFile){
					await this.app.vault.modify(challenge_file, modified_article)
				}
				else{
					await this.app.vault.create("challenge.md", modified_article)
				}
				this.app.workspace.openLinkText("challenge.md", "/");
			},
		})

		this.addCommand({
			id: 'submit',
			name: 'Submit',
			callback: async () => {
				const activeFile = app.workspace.getActiveFile();

				let saved_data = await this.loadData()
				let answers = saved_data.words
				let original_file_path: string = saved_data.path
				let modified_article = await this.get_file_content()
				let guesses = new Array<string>()				

				console.log(answers, original_file_path)
				
				const wordRegex: RegExp = /🏴(.*?)🏴/g;
				let match: RegExpExecArray | null = wordRegex.exec(modified_article);

				while (match !== null) {
					guesses.push(match[0].replace(/🏴/g, ''));
					match = wordRegex.exec(modified_article);
				}

				let totalScore = 0;
				const scores: number[] = [];

				for (let i = 0; i < guesses.length; i++) {
					const guess = guesses[i];
					const answer = answers[i];
					if (guess && answer){
						const score = similarity(guess, answer);
						totalScore += score;
						scores.push(score);
					}
					else{
						scores.push(0)
					}
				}

				const finalScore = (100 * totalScore) / guesses.length;

				for (let i = 0; i < guesses.length; i++) {
					const guess = guesses[i];
					const answer = answers[i];
					const score = scores[i];
					console.log(score)
					const flagColor =
					  score < 0.5 ? '🔴' : score < 0.9 ? '🟡' : '🟢';
					modified_article = modified_article.replace(
					  `🏴${guess}🏴`,
					  `🚩${guess}|${answer}${flagColor}`
					);
				  }
				console.log(original_file_path)
				modified_article = `# 📝 Score ${Math.round(finalScore)}\n🔙 [[${path.basename(original_file_path, '.md')}]]\n\n` + modified_article

				if (activeFile){
					app.vault.modify(activeFile, modified_article)
				}


			}
		})

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: NoteRecall;

	constructor(app: App, plugin: NoteRecall) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
