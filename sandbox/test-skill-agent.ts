import { runTransformAgent } from "../lib/skill-agent";
import fs from "node:fs";
import path from "node:path";
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

        // Strip surrounding quotes
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        // Only set if not already set in process.env
        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

function loadDotEnvFilesFromRepoRoot() {
    // repoRoot = one directory up from /sandbox
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const repoRoot = path.resolve(__dirname, "..");

    // Match Next.js precedence: .env.local overrides .env
    loadEnvFile(path.join(repoRoot, ".env"));
    loadEnvFile(path.join(repoRoot, ".env.local"));
}

async function main() {
    loadDotEnvFilesFromRepoRoot();

    const promptArg = process.argv.slice(2).join(" ").trim();
    const prompt =
        promptArg ||
        "Say what skills you loaded and what you can do. Do not apply changes.";

    const { text } = await runTransformAgent({
        sandboxId: "",
        prompt,
    });

    console.log(text);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

