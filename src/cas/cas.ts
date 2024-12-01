import * as cheerio from "cheerio";

import { CASError } from "./errors";
import { HttpClient, HttpError } from "../http";

class CAS {
    private url: string;
    private serviceUrl: string;
    private http: HttpClient;

    constructor(serviceUrl: string | URL) {
        this.url = process.env.CAS_URL!;
        this.serviceUrl =
            serviceUrl instanceof URL ? serviceUrl.toString() : serviceUrl;
        this.http = new HttpClient(this.url);
    }

    async login(username: string, password: string) {
        let resp = await this.http.get({
            query: new URLSearchParams({
                service: this.serviceUrl,
            }),
            headers: {
                "User-Agent": process.env.USER_AGENT!,
            },
        });

        if (!resp.ok)
            throw new CASError(
                `Could not GET CAS login page: ${new HttpError(resp).message}`
            );

        const $ = cheerio.load(await resp.text());

        const formData = $('input[type="hidden"]')
            .get()
            .reduce<Record<string, string>>((acc, input) => {
                const name = $(input).attr("name");

                if (name) acc[name] = $(input).val() ?? "";

                return acc;
            }, {});

        if (!Object.keys(formData).length)
            throw new CASError(
                "Could not get form data (execution, _eventId, geolocation)!"
            );

        resp = await this.http.post({
            query: new URLSearchParams({
                service: this.serviceUrl,
            }),
            headers: {
                "User-Agent": process.env.USER_AGENT!,
            },
            body: new URLSearchParams({
                username,
                password,
                ...formData,
            }),
        });

        const location = resp.headers["location"] as string | undefined;

        if (!location || !location?.includes("ticket"))
            throw new CASError("CAS didnt redirect properly!");

        const ticket = new URL(location).searchParams.get("ticket");

        if (!ticket) throw new CASError("CAS ticket is empty!");

        return ticket;
    }
}

export default CAS;
