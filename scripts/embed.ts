import { runEmbed } from "./embed-chunks";

await runEmbed(process.argv.slice(2), process.env);
