import { type APIEmbed } from "discord-api-types/v10";

export const TIMEOUT = (parseInt(process.env.TIMEOUT!) || 14400) * 1000;

export const MAX_RETRY = parseInt(process.env.LOGIN_RETRY_MAX!) || 3;

export const LOGIN_RETRY_DELAY =
    (parseInt(process.env.LOGIN_RETRY_DELAY!) || 3000) * 1000;

export const BASE_EMBED: APIEmbed = {
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
