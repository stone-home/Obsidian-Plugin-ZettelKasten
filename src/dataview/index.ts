export { DataviewJSManager } from "./manager";
export { DataviewScriptBuilder } from "./builder";
export {
	ViewResearchDirectionLiteratureReview,
	ViewResearchDirectionTopic,
	ViewResearchTopicMyPapers,
	ViewResearchTopicPapers,
	ViewResearchTopicReference,
	ViewResearchLiteratureRelevantPapers,
	ViewResearchLiteratureReferences,
	ViewResearchLiteratureMetadata,
	ViewProjectCustomTable,
	ViewProjectGanttChart
} from "./views";
import {IDataviewParameter, IDataviewScript, IRawDataviewScript} from "./types";


export class DataviewHelper {
	static getCodeBlockContent(blockName: string, view: IRawDataviewScript|IDataviewScript, parameters?: IDataviewParameter[]): string {
		parameters = parameters || [];
		const params = parameters.map(param => {
			return `${param.name}: ${JSON.stringify(param.value)}`;
		})
		return [
			"```" + blockName,
			view.id,
			...params,
			"```",
		].join("\n")
	}
}
