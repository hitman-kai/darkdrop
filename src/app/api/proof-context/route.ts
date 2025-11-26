import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";

type Mode = "configure" | "transfer";

type ApiRequest = {
  mode: Mode;
  payload: Record<string, unknown>;
  rpcUrl?: string;
};

type ExecResult = {
  stdout: string;
  stderr: string;
};

const PROJECT_ROOT = process.cwd();
const HELPER_MANIFEST = path.join(PROJECT_ROOT, "darkdrop-ct-service", "Cargo.toml");
function resolveHelperEnv() {
  return {
    helperBin: process.env.DARKDROP_CT_HELPER_BIN ?? "",
    keypairPath: process.env.DARKDROP_CT_KEYPAIR ?? "",
  };
}

function buildCliArgs(mode: Mode, inputPath: string, rpcUrl?: string) {
  const { helperBin, keypairPath } = resolveHelperEnv();
  if (!keypairPath) {
    throw new Error("Missing DARKDROP_CT_KEYPAIR env var. Set it to the fee payer keypair path.");
  }

  const baseArgs = ["--json", "--keypair", keypairPath];
  if (rpcUrl) {
    baseArgs.push("--rpc-url", rpcUrl);
  }

  switch (mode) {
    case "configure":
      baseArgs.push("configure", "--input", inputPath);
      break;
    case "transfer":
      baseArgs.push("transfer", "--input", inputPath);
      break;
    default:
      throw new Error(`Unsupported mode ${mode}`);
  }

  console.log("[ProofContext API] helper env", { helperBin, keypairPath });

  if (helperBin) {
    return {
      command: helperBin,
      args: baseArgs,
    };
  }

  return {
    command: "cargo",
    args: ["run", "--quiet", "--manifest-path", HELPER_MANIFEST, "--", ...baseArgs],
  };
}

async function runCommand(command: string, args: string[]): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (err) => {
      reject(err);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(
            `Helper failed (exit ${code ?? "unknown"}): ${stderr || stdout || "no output"}`
          )
        );
      }
    });
  });
}

function extractJsonLine(output: string) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    throw new Error("Helper produced no output");
  }
  return lines[lines.length - 1];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ApiRequest;
    if (!body || !body.mode || typeof body.payload !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "darkdrop-ct-"));
    const inputPath = path.join(tmpDir, `${body.mode}-${randomUUID()}.json`);
    await writeFile(inputPath, JSON.stringify(body.payload, null, 2), "utf8");

    try {
      const { command, args } = buildCliArgs(body.mode, inputPath, body.rpcUrl);
      const { stdout } = await runCommand(command, args);
      const jsonLine = extractJsonLine(stdout);
      const response = JSON.parse(jsonLine);
      return NextResponse.json(response);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error("[ProofContext API] error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

