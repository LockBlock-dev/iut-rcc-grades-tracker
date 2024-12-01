export class CASError extends Error {
    constructor(message?: string) {
        super(message);

        this.name = "CASError";
    }
}
