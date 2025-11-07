import * as core from "@actions/core";
import Ignore from "@balena/dockerignore";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export async function run() {
  const ignore = Ignore();

  // Load ignore patterns from specified ignore files
  const ignoreFilePaths = core.getMultilineInput("ignore-files", {
    trimWhitespace: true,
  });
  const ignoreFiles = await Promise.all(
    ignoreFilePaths.map((path) => readFile(path, "utf-8")),
  );
  ignoreFiles.forEach((content) => ignore.add(content));

  // Add additional ignore patterns from input
  core
    .getMultilineInput("exclude-paths", { trimWhitespace: true })
    .forEach((path) => ignore.add(path));

  // Read all files in the repository recursively
  const paths = await readdir(".", { recursive: true, withFileTypes: true });

  // Filter to include only files and construct their full paths
  const filePaths = paths
    .filter((entry) => entry.isFile())
    .map(({ parentPath, name }) => join(parentPath, name));
  const filteredPaths = ignore.filter(filePaths);

  core.setOutput("file-list", filteredPaths.join("\n"));
  core.setOutput("file-count", filteredPaths.length.toString());

  // Compute SHA-256 hash of the included files
  const contents = await Promise.all(
    filteredPaths.map((file) => readFile(file, "utf-8")),
  );
  const hash = createHash("sha256");
  contents.forEach((content) => hash.update(content));

  const digest = hash.digest("hex");
  core.info(`SHA-256 Hash of included files: ${digest}`);
  core.setOutput("hash", digest);
}
