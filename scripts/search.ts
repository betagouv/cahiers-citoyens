import { runSearch } from "./search-chunks";

await runSearch(process.argv.slice(2), process.env);
