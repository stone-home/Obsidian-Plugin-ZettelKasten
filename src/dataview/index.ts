export { DataviewJSManager } from "./manager";
export { DataviewScriptBuilder } from "./builder";
export { DataviewCommand } from "./command";
export {
	ViewResearchDirectionLiteratureReview,
	ViewResearchDirectionTopic,
	ViewResearchTopicMyPapers,
	ViewResearchTopicPapers,
	ViewResearchLiteratureMetadata,
	ViewProjectCustomTable,
	ViewProjectGanttChart,
	ViewProjectReference,
	ViewNoteIndex,
} from "./views";
import {
	IDataviewParameter,
	IDataviewScript,
	IRawDataviewScript,
} from "./types";

export class DataviewHelper {
	static getCodeBlockContent(
		blockName: string,
		view: IRawDataviewScript | IDataviewScript,
		parameters?: IDataviewParameter[],
	): string {
		parameters = parameters || [];
		const params = parameters.map((param) => {
			return `${param.name}: ${JSON.stringify(param.value)}`;
		});
		return ["```" + blockName, view.id, ...params, "```"].join("\n");
	}
}
