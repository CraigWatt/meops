import { execFile } from "node:child_process";
import { basename, resolve } from "node:path";
import { promisify } from "node:util";

import {
  type SignalInput,
  type SignalKind,
  type SignalPriority
} from "@meops/core";

const execFileAsync = promisify(execFile);

export interface GitCommitSnapshot {
  hash: string;
  author: string;
  timestamp: string;
  subject: string;
  body: string;
}

export interface ExtractedSignal extends SignalInput {
  source: "git_commit";
  sourceId: string;
}

function normalizeRepositorySlug(remoteUrl: string, repoPath: string): string {
  const httpsMatch = remoteUrl.match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/.]+)(?:\.git)?$/i);
  if (httpsMatch?.groups?.owner && httpsMatch.groups.repo) {
    return `${httpsMatch.groups.owner}/${httpsMatch.groups.repo}`;
  }

  const localName = basename(resolve(repoPath)) || "local";
  return `local/${localName}`;
}

async function runGit(args: string[], repoPath: string): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd: repoPath,
    maxBuffer: 1024 * 1024
  });

  return String(stdout).trim();
}

export async function getRepositorySlug(repoPath = process.cwd()): Promise<string> {
  try {
    const remoteUrl = await runGit(["remote", "get-url", "origin"], repoPath);
    return normalizeRepositorySlug(remoteUrl, repoPath);
  } catch {
    return normalizeRepositorySlug("", repoPath);
  }
}

export async function collectRecentCommits(
  repoPath = process.cwd(),
  limit = 12
): Promise<GitCommitSnapshot[]> {
  const output = await runGit(
    [
      "log",
      "--max-count",
      String(limit),
      "--date=iso-strict",
      "--pretty=format:%H%x1f%an%x1f%ad%x1f%s%x1f%b%x1e"
    ],
    repoPath
  );

  if (!output) {
    return [];
  }

  return output
    .split("\x1e")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hash = "", author = "", timestamp = "", subject = "", body = ""] = entry.split("\x1f");
      return {
        hash,
        author,
        timestamp,
        subject,
        body: body.trim()
      };
    })
    .filter((commit) => commit.hash.length > 0 && commit.subject.length > 0);
}

function cleanSubject(subject: string): string {
  const stripped = subject.replace(/^([a-z]+)(\([^)]+\))?:\s+/i, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function detectKind(subject: string, body: string): SignalKind {
  const narrative = `${subject} ${body}`.toLowerCase();

  if (narrative.includes("merge pull request") || narrative.includes("pull request")) {
    return "pull_request";
  }

  if (narrative.includes("release") || narrative.includes("ship") || narrative.includes("launch")) {
    return "release";
  }

  if (
    narrative.includes("milestone") ||
    narrative.includes("scaffold") ||
    narrative.includes("foundation") ||
    narrative.includes("initial")
  ) {
    return "milestone";
  }

  return "commit";
}

function detectPriority(subject: string, body: string): SignalPriority {
  const narrative = `${subject} ${body}`.toLowerCase();

  if (
    narrative.includes("fix") ||
    narrative.includes("bug") ||
    narrative.includes("build") ||
    narrative.includes("ci") ||
    narrative.includes("deploy") ||
    narrative.includes("pages") ||
    narrative.includes("auth") ||
    narrative.includes("security") ||
    narrative.includes("release")
  ) {
    return "high";
  }

  if (
    narrative.includes("add") ||
    narrative.includes("introduce") ||
    narrative.includes("implement") ||
    narrative.includes("update") ||
    narrative.includes("wire") ||
    narrative.includes("refine") ||
    narrative.includes("sync")
  ) {
    return "medium";
  }

  return "low";
}

export async function extractSignalsFromCommits(
  commits: GitCommitSnapshot[],
  repoPath = process.cwd()
): Promise<ExtractedSignal[]> {
  const repository = await getRepositorySlug(repoPath);

  return commits.map((commit) => ({
    kind: detectKind(commit.subject, commit.body),
    summary: cleanSubject(commit.subject),
    repository,
    timestamp: commit.timestamp,
    priority: detectPriority(commit.subject, commit.body),
    source: "git_commit",
    sourceId: commit.hash
  }));
}

export async function scanRepositoryForSignals(
  repoPath = process.cwd(),
  limit = 12
): Promise<ExtractedSignal[]> {
  const commits = await collectRecentCommits(repoPath, limit);
  return extractSignalsFromCommits(commits, repoPath);
}
