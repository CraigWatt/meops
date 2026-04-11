import {
  type ExtractedSignal,
  type GitCommitSnapshot,
  extractSignalsFromCommits
} from "@meops/extraction";
import { type RepositoryProfile } from "@meops/core";

export interface GitHubRepositoryRecord {
  full_name: string;
  name: string;
  html_url: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  topics?: string[];
  private: boolean;
  archived: boolean;
  pushed_at: string | null;
  updated_at: string;
}

export interface DiscoveryOptions {
  token: string;
  allowlist?: string[];
  repoLimit?: number;
  commitLimit?: number;
  apiBaseUrl?: string;
}

const defaultApiBaseUrl = "https://api.github.com";

function getHeaders(token: string): Record<string, string> {
  return {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "x-github-api-version": "2022-11-28",
    "user-agent": "meops"
  };
}

function normalizeAllowlist(values?: string[]): Set<string> | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  return new Set(values.map((value) => value.trim()).filter(Boolean));
}

function toRepositoryProfile(repository: GitHubRepositoryRecord): RepositoryProfile {
  return {
    name: repository.name,
    fullName: repository.full_name,
    url: repository.html_url,
    description: repository.description ?? undefined,
    defaultBranch: repository.default_branch,
    language: repository.language ?? undefined,
    topics: repository.topics ?? [],
    isPrivate: repository.private,
    isArchived: repository.archived,
    pushedAt: repository.pushed_at ?? undefined,
    updatedAt: repository.updated_at
  };
}

async function githubRequest<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: getHeaders(token)
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function listAccessibleRepositories(options: DiscoveryOptions): Promise<RepositoryProfile[]> {
  const apiBaseUrl = options.apiBaseUrl ?? defaultApiBaseUrl;
  const allowlist = normalizeAllowlist(options.allowlist);
  const repositories: RepositoryProfile[] = [];
  const maxRepositories = options.repoLimit ?? Number.POSITIVE_INFINITY;
  let page = 1;

  while (repositories.length < maxRepositories && page <= 10) {
    const pageSize = Math.min(100, options.repoLimit ?? 100);
    const url = new URL(`${apiBaseUrl}/user/repos`);
    url.searchParams.set("per_page", String(pageSize));
    url.searchParams.set("page", String(page));
    url.searchParams.set("sort", "updated");
    url.searchParams.set("direction", "desc");
    url.searchParams.set("visibility", "all");
    url.searchParams.set("affiliation", "owner,collaborator,organization_member");

    const pageRepositories = await githubRequest<GitHubRepositoryRecord[]>(url.toString(), options.token);
    if (pageRepositories.length === 0) {
      break;
    }

    for (const repository of pageRepositories) {
      if (allowlist && !allowlist.has(repository.full_name) && !allowlist.has(repository.name)) {
        continue;
      }

      repositories.push(toRepositoryProfile(repository));
      if (repositories.length >= maxRepositories) {
        break;
      }
    }

    if (pageRepositories.length < pageSize) {
      break;
    }

    page += 1;
  }

  return repositories;
}

interface GitHubCommitAuthor {
  name: string | null;
  date: string | null;
}

interface GitHubCommitRecord {
  sha: string;
  commit: {
    author: GitHubCommitAuthor | null;
    message: string;
  };
}

export async function fetchRecentCommits(
  repository: RepositoryProfile,
  options: DiscoveryOptions
): Promise<GitCommitSnapshot[]> {
  const apiBaseUrl = options.apiBaseUrl ?? defaultApiBaseUrl;
  const url = new URL(`${apiBaseUrl}/repos/${repository.fullName}/commits`);
  url.searchParams.set("per_page", String(options.commitLimit ?? 12));

  const commits = await githubRequest<GitHubCommitRecord[]>(url.toString(), options.token);

  return commits.map((commit) => {
    const [subject = "", ...rest] = commit.commit.message.split("\n");

    return {
      hash: commit.sha,
      author: commit.commit.author?.name ?? repository.name,
      timestamp: commit.commit.author?.date ?? new Date().toISOString(),
      subject,
      body: rest.join("\n").trim()
    };
  });
}

export async function discoverRepositorySignals(
  options: DiscoveryOptions
): Promise<ExtractedSignal[]> {
  const repositories = await listAccessibleRepositories(options);
  const discoveredSignals: ExtractedSignal[] = [];

  for (const repository of repositories) {
    const commits = await fetchRecentCommits(repository, options);
    const signals = await extractSignalsFromCommits(commits, {
      repository: repository.fullName,
      repositoryProfile: repository
    });

    discoveredSignals.push(...signals);
  }

  return discoveredSignals;
}
