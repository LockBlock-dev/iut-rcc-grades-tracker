import * as cookie from "cookie";
import * as cheerio from "cheerio";

import { CAS } from "../cas";
import { HttpClient, HttpError } from "../http";
import { IntranetError, IntranetNotLoggedInError } from "./errors";
import { type Grades, UserType, Language } from "./types";
import { DateTime } from "luxon";
import { GRADES_HEADERS } from "./constants";

class IntranetClient {
    private url: string;
    private cas: CAS;
    public http: HttpClient;
    public PHPSESSID?: string;

    constructor(PHPSESSID?: string) {
        this.url = process.env.SERVICE_URL!;
        this.cas = new CAS(`${this.url}${process.env.SERVICE_CAS_PATH}`);
        this.PHPSESSID = PHPSESSID;

        this.http = new HttpClient(`${this.url}/${Language.FRENCH}`, {
            Cookie: `PHPSESSID=${this.PHPSESSID}`,
        });
    }

    public async login(username: string, password: string) {
        const ticket = await this.cas.login(username, password);
        const intranetCasLoginUrl = `${this.url}${process.env.SERVICE_CAS_PATH}`;

        let resp = await HttpClient.get({
            url: intranetCasLoginUrl,
            query: new URLSearchParams({
                ticket,
            }),
        });

        let setCookie = resp.headers["set-cookie"];

        if (!setCookie)
            throw new IntranetError(
                "Could not get Intranet PHPSESSID cookie 1/2!",
            );

        let maybePHPSESSID = (
            Array.isArray(setCookie) ? setCookie : [setCookie]
        ).find((c) => c.startsWith("PHPSESSID="));

        if (!maybePHPSESSID)
            throw new IntranetError(
                "Could not get Intranet PHPSESSID cookie 1/2!",
            );

        const { PHPSESSID } = cookie.parse(maybePHPSESSID);

        if (!PHPSESSID)
            throw new IntranetError(
                "Could not get Intranet PHPSESSID cookie 1/2!",
            );

        resp = await HttpClient.get({
            url: intranetCasLoginUrl,
            headers: {
                Cookie: `PHPSESSID=${PHPSESSID}`,
            },
        });

        setCookie = resp.headers["set-cookie"];

        if (!setCookie)
            throw new IntranetError(
                "Could not get Intranet PHPSESSID cookie 2/2!",
            );

        maybePHPSESSID = (
            Array.isArray(setCookie) ? setCookie : [setCookie]
        ).find((c) => c.startsWith("PHPSESSID="));

        if (!maybePHPSESSID)
            throw new IntranetError(
                "Could not get Intranet PHPSESSID cookie 2/2!",
            );

        let { PHPSESSID: PHPSESSID2 } = cookie.parse(maybePHPSESSID);

        if (!PHPSESSID2)
            throw new IntranetError(
                "Could not get Intranet PHPSESSID cookie 2/2!",
            );

        this.PHPSESSID = PHPSESSID2;

        this.http.setHeader("Cookie", `PHPSESSID=${this.PHPSESSID}`);

        return this.PHPSESSID;
    }

    /**
     * @see {@link https://github.com/Dannebicque/intranetV3/blob/9a54f2bbe2a741960c5fafb6a132ff8d9d05cf8d/templates/user/profil.html.twig}
     */
    public async getMySlug() {
        if (!this.PHPSESSID) throw new IntranetNotLoggedInError();

        const resp = await this.http.get({
            path: "/utilisateur/mon-profil",
        });

        if (!resp.ok) {
            if (resp.status === 302) throw new IntranetNotLoggedInError();
            else
                throw new IntranetError(
                    `Could not GET your profile page: ${
                        new HttpError(resp).message
                    }`,
                );
        }

        const $ = cheerio.load(await resp.text());

        const slugLinkRegex =
            /\/\w{2}\/etudiant\/profil\/(?<slug>[a-zA-Z0-9.-_]+\.[a-zA-Z0-9.-_]+)\/\w+/;

        const slugLink =
            $("nav.nav").children("a.nav-link").first().attr("href") || "";

        const { slug } = slugLinkRegex.exec(slugLink)?.groups || { slug: null };

        return slug;
    }

