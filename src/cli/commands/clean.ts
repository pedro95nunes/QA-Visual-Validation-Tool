import { rm, stat, readdir } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { CliOutput } from "../output";

export async function runClean(output: CliOutput, artifactsDir: string, force: boolean): Promise<number> {
  let exists = false;
  try {
    await stat(artifactsDir);
    exists = true;
  } catch {
    output.info(`Nothing to clean — ${artifactsDir} does not exist.`);
    return 0;
  }

  if (exists) {
    const entries = await readdir(artifactsDir).catch(() => [] as string[]);
    output.section("Atlas Clean");
    output.info(`Directory: ${artifactsDir}`);
    output.info(`Contents:  ${entries.length} item(s)`);
    output.blank();
  }

  if (!force) {
    if (!process.stdin.isTTY) {
      output.error("Non-interactive terminal detected. Use --force to skip confirmation.");
      output.fix("atlas clean --force");
      return 2;
    }

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    let answer: string;
    try {
      answer = await rl.question(`Delete ${artifactsDir}? [y/N] `);
    } finally {
      rl.close();
    }

    if (answer.trim().toLowerCase() !== "y") {
      output.info("Aborted.");
      return 0;
    }
  }

  await rm(artifactsDir, { recursive: true, force: true });
  output.pass("Cleaned", artifactsDir);
  return 0;
}
