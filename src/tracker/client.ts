import { createHash } from "node:crypto";
import { Webhook } from "simple-discord-webhooks";
import {
    type Grades,
    IntranetClient,
    IntranetNotLoggedInError,
} from "../intranet";
import { readFile, writeFile, access, mkdir } from "node:fs/promises";
import { dirname } from "path";
import type { HashedGrades } from "./types";
import { BASE_EMBED, LOGIN_RETRY_DELAY, MAX_RETRY, TIMEOUT } from "./constants";
import type { APIEmbed } from "discord-api-types/v10";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fileExists = async (filePath: string) => {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
};

class TrackerClient {
    private intranetClient: IntranetClient;
    private username: string;
    private password: string;
    private savePath: string;
    private postman: Webhook;

    constructor(
        username: string,
        password: string,
        savePath: string,
        webhookUrl: string | URL,
    ) {
        this.username = username;
        this.password = password;
        this.savePath = savePath;

        this.postman = new Webhook(
            webhookUrl instanceof URL ? webhookUrl : new URL(webhookUrl),
        );
        this.intranetClient = new IntranetClient();
    }

    public static log(msg: string) {
        console.log(`${new Date().toISOString()}: ${msg}`);
    }

    public static err(err: unknown) {
        console.error(`${new Date().toISOString()}:`, err);
    }

    private hashGrades(grades: Grades): HashedGrades {
        return grades.map((n) => ({
            ...n,
            hash: createHash("sha1").update(JSON.stringify(n)).digest("base64"),
        }));
    }

    public async loginWithRetries() {
        let attempts = 0;

        while (attempts < MAX_RETRY) {
            try {
                await this.intranetClient.login(this.username, this.password);

                TrackerClient.log("Login successful!");

                return;
            } catch (e) {
                TrackerClient.err(`Login attempt ${attempts + 1} failed: ${e}`);

                attempts++;

                if (attempts >= MAX_RETRY)
                    throw new Error("Maximum login attempts exceeded.");
            }

            await delay(LOGIN_RETRY_DELAY);
        }
    }

    public async fetchAndUpdateGrades(slug: string, embed: APIEmbed) {
        TrackerClient.log("Fetching grades...");

        const grades = this.hashGrades(
            await this.intranetClient.getGrades(slug),
        );

        if (!(await fileExists(this.savePath))) {
            const dirPath = dirname(this.savePath);

            await mkdir(dirPath, { recursive: true });

            await writeFile(this.savePath, JSON.stringify([]), {
                encoding: "utf-8",
            });
        }

        const oldGrades: HashedGrades = JSON.parse(
            await readFile(this.savePath, { encoding: "utf-8" }),
        );

        const newGrades = grades.filter(
            (n) => !oldGrades.some((o) => o.hash === n.hash),
        );

        if (newGrades.length > 0) {
            for (const grade of newGrades) {
                let name = grade.subject.short;

                if (grade.subject.full) name += ` | ${grade.subject.full}`;

                embed.fields!.push({
                    name,
                    value: `Evaluation: ${grade.evaluation}
                    Date: <t:${grade.date.toUnixInteger()}:D>
                    Note: \`${grade.grade}\`
                    Coefficient: \`${grade.coefficient}\``,
                });
            }
            await writeFile(this.savePath, JSON.stringify(grades), {
                encoding: "utf-8",
            });

            TrackerClient.log("New grades detected and saved.");
        } else {
            TrackerClient.log("No new grades detected.");
        }

        return embed;
    }

    public async run() {
        try {
            await this.loginWithRetries();

            const slug = await this.intranetClient.getMySlug();

            if (!slug) throw new Error("Failed to retrieve user slug.");

            while (true) {
                const embed = structuredClone(BASE_EMBED);

                try {
                    const updatedEmbed = await this.fetchAndUpdateGrades(
                        slug,
                        embed,
                    );

                    if (updatedEmbed.fields!.length > 0) {
                        await this.postman.send("", [updatedEmbed]);
                        TrackerClient.log("Embed sent successfully.");
                    } else {
                        TrackerClient.log("No updates to send.");
                    }
                } catch (e) {
                    if (e instanceof IntranetNotLoggedInError) {
                        TrackerClient.err(
                            "Session expired, attempting to re-login...",
                        );

                        try {
                            await this.loginWithRetries();
                            TrackerClient.log(
                                "Re-login successful. Resuming fetch...",
                            );
                            continue;
                        } catch (reLoginError) {
                            TrackerClient.err(
                                `Re-login failed: ${reLoginError}`,
                            );
                            break;
                        }
                    } else {
                        TrackerClient.err(e);

                        embed.title = "Bad news!";
                        embed.color = 0xed1c24;
                        embed.fields!.push({ name: "Error", value: `${e}` });

                        await this.postman.send("", [embed]);
                    }
                }

                await delay(TIMEOUT);
            }
        } catch (e) {
            TrackerClient.err(`Critical failure: ${e}`);
            process.exit(1);
        }
    }
}

export default TrackerClient;
