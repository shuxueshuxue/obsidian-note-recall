import { App, Editor, FileManager, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import * as path from 'path';
import { getRandomIndexes, similarity } from 'tools';

interface MyPluginSettings {
	difficuty: number;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	difficuty: 10  
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

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'start-game',
			name: 'Start game',
			callback: async () => {

				// read current file

				const activeFile = app.workspace.getActiveFile();

				if (!activeFile){
					new Notice("Please open a note file!")
					return
				}

				let modified_article = await app.vault.cachedRead(activeFile)
				if (modified_article.length < this.settings.difficuty){
					new Notice("Not enough words!")
					return
				}

				// generate word list 

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

				const chosenIndexes = getRandomIndexes(number_range, Math.round(englishWords.length / this.settings.difficuty));
				chosenIndexes.sort((a, b) => b - a);

				const chosenWords = chosenIndexes.map(index => englishWords[index]);
				
				// save it to data.json

				this.saveData(new SavedData(chosenWords.slice().reverse(), activeFile.path))
				
				// create challenge.md

				for (const index of chosenIndexes) {
					modified_article = modified_article.slice(0, wordPositions[index]) + "🏴🏴" + modified_article.slice(wordPositions[index] + englishWords[index].length);
				}
				
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

				// check if it's the right place

				const activeFile = app.workspace.getActiveFile();
				
				if (!activeFile || activeFile.basename != 'challenge'){
					new Notice("You can only do this on the challenge file!")
					return
				}

				// read answers and guesses

				let saved_data = await this.loadData()
				let answers = saved_data.words
				let original_file_path: string = saved_data.path

				let modified_article = await app.vault.cachedRead(activeFile)
				let guesses = new Array<string>()				

				const wordRegex: RegExp = /🏴(.*?)🏴/g;
				let match: RegExpExecArray | null = wordRegex.exec(modified_article);

				while (match) {
					guesses.push(match[0].replace(/🏴/g, ''));
					match = wordRegex.exec(modified_article);
				}

				// calculate scores

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

				// edit file

				for (let i = 0; i < guesses.length; i++) {
					const guess = guesses[i];
					const answer = answers[i];
					const score = scores[i];
					const flagColor =
					  score < 0.5 ? '🔴' : score < 0.9 ? '🟡' : '🟢';
					modified_article = modified_article.replace(
					  `🏴${guess}🏴`,
					  `🚩${guess}|${answer}${flagColor}`
					);
				  }
				modified_article = `# 📝 Score ${Math.round(finalScore)}\n🔙 [[${path.basename(original_file_path, '.md')}]]\n\n` + modified_article

				if (activeFile){
					app.vault.modify(activeFile, modified_article)
				}


			}
		})
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS);
	}
}

