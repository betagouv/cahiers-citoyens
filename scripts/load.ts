import { runLoad } from "./load-notebooks";

await runLoad(process.argv.slice(2), process.env);
