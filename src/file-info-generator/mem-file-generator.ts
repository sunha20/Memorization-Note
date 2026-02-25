import {FileRepository} from "./file-repository";
import {ObsidianControl} from "../obsidian-control";
import {Notice} from "obsidian";

export class MemFileGenerator {
	obsidian: ObsidianControl
	file: FileRepository
	hOption: string;
	cOption: string;
	headingReg = /^#+\s/;
	blankReg: RegExp;
	blankMark: string[]

	constructor(obsidian: ObsidianControl, file: FileRepository, option: string[], blankMark: string[]) {
		this.obsidian = obsidian;
		this.file = file;
		this.hOption = option[0];
		this.cOption = option[1];
		this.blankMark = blankMark;
		this.blankReg = this.getContentReg(blankMark);
	}

	async createMemFile() {
		let memContents = "";
		const memPath = this.setMemPath()

		if (this.cOption == "empty") {
			memContents = this.file.getAllHeading(this.hOption);
		}

		if (this.cOption == "blank") {
			if (this.blankMark[0] == this.blankMark[1]) {
				new Notice("Not allowing start and end marks to be the same");
				return;
			}
			memContents = this.setBlankContents();
			if (this.hOption == "link") memContents = this.setHeadingToLink(memContents);
		}

		if (this.cOption == "copy") {
			memContents = this.file.contents;
			if (this.hOption == "link") memContents = this.setHeadingToLink(memContents);
		}

		await this.obsidian.openFile(memPath, memContents);
		return;
	}

	private setMemPath() {
		const path = this.file.filePath;
		const pathList = path.split("/");
		pathList[pathList.length - 1] = this.setMemTitle() + ".md";
		return pathList.join("/");
	}

	private setMemTitle() {
		const title = this.file.title + "_mem ";
		let num = 1;

		if (this.file.folder == null) {
			return title;
		}

		for (const f of this.file.folder.children) {
			if (f.name.startsWith(title)) {
				const nameList = f.name.split(" ");
				const newNum = parseInt(nameList[nameList.length - 1]);
				if (newNum >= num) {
					num = newNum + 1;
				}
			}
		}
		return title + num;
	}

	private setHeadingToLink(memContents: string) {
		const contentsList = memContents.split('\n');
		for (let i = 0; i < contentsList.length; i++) {
			if (this.hOption == "link" && this.headingReg.test(contentsList[i])) {
				const text = contentsList[i].replaceAll(/#+\s/g,"");
				contentsList[i] = this.file.heading.getOneLinkHeading(text);
			}
		}
		memContents = contentsList.join("\n");

		return memContents;
	}

	private getContentReg(mark: string[]) {
		return new RegExp(`${mark[0]}.*?${mark[1]}`, 'gs');
	}

	private setBlankContents() {
		// const contents = this.file.contents.split("");
		let footNoteContents = "\n\n---\n";
		let footNoteIdx = 1;

		const processedContents = this.file.contents.replace(this.blankReg, (match) => {
			// match에는 "<u>정답</u>" 전체가 들어옴
			// 여기서 앞뒤 마크를 떼고 정답만 추출
			const answer = match.slice(this.blankMark[0].length, -this.blankMark[1].length);

			// 각주 생성
			footNoteContents += `\n[^${footNoteIdx}]: ${answer.replace(/\n/g, "/")}`;

			// 본문은 빈칸과 각주 번호로 치환
			const result = `{  |[^${footNoteIdx}]}`;
			footNoteIdx += 1;

			return result;
		});
		return processedContents + footNoteContents;
	}
}
