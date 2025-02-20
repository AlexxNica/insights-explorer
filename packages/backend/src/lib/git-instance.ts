/**
 * Copyright 2021 Expedia, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

import logger from '@iex/shared/logger';
import globby from 'globby';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import yaml from 'js-yaml';
import * as tmp from 'tmp-promise';

import { InsightYaml } from '../models/insight-yaml';
import { User } from '../models/user';
import { walk, WalkPredicate, WalkedFile } from '../shared/walk';

export const INSIGHT_YAML_FILE = 'insight.yml';

export type GitChangeFunction = (gitInstance: GitInstance) => Promise<void>;

export type ApplyGitChangesArgs = {
  gitUrl: string;
  user: User;
  changes: GitChangeFunction[];
  commitMessage: string;
};

// Filter out `.git` files, and optionally a provided filter
const gitFilter: WalkPredicate = (wf) => wf.path != `.git`;

export class GitInstance {
  private localPath: string | undefined;
  private cleanupFn: (() => Promise<void>) | undefined;

  constructor(readonly url: string) {}

  /**
   * Creates a new GitInstance by cloning a repository.
   *
   * @param url Git clone URL
   * @param token Access token
   */
  public static async from(url: string, token: string): Promise<GitInstance> {
    const gitInstance = new GitInstance(url);
    await gitInstance.clone(token);
    return gitInstance;
  }

  /**
   * Clone, modify, commit, and push one or more changes to a git repository.
   *
   * @param insight Insight to update
   * @param user User making the changes
   * @param changes Array of one or more change functions
   * @param commitMessage Message to use when making the commit
   * @returns Git commit SHA
   */
  public static async applyGitChanges({ gitUrl, user, changes, commitMessage }: ApplyGitChangesArgs): Promise<string> {
    const { displayName: name, email, githubPersonalAccessToken } = user;

    const gitInstance = await GitInstance.from(gitUrl, githubPersonalAccessToken!);

    // Synchronously apply each change in turn.
    for (const change of changes) {
      logger.silly('[GIT_INSTANCE] Applying a git change!');
      await change(gitInstance);
    }

    // Commit changes and push
    logger.debug(`[GIT_INSTANCE] Making commit as user ${name} (${email})`);
    const sha = await gitInstance.commit(commitMessage, { name, email });
    logger.debug(`[GIT_INSTANCE] Pushing change to origin!`);
    await gitInstance.push(githubPersonalAccessToken!);
    logger.debug(`[GIT_INSTANCE] Changes pushed successfully!`);
    await gitInstance.cleanup();

    return sha;
  }

  async clone(token: string): Promise<void> {
    const { path, cleanup } = await tmp.dir({ unsafeCleanup: true });
    this.localPath = path;
    this.cleanupFn = cleanup;
    logger.silly('[GIT_INSTANCE] GitInstance temp path: ' + path);

    logger.info(`[GIT_INSTANCE] Cloning git repo from ${this.url} to ${this.localPath}`);
    await git.clone({
      fs,
      http,
      dir: this.localPath,
      url: this.url,
      onAuth: () => ({ username: token }),
      singleBranch: true,
      noTags: true
    });
  }

  async cleanup(): Promise<void> {
    if (this.cleanupFn != null) {
      return this.cleanupFn();
    }
  }

  async latestCommitHash(): Promise<string> {
    if (this.localPath === undefined) {
      throw new Error('[GIT_INSTANCE] Git repository not cloned!');
    }

    const commits = await git.log({ fs, dir: this.localPath, ref: 'HEAD', depth: 1 });
    return commits[0].oid;
  }

  fileExists(filePath: string): boolean {
    if (this.localPath === undefined) {
      throw new Error('[GIT_INSTANCE] Git repository not cloned!');
    }

    const localFilePath = path.join(this.localPath, filePath);
    return fs.existsSync(localFilePath);
  }

  /**
   *
   */
  async listFiles(filter?: WalkPredicate): Promise<WalkedFile[]> {
    if (this.localPath === undefined) {
      throw new Error('[GIT_INSTANCE] Git repository not cloned!');
    }

    const combinedFilter = filter == undefined ? gitFilter : (wf: WalkedFile) => filter(wf) && gitFilter(wf);

    const files = await walk(this.localPath, combinedFilter);

    for (const file of files) {
      logger.silly(`[FILE] ${file.path}`);
    }

    return files;
  }

  async retrieveFile(filePath: string): Promise<Buffer | null> {
    if (this.localPath === undefined) {
      throw new Error('[GIT_INSTANCE] Git repository not cloned!');
    }

    const localFilePath = path.join(this.localPath, filePath);
    if (fs.existsSync(localFilePath)) {
      try {
        return await fs.promises.readFile(localFilePath);
      } catch (error: any) {
        logger.error(`[GIT_INSTANCE] Error reading \`${localFilePath}\`: ${error}`);
        return null;
      }
    } else {
      return null;
    }
  }

  async retrieveFileUtf8(filePath: string): Promise<string | null> {
    const buffer = await this.retrieveFile(filePath);
    return buffer != null ? buffer.toString('utf-8') : null;
  }

  // TODO: Only works for UTF-8 based-files
  async putFile(filePath: string, contents: string): Promise<void> {
    if (this.localPath === undefined) {
      throw new Error('Git repository not cloned!');
    }

    const localFilePath = path.join(this.localPath, filePath);

    await fs.promises.mkdir(path.dirname(localFilePath), { recursive: true });
    await fs.promises.writeFile(localFilePath, contents);
    await git.add({ fs, dir: this.localPath, filepath: filePath });
  }

  async putFileFromStream(filePath: string, readable: Readable): Promise<void> {
    if (this.localPath === undefined) {
      throw new Error('Git repository not cloned!');
    }

    const localFilePath = path.join(this.localPath, filePath);

    const writable = fs.createWriteStream(localFilePath);
    const stream = readable.pipe(writable);
    await new Promise((resolve) => stream.on('finish', resolve));

    await git.add({ fs, dir: this.localPath, filepath: filePath });
  }

  async retrieveInsightYaml(): Promise<InsightYaml> {
    const contents = await this.retrieveFileUtf8(INSIGHT_YAML_FILE);
    if (contents !== null) {
      const insightYaml = yaml.load(contents) as InsightYaml;

      if (insightYaml != null && typeof insightYaml !== 'string') {
        return insightYaml;
      }
    }

    return {};
  }

  async putInsightYaml(insightYaml: InsightYaml): Promise<void> {
    const contents = yaml.dump(insightYaml, { lineWidth: -1 });
    return this.putFile('insight.yml', contents);
  }

  async renameFile(originalFilePath: string, newFilePath: string): Promise<void> {
    if (this.localPath === undefined) {
      throw new Error('Git repository not cloned!');
    }

    await git.remove({ fs, dir: this.localPath, filepath: originalFilePath });
    await fs.promises.rename(path.join(this.localPath, originalFilePath), path.join(this.localPath, newFilePath));
    await git.add({ fs, dir: this.localPath, filepath: newFilePath });
  }

  async deleteFile(filePath: string): Promise<void> {
    if (this.localPath === undefined) {
      throw new Error('Git repository not cloned!');
    }

    await git.remove({ fs, dir: this.localPath, filepath: filePath });
  }

  async commit(message: string, author: { name: string; email: string }): Promise<string> {
    if (this.localPath === undefined) {
      throw new Error('Git repository not cloned!');
    }

    const sha = await git.commit({
      fs,
      dir: this.localPath,
      author,
      message
    });
    logger.info(`[GIT_INSTANCE] Commit SHA: ${sha}`);

    return sha;
  }

  async push(token: string): Promise<void> {
    await git.push({
      fs,
      http,
      dir: this.localPath,
      remote: 'origin',
      onAuth: () => ({ username: token })
    });
  }

  /**
   * Copies all files from another GitInstance into this one, and stages them.
   *
   * @param from Another GitInstance
   */
  async copyFiles(from: GitInstance): Promise<void> {
    if (this.localPath === undefined) {
      throw new Error('Git repository not cloned!');
    }

    const paths = await globby(['./**', './.*/**', '!./.git'], { cwd: from.getLocalPath() });
    for (const filepath of paths) {
      logger.silly('[GIT_INSTANCE] Copying file path: ' + filepath);
      await fs.promises.copyFile(path.join(from.getLocalPath(), filepath), path.join(this.localPath, filepath));
      await git.add({ fs, dir: this.localPath, filepath });
    }
  }

  private getLocalPath(): string {
    if (this.localPath === undefined) {
      throw new Error('[GIT_INSTANCE] Git repository not cloned!');
    }

    return this.localPath;
  }
}
