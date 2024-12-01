export class IntranetError extends Error {
    constructor(message?: string) {
        super(message);

        this.name = "IntranetError";
    }
}

export class IntranetNotLoggedInError extends Error {
    constructor() {
        super();

        this.name = "IntranetNotLoggedInError";
    }
}
