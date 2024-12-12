import { type Dispatcher } from "undici";
import { type Response } from "./types.js";

export class HttpError extends Error {
    status: number;
    statusText: string;
    headers: Dispatcher.ResponseData["headers"];

    constructor(resp: Response) {
        super(`${resp.status} ${resp.statusText}`);

        this.name = "HttpError";
        this.status = resp.status;
        this.statusText = resp.statusText;
        this.headers = resp.headers;
    }
}
