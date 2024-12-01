import { GradesHeaders, GradesHeaderType } from "./types";

export const GRADES_HEADERS: GradesHeaders = [
    {
        name: "subject",
        type: GradesHeaderType.HTML,
        get: (el) => {
            return {
                short: el.text().trim(),
                full: el.find("abbr").attr("title"),
            };
        },
    },
    { name: "evaluation", type: GradesHeaderType.STRING },
    { name: "date", type: GradesHeaderType.DATE },
    { name: "comment", type: GradesHeaderType.STRING },
    { name: "grade", type: GradesHeaderType.NUMBER },
    { name: "coefficient", type: GradesHeaderType.NUMBER },
    {
        name: "id",
        type: GradesHeaderType.HTML,
        get: (el) => {
            const gradeLink =
                el.find("button").attr("data-modal-modal-url-value") || "";

            const gradeLinkRegex =
                /\/\w{2}\/application\/etudiant\/note\/details\/(?<id>\d+)/;

            const { id } = gradeLinkRegex.exec(gradeLink)?.groups || {
                id: null,
            };

            return id;
        },
    },
];
