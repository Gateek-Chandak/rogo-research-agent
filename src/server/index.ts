/** Express bootstrap. */

import "dotenv/config";
import express from "express";
import { chatRouter } from "./routes/chat.ts";
import { companiesRouter } from "./routes/companies.ts";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "\nANTHROPIC_API_KEY is not set.\nCopy .env.example to .env and add your key, then run `npm run dev` again.\n",
  );
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use("/api/chat", chatRouter);
app.use("/api/companies", companiesRouter);

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`Agent server listening on http://localhost:${port}`);
});
