import { type Grade } from "../intranet";

export type HashedGrade = Grade & {
    hash: string;
};

export type HashedGrades = Array<HashedGrade>;
