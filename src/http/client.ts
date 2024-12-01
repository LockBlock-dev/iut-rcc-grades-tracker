import { type Dispatcher, request } from "undici";
import { STATUS_CODES } from "node:http";

interface RequestOptions {
    method: Dispatcher.HttpMethod;
    url: string | URL;
    body?: unknown;
    headers?: Record<string, string>;
    query?: URLSearchParams;
    validateStatus?: (statusCode: number) => boolean;
}

interface SimplifiedRequestOptions extends Omit<RequestOptions, "url"> {
    path?: string;
}

type UndiciRequestOptions = Parameters<typeof request>[1];
type UndiciRequestBody = Dispatcher.DispatchOptions["body"];

class HttpClient {
    private url: string;
    private headers: Record<string, string>;

    constructor(url: string | URL, headers: Record<string, string> = {}) {
        this.url = url instanceof URL ? url.toString() : url;
        this.headers = headers;
    }

    public setHeader(key: string, value: string) {
        this.headers[key] = value;
    }

    public async get(
        options: Omit<SimplifiedRequestOptions, "method" | "body">
    ) {
        return HttpClient.get({
            url: `${this.url}${options.path || ""}`,
            ...options,
            headers: {
                ...this.headers,
                ...options.headers,
            },
        });
    }

    public async post(options: Omit<SimplifiedRequestOptions, "method">) {
        return HttpClient.post({
            url: `${this.url}${options.path || ""}`,
            ...options,
            headers: {
                ...this.headers,
                ...options.headers,
            },
        });
    }

    public async request(options: SimplifiedRequestOptions) {
        return HttpClient.request({
            url: `${this.url}${options.path || ""}`,
            ...options,
            headers: {
                ...this.headers,
                ...options.headers,
            },
        });
    }

    public static async post(options: Omit<RequestOptions, "method">) {
        return HttpClient.request({
            method: "POST",
            ...options,
        });
    }

    public static async get(options: Omit<RequestOptions, "method" | "body">) {
        return HttpClient.request({
            method: "GET",
            ...options,
        });
    }

    public static async request(options: RequestOptions) {
        const { body, contentType } = HttpClient.processBody(options.body);

        let url =
            options.url instanceof URL ? options.url.toString() : options.url;

        if (options.query) url = `${url}?${options.query.toString()}`;

        const undiciOptions: UndiciRequestOptions = {
            method: options.method,
            body,
            headers: {
                ...options.headers,
                ...contentType,
            },
        };

        const response = await request(url, undiciOptions);

        return {
            body: response.body,
            headers: response.headers,
            ok: (options.validateStatus || HttpClient.validateStatus)(
                response.statusCode
            ),
            status: response.statusCode,
            statusText: STATUS_CODES[response.statusCode] || "Unknown Status",
            url,

            async json() {
                return response.body.json();
            },
            async text() {
                return response.body.text();
            },
        };
    }

    private static processBody(body?: unknown) {
        let finalBody: UndiciRequestBody;
        let contentType = "";

        if (body instanceof URLSearchParams) {
            finalBody = body.toString();
            contentType = "application/x-www-form-urlencoded";
        } else if (!!body && Object.getPrototypeOf(body) === Object.prototype) {
            finalBody = JSON.stringify(body);
            contentType = "application/json";
        }

        return {
            body: finalBody,
            contentType: { "Content-Type": contentType },
        };
    }

    private static validateStatus(statusCode: number) {
        return statusCode >= 200 && statusCode < 300;
    }
}

export default HttpClient;
