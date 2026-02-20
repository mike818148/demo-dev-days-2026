import type { ModelMessage } from "ai";
import { runTransformAgent } from "../lib/skill-agent";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

function loadEnvFile(filePath: string) {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf8");

    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const idx = line.indexOf("=");
        if (idx === -1) continue;

        const key = line.slice(0, idx).trim();
        let value = line.slice(idx + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

function loadDotEnvFilesFromRepoRoot() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const repoRoot = path.resolve(__dirname, "..");
    loadEnvFile(path.join(repoRoot, ".env"));
    loadEnvFile(path.join(repoRoot, ".env.local"));
}

async function main() {
    loadDotEnvFilesFromRepoRoot();

    let sandboxId = process.env.SAIL_SANDBOX_ID ?? process.env.VERCEL_SANDBOX_ID ?? "";
    const messages: ModelMessage[] = [];

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    const ask = (): Promise<string> =>
        new Promise((resolve) => {
            rl.question("You: ", (line) => resolve((line ?? "").trim()));
        });

    console.log(
        "Conversation agent (same sandbox for all turns). Type a message and press Enter. Empty line or Ctrl+C to exit.\n"
    );

    for (; ;) {
        const userContent = await ask();
        if (userContent === "") {
            rl.close();
            break;
        }

        messages.push({ role: "user", content: userContent });

        const { text, responseMessages, sandboxId: returnedSandboxId } = await runTransformAgent({
            sandboxId,
            messages,
        });

        if (returnedSandboxId) sandboxId = returnedSandboxId;
        for (const msg of responseMessages) {
            messages.push(msg);
        }

        console.log("\nAssistant:", text, "\n");
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