    /**
     * @see {@link https://github.com/Dannebicque/intranetV3/blob/9a54f2bbe2a741960c5fafb6a132ff8d9d05cf8d/templates/user/composants/_apropos.html.twig}
     */
    public async getMyAboutMe() {
        if (!this.PHPSESSID) throw new IntranetNotLoggedInError();

        const slug = await this.getMySlug();

        if (!slug) throw new IntranetError("Could not get your slug!");

        const resp = await this.http.get({
            path: `/etudiant/profil/${slug}/a-propos`,
        });

        if (!resp.ok) {
            if (resp.status === 302) throw new IntranetNotLoggedInError();
            else
                throw new IntranetError(
                    `Could not GET your about me page: ${
                        new HttpError(resp).message
                    }`,
                );
        }

        const $ = cheerio.load(await resp.text());

        // ToDo parsing

        return $("body").text();
    }

    /**
     * @see {@link https://github.com/Dannebicque/intranetV3/blob/9a54f2bbe2a741960c5fafb6a132ff8d9d05cf8d/templates/user/profil.html.twig}
     */
    public async getUserProfile(
        slug: string,
        userType: UserType = UserType.STUDENT,
    ) {
        if (!this.PHPSESSID) throw new IntranetNotLoggedInError();

        const resp = await this.http.get({
            path: `/utilisateur/${userType}/${slug}`,
        });

        if (!resp.ok) {
            if (resp.status === 302) throw new IntranetNotLoggedInError();
            else
                throw new IntranetError(
                    `Could not GET user profile page: ${
                        new HttpError(resp).message
                    }`,
                );
        }

        const $ = cheerio.load(await resp.text());

        // ToDo parsing

        return $("body").text();
    }

    /**
     * @see {@link https://github.com/Dannebicque/intranetV3/blob/9a54f2bbe2a741960c5fafb6a132ff8d9d05cf8d/templates/user/composants/_notes.html.twig}
     */
    public async getGrades(slug: string) {
        if (!this.PHPSESSID) throw new IntranetNotLoggedInError();

        const resp = await this.http.get({
            path: `/etudiant/profil/${slug}/notes`,
        });

        if (!resp.ok) {
            if (resp.status === 302) throw new IntranetNotLoggedInError();
            else
                throw new IntranetError(
                    `Could not GET your grades page: ${
                        new HttpError(resp).message
                    }`,
                );
        }

        const $ = cheerio.load(await resp.text());

        return $("tbody")
            .children("tr")
            .map((_, tr) =>
                $(tr)
                    .children("td")
                    .map((idx, td) => {
                        if (!(idx in GRADES_HEADERS)) return;

                        const header = GRADES_HEADERS[idx];
                        let _data = $(td).text().trim();

                        switch (header.type) {
                            case "string": {
                                return _data;
                            }
                            case "number": {
                                /*
                                The grade is by default in french notation XX,XX
                                here we transform the string number into english notation XX.XX
                                and parse it as a float.
                                */
                                const grade = parseFloat(
                                    _data.replace(",", "."),
                                );

                                if (isNaN(grade)) return null;

                                return grade;
                            }
                            case "date": {
                                return DateTime.fromFormat(
                                    _data,
                                    "d LLLL yyyy",
                                    { locale: "fr" },
                                );
                            }
                            case "html": {
                                return header.get($(td));
                            }
                            default: {
                                return _data;
                            }
                        }
                    })
                    .get()
                    .reduce(
                        (acc, val, idx) => ({
                            ...acc,
                            [GRADES_HEADERS[idx].name]: val,
                        }),
                        {},
                    ),
            )
            .get() as Grades;
    }

    /**
     * @see {@link https://github.com/Dannebicque/intranetV3/blob/9a54f2bbe2a741960c5fafb6a132ff8d9d05cf8d/templates/trombinoscope/trombiEtudiant.html.twig}
     */
    public async getClassmates(semesterNumber: number, groupType?: number) {
        if (!this.PHPSESSID) throw new IntranetNotLoggedInError();

        const resp = await this.http.get({
            path: `/trombinoscope/${UserType.STUDENT}/${semesterNumber}${
                groupType ? `/${groupType}` : ""
            }`,
        });

        if (!resp.ok) {
            if (resp.status === 302) throw new IntranetNotLoggedInError();
            else
                throw new IntranetError(
                    `Could not GET your classmates page: ${
                        new HttpError(resp).message
                    }`,
                );
        }

        const $ = cheerio.load(await resp.text());

        // ToDo parsing

        return $("body").text();
    }
}

export default IntranetClient;
