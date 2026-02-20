import { Sandbox } from "@vercel/sandbox";


const SAIL_VERSION = "2.2.10";
const SANDBOX_TIMEOUT_MS = 15 * 60 * 1000;

type SandboxApiErrorLike = {
    response?: { status?: number };
    json?: { error?: { code?: string } };
};

function isSandboxStoppedError(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const e = err as SandboxApiErrorLike;
    return e.response?.status === 410 || e.json?.error?.code === "sandbox_stopped";
}

async function createFreshSandbox(): Promise<Sandbox> {
    return Sandbox.create({ timeout: SANDBOX_TIMEOUT_MS });
}

async function getOrCreateHealthySandbox(existingId?: string): Promise<Sandbox> {
    if (!existingId) {
        return createFreshSandbox();
    }

    try {
        const existing = await Sandbox.get({ sandboxId: existingId });
        // Probe command: some sandboxes are retrievable but no longer runnable.
        await existing.runCommand({
            cmd: "bash",
            args: ["-lc", "true"],
            cwd: "/vercel/sandbox",
        });
        console.log("[createSailCLISandbox] Reusing existing sandbox:", existingId);
        return existing;
    } catch (err) {
        if (isSandboxStoppedError(err)) {
            console.warn(
                "[createSailCLISandbox] Existing sandbox is stopped; creating a fresh sandbox:",
                existingId
            );
            return createFreshSandbox();
        }

        console.warn(
            "[createSailCLISandbox] Could not reuse existing sandbox, creating new one:",
            err
        );
        return createFreshSandbox();
    }
}

/** Writes SAIL_* env vars into the sandbox so bash-tool commands can use them. */
async function ensureSailEnvInSandbox(sandbox: Sandbox): Promise<void> {
    const { SAIL_BASE_URL, SAIL_CLIENT_ID, SAIL_CLIENT_SECRET } = process.env;
    if (!SAIL_BASE_URL || !SAIL_CLIENT_ID || !SAIL_CLIENT_SECRET) {
        console.warn(
            "[createSailCLISandbox] SAIL_BASE_URL / SAIL_CLIENT_ID / SAIL_CLIENT_SECRET not set. (This is OK unless you need Sail authenticated commands.)"
        );
        return;
    }
    const envScript = [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        "",
        `export SAIL_BASE_URL=${JSON.stringify(SAIL_BASE_URL)}`,
        `export SAIL_CLIENT_ID=${JSON.stringify(SAIL_CLIENT_ID)}`,
        `export SAIL_CLIENT_SECRET=${JSON.stringify(SAIL_CLIENT_SECRET)}`,
        "",
    ].join("\n");

    await sandbox.writeFiles([
        {
            path: "/vercel/sandbox/sail-env.sh",
            content: Buffer.from(envScript, "utf8"),
        },
    ]);

    await sandbox.runCommand({
        cmd: "bash",
        args: ["-lc", "chmod 600 /vercel/sandbox/sail-env.sh || true"],
        cwd: "/vercel/sandbox",
    });
}

/** Optional: pass sandboxId to reuse an existing sandbox, or set VERCEL_SANDBOX_ID / SAIL_SANDBOX_ID in env. */
export async function createSailCLISandbox(options?: {
    sandboxId?: string;
}): Promise<Sandbox> {
    const existingId =
        options?.sandboxId ??
        process.env.VERCEL_SANDBOX_ID ??
        process.env.SAIL_SANDBOX_ID;

    const sandbox = await getOrCreateHealthySandbox(existingId);

    // Check if sail is already installed (avoid re-install on reused sandbox)
    const checkSail = await sandbox.runCommand({
        cmd: "bash",
        args: [
            "-lc",
            `
      set -e
      if command -v sail >/dev/null 2>&1; then
        sail --version
        exit 0
      fi
      # If sail not on PATH, try common location after RPM install
      if [ -x /usr/local/bin/sail ]; then
        /usr/local/bin/sail --version
        exit 0
      fi
      exit 1
      `,
        ],
        cwd: "/vercel/sandbox",
    });

    if (checkSail.exitCode === 0) {
        console.log("[createSailCLISandbox] Sail CLI already installed, skipping install.");
        await ensureSailEnvInSandbox(sandbox);
        return sandbox;
    }

    // Install sail (RPM) using sudo + dnf (Amazon Linux)
    const install = await sandbox.runCommand({
        cmd: "bash",
        args: [
            "-lc",
            `
      set -euo pipefail
      curl -fsSL -o /tmp/sail.rpm \
        "https://github.com/sailpoint-oss/sailpoint-cli/releases/download/${SAIL_VERSION}/sail_${SAIL_VERSION}_linux_amd64.rpm"
      sudo dnf install -y /tmp/sail.rpm

      # The RPM can install 'sail' outside of PATH in some sandbox images.
      # Ensure 'sail' is discoverable before calling it.
      if ! command -v sail >/dev/null 2>&1; then
        echo "[createSailCLISandbox] 'sail' not found on PATH. Locating installed binary..."
        if command -v rpm >/dev/null 2>&1; then
          sail_path="$(rpm -ql sail | awk '/\\/sail$/ {print; exit}' || true)"
          if [ -n "\${sail_path:-}" ] && [ -f "$sail_path" ]; then
            echo "[createSailCLISandbox] Found sail at: $sail_path"
            sudo ln -sf "$sail_path" /usr/local/bin/sail || true
            export PATH="/usr/local/bin:$PATH"
          else
            echo "[createSailCLISandbox] Could not locate sail via rpm query."
          fi
        else
          echo "[createSailCLISandbox] rpm not available to locate sail."
        fi
      fi

      command -v sail
      sail --version
      `,
        ],
        cwd: "/vercel/sandbox",
    });
    const installStdout = await install.stdout();
    const installStderr = await install.stderr();

    if (install.exitCode !== 0) {
        console.error("[createSailCLISandbox] Failed to install Sail CLI in sandbox", {
            exitCode: install.exitCode,
            stdout: installStdout,
            stderr: installStderr,
        });
        throw new Error(
            `Failed to install Sail CLI in sandbox (exit code ${install.exitCode}). See logs for details.`
        );
    }

    console.log("[createSailCLISandbox] Sail CLI installed successfully.");
    if (installStdout) {
        console.log("[createSailCLISandbox] install stdout:\n", installStdout);
    }
    if (installStderr) {
        console.log("[createSailCLISandbox] install stderr:\n", installStderr);
    }

    await ensureSailEnvInSandbox(sandbox);
    return sandbox;
}
