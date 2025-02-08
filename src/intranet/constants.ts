import {
    type GradesHeaders,
    GradesHeaderName,
    GradesHeaderType,
} from "./types";

export const GRADES_HEADERS: GradesHeaders = [
    {
        name: GradesHeaderName.Subject,
        type: GradesHeaderType.HTML,
        get: (el) => {
            return {
                short: el.text().trim(),
                full: el.find("abbr").attr("title"),
            };
        },
    },
    { name: GradesHeaderName.Evaluation, type: GradesHeaderType.STRING },
    { name: GradesHeaderName.Date, type: GradesHeaderType.DATE },
    { name: GradesHeaderName.Comment, type: GradesHeaderType.STRING },
    { name: GradesHeaderName.Grade, type: GradesHeaderType.NUMBER },
    { name: GradesHeaderName.Coefficient, type: GradesHeaderType.NUMBER },
    {
        name: GradesHeaderName.Id,
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
