import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PNG } from "pngjs";
import { ReportConfiguration } from "../src/configuration/report-configuration";
import { Logger } from "../src/core/interfaces/logger";
import { ValidationRun } from "../src/core/models/validation-run";
import { LocalFileStorage } from "../src/infrastructure/storage/local-file-storage";
import { ArtifactOrganizer } from "../src/reports/artifact-organizer";
import { DefaultReportRegistry } from "../src/reports/default-report-registry";
import { HtmlReport } from "../src/reports/html/html-report";
import { JsonReport } from "../src/reports/json/json-report";
import { ReportEngine } from "../src/reports/report-engine";
import { buildValidationRun } from "../src/reports/run-aggregator";
import { executionFrom, failedPage, passedPage } from "./fixtures/report-fixtures";

class SilentLogger implements Logger {
  public info(): void {}
  public error(): void {}
}

function png(width: number, height: number, color: [number, number, number, number]): Uint8Array {
  const image = new PNG({ width, height });
  for (let offset = 0; offset < image.data.length; offset += 4) {
    image.data.set(color, offset);
  }
  return PNG.sync.write(image);
}

async function seedRun(directory: string): Promise<ValidationRun> {
  const homepage = passedPage("homepage", 0.1);
  const about = failedPage("about", 4.7);

  await mkdir(join(directory, "src"), { recursive: true });
  const files: Array<[string, Uint8Array]> = [
    [join(directory, "src", "homepage-evidence.png"), png(4, 4, [255, 255, 255, 255])],
    [join(directory, "src", "homepage-reference.png"), png(4, 4, [255, 255, 255, 255])],
    [join(directory, "src", "about-evidence.png"), png(4, 4, [0, 0, 0, 255])],
    [join(directory, "src", "about-reference.png"), png(4, 4, [255, 255, 255, 255])],
    [join(directory, "src", "about-diff.png"), png(4, 4, [255, 0, 0, 255])],
  ];
  for (const [path, content] of files) {
    await writeFile(path, content);
  }

  homepage.evidence!.filePath = files[0][0];
  homepage.reference!.localPath = files[1][0];
  homepage.comparison!.diffImage = undefined;
  about.evidence!.filePath = files[2][0];
  about.reference!.localPath = files[3][0];
  about.comparison!.diffImage = files[4][0];

  return buildValidationRun({
    executionId: "2026-08-31T21-30-42Z-a8f31",
    startedAt: new Date("2026-08-31T21:30:42.000Z"),
    finishedAt: new Date("2026-08-31T21:31:44.370Z"),
    executions: [executionFrom([homepage, about])],
    environment: { nodeVersion: process.version, platform: process.platform },
  });
}

test("generates portable HTML and JSON reports with organized artifacts and no browser or design provider", async () => {
  const directory = await mkdtemp(join(tmpdir(), "atlas-reports-"));
  const configuration: ReportConfiguration = {
    enabled: true,
    outputDirectory: directory,
    html: { enabled: true },
    json: { enabled: true },
  };

  try {
    const run = await seedRun(directory);
    const storage = new LocalFileStorage();
    const logger = new SilentLogger();
    const engine = new ReportEngine(
      logger,
      new DefaultReportRegistry(
        [
          { report: new HtmlReport(storage), enabled: true },
          { report: new JsonReport(storage), enabled: true },
        ],
        true
      ),
      new ArtifactOrganizer(storage, logger),
      configuration
    );

    const { reports, runDirectory } = await engine.generate(run);

    // 5. Files exist.
    const runRoot = join(directory, "runs", "2026-08-31T21-30-42Z-a8f31");
    assert.equal(runDirectory, `${directory}/runs/2026-08-31T21-30-42Z-a8f31`);
    assert.equal((await stat(join(runRoot, "report", "index.html"))).isFile(), true);
    assert.equal((await stat(join(runRoot, "report", "report.json"))).isFile(), true);
    assert.equal((await stat(join(runRoot, "evidence", "homepage.png"))).isFile(), true);
    assert.equal((await stat(join(runRoot, "references", "about.png"))).isFile(), true);
    assert.equal((await stat(join(runRoot, "diffs", "about-diff.png"))).isFile(), true);

    // 6. HTML references evidence/reference/diff with portable relative paths.
    const html = await readFile(join(runRoot, "report", "index.html"), "utf8");
    assert.match(html, /src="\.\.\/evidence\/homepage\.png"/);
    assert.match(html, /src="\.\.\/references\/about\.png"/);
    assert.match(html, /src="\.\.\/diffs\/about-diff\.png"/);
    assert.equal(html.includes(directory), false, "report must not embed absolute machine paths");

    // 7. JSON is valid and machine-readable.
    const json = JSON.parse(await readFile(join(runRoot, "report", "report.json"), "utf8"));
    assert.equal(json.execution.id, "2026-08-31T21-30-42Z-a8f31");
    assert.equal(json.execution.status, "FAILED");
    assert.deepEqual(json.summary, { total: 2, passed: 1, failed: 1, errors: 0 });
    assert.equal(
      json.pages.find((page: { id: string }) => page.id === "about").artifacts.diff,
      "../diffs/about-diff.png"
    );

    // Report results are returned for downstream automation.
    assert.deepEqual(reports.map((report) => report.reportId).sort(), ["html", "json"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
