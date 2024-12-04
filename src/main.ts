import "dotenv/config";
import { createHash } from "node:crypto";
import { Webhook } from "simple-discord-webhooks";
import {
    Grade,
    type Grades,
    IntranetClient,
    IntranetNotLoggedInError,
} from "./intranet";
import { readFile, writeFile, access, mkdir } from "node:fs/promises";
import { dirname } from "path";
import { APIEmbed } from "discord-api-types/v10";

type HashedGrade = Grade & {
    hash: string;
};
type HashedGrades = Array<HashedGrade>;

const TIMEOUT = (parseInt(process.env.TIMEOUT!) || 14400) * 1000;
const MAX_RETRY = parseInt(process.env.LOGIN_RETRY_MAX!) || 3;
const LOGIN_RETRY_DELAY =
    (parseInt(process.env.LOGIN_RETRY_DELAY!) || 3000) * 1000;
const EMBED: APIEmbed = {
    title: "Nouvelle(s) note(s) disponible(s) !",
    color: 0x06d6a0,
    thumbnail: {
        url: "https://iut-rcc-intranet.univ-reims.fr/upload/logo/logo-iut-rcc.png",
    },
    fields: [],
    footer: {
        text: "IUT Grades Tracker bot © LockBlock-dev",
    },
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const hashNotes = (notes: Grades) => {
    notes.forEach((n) => {
        Object.defineProperty(n, "hash", {
            value: createHash("sha1")
                .update(JSON.stringify(n))
                .digest("base64"),
        });
    });
};

const fileExists = async (filePath: string) => {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
};

const log = (msg: string) => console.log(`${new Date().toISOString()}: ${msg}`);
const err = (err: unknown) => console.error(new Date().toISOString(), err);

const loginWithRetries = async (client: IntranetClient) => {
    let attempts = 0;

    while (attempts < MAX_RETRY) {
        try {
            await client.login(process.env.USERNAME!, process.env.PASSWORD!);

            log("Login successful!");

            return;
        } catch (e) {
            err(`Login attempt ${attempts + 1} failed: ${e}`);

            attempts++;

            if (attempts >= MAX_RETRY) {
                throw new Error("Maximum login attempts exceeded.");
            }
        }

        await delay(LOGIN_RETRY_DELAY);
    }
};

const fetchAndUpdateGrades = async (
    client: IntranetClient,
    slug: string,
    embed: APIEmbed,
) => {
    log("Fetching grades...");

    const grades = await client.getGrades(slug);
    const savePath = process.env.SAVE_PATH!;

    hashNotes(grades);

    if (!(await fileExists(savePath))) {
        const dirPath = dirname(savePath);

        await mkdir(dirPath, { recursive: true });

        await writeFile(savePath, JSON.stringify(grades), {
            encoding: "utf-8",
        });
    }

    const oldGrades: HashedGrades = JSON.parse(
        await readFile(savePath, { encoding: "utf-8" }),
    );
    const newGrades = (grades as HashedGrades).filter(
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
        await writeFile(savePath, JSON.stringify(grades), {
            encoding: "utf-8",
        });

        log("New grades detected and saved.");
    } else {
        log("No new grades detected.");
    }

    return embed;
};

const main = async () => {
    const client = new IntranetClient();
    const postman = new Webhook(new URL(process.env.DISCORD_WEBHOOK!));

    try {
        await loginWithRetries(client);

        const slug = await client.getMySlug();

        if (!slug) throw new Error("Failed to retrieve user slug.");

        while (true) {
            const embed = Object.assign({}, EMBED);

            try {
                const updatedEmbed = await fetchAndUpdateGrades(
                    client,
                    slug,
                    embed,
                );

                if (updatedEmbed.fields!.length > 0) {
                    await postman.send("", [updatedEmbed]);
                    log("Embed sent successfully.");
                } else {
                    log("No updates to send.");
                }
            } catch (e) {
                if (e instanceof IntranetNotLoggedInError) {
                    err("Session expired, attempting to re-login...");

                    await loginWithRetries(client);
                } else {
                    err(e);

                    embed.title = "Bad news!";
                    embed.color = 0xed1c24;
                    embed.fields!.push({ name: "Error", value: `${e}` });

                    await postman.send("", [embed]);
                }
            }

            await delay(TIMEOUT);
        }
    } catch (e) {
        err(`Critical failure: ${e}`);
        process.exit(1);
    }
};

main();
