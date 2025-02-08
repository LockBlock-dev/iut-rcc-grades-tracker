import { type DateTime } from "luxon";

export enum Language {
    FRENCH = "fr",
    ENGLISH = "en",
}

export enum UserType {
    STUDENT = "etudiant",
    STAFF = "personnel",
}

export enum GradesHeaderName {
    Subject = "subject",
    Evaluation = "evaluation",
    Date = "date",
    Comment = "comment",
    Grade = "grade",
    Coefficient = "coefficient",
    Id = "id",
}

export enum GradesHeaderType {
    STRING = "string",
    NUMBER = "number",
    DATE = "date",
    HTML = "html",
}

interface GradesHeader<T = Exclude<GradesHeaderType, GradesHeaderType.HTML>> {
    name: GradesHeaderName;
    type: T;
}

interface HTMLGradesHeader extends GradesHeader<GradesHeaderType.HTML> {
    get: (el: cheerio.Cheerio) => unknown;
}

export type GradesHeaders = Array<GradesHeader | HTMLGradesHeader>;

export interface Grade {
    subject: {
        short: string;
        full?: string;
    };
    evaluation: string;
    date: DateTime;
    comment: string;
    grade: number | null;
    coefficient: number | null;
    id: string | null;
}

export type Grades = Array<Grade>;
