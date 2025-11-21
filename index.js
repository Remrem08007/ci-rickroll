const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const percentageStr = core.getInput('percentage') || '100';
    const percentage = parseInt(percentageStr, 10);
    const fallbackMessage = core.getInput('message') || '';
    const token = core.getInput('GITHUB_TOKEN');

    if (!token) {
      core.setFailed('GITHUB_TOKEN input is required');
      return;
    }

    const roll = Math.floor(Math.random() * 100);
    let body;

    if (roll < percentage) {
      body = '![rickroll](https://user-images.githubusercontent.com/37572049/90699500-0cc3ec00-e2a1-11ea-8d13-989526e86b0e.gif)';
      core.info(`Gottem!! roll=${roll}, threshold=${percentage}`);
    } else {
      if (!fallbackMessage) {
        core.info(`Random roll did not trigger (roll=${roll}), and no message set. Exiting.`);
        return;
      }
      body = fallbackMessage;
      core.info(`Random roll did not trigger. Using fallback message. roll=${roll}, threshold=${percentage}`);
    }

    const context = github.context;
    const octokit = github.getOctokit(token);

    // 1) PR event → comment on PR
    if (context.payload.pull_request) {
      const prNumber = context.payload.pull_request.number;
      await octokit.rest.issues.createComment({
        ...context.repo,
        issue_number: prNumber,
        body
      });
      core.info(`Commented on pull request #${prNumber}`);
      return;
    }

    // 2) Push event → comment on latest commit
    if (context.eventName === 'push') {
      const sha = context.payload.after;
      if (!sha) {
        core.warning('Push event without "after" SHA; logging message instead.');
        core.info(body);
        return;
      }
      await octokit.rest.repos.createCommitComment({
        ...context.repo,
        commit_sha: sha,
        body
      });
      core.info(`Commented on commit ${sha}`);
      return;
    }

    // 3) Other events → just log
    core.info('No PR or push context found. Logging message instead:');
    core.info(body);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
