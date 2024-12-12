import "dotenv/config";
import { TrackerClient } from "./tracker";

const main = async () => {
    await new TrackerClient(
        process.env.USERNAME!,
        process.env.PASSWORD!,
        process.env.SAVE_PATH!,
        process.env.DISCORD_WEBHOOK_URL!,
    ).run();
};

main();
