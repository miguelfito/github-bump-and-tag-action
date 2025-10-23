import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { prerelease, rcompare, valid } from "semver";

const githubToken = core.getInput("github_token");
const octokit = getOctokit(githubToken);

export async function getValidTags() {
    const tags = await octokit.repos.listTags({
        ...context.repo,
        per_page: 100,
    });

    const invalidTags = tags.data
        .map((tag) => tag.name)
        .filter((name) => !valid(name));

    invalidTags.forEach((name) => core.debug(`Found Invalid Tag: ${ name }.`));

    const validTags = tags.data
        .filter((tag) => valid(tag.name))
        .sort((a, b) => rcompare(a.name, b.name));

    validTags.forEach((tag) => core.debug(`Found Valid Tag: ${ tag.name }.`));

    return validTags;
}

export async function getCommits(sha: string) {
    const commits = await octokit.repos.compareCommits({
        ...context.repo,
        base: sha,
        head: "HEAD",
    });

    return commits.data.commits
        .filter((commit) => !!commit.commit.message)
        .map((commit) => ({
            message: commit.commit.message,
            hash: commit.sha,
        }));
}

export function getBranchFromRef(ref: string) {
    return ref.replace("refs/heads/", "");
}

export async function createTag(
    newTag: string,
    createAnnotatedTag: boolean,
    commitSha: string
) {
    let annotatedTag: any | undefined = undefined;
    if (createAnnotatedTag) {
        core.debug(`Creating annotated tag.`);
        annotatedTag = await octokit.git.createTag({
            ...context.repo,
            tag: newTag,
            message: newTag,
            object: commitSha,
            type: "commit",
        });
    }

    core.debug(`Pushing new tag to the repo.`);
    await octokit.git.createRef({
        ...context.repo,
        ref: `refs/tags/${ newTag }`,
        sha: annotatedTag ? annotatedTag.data.sha : commitSha,
    });
}

export function getLatestTag(tags: any[]) {
    return (
        tags.find((tag) => !prerelease(tag.name)) || {
            name: "0.0.0",
            commit: {
                sha: "HEAD",
            },
        }
    );
}

export function getLatestPrereleaseTag(
    tags: any[],
    identifier: string
) {
    return tags
        .filter((tag) => prerelease(tag.name))
        .find((tag) => tag.name.match(identifier));
}
