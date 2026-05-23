const path = require('path');
const fs = require('fs/promises');
const express = require('express');
const { Octokit } = require('@octokit/rest');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const repoDir = __dirname;
const inputPath = path.join(repoDir, 'input.json');
const optionsPath = path.join(repoDir, 'config', 'options.json');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(repoDir, 'public')));

async function runGitCommand(command, options = {}) {
  const result = await execAsync(command, { cwd: repoDir, ...options });
  return result.stdout.trim();
}

async function getRepoInfo() {
  const remote = await runGitCommand('git remote get-url origin');
  const match = remote.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);
  if (!match) {
    throw new Error(`Unable to parse GitHub repo from origin URL: ${remote}`);
  }
  return [match[1], match[2]];
}

async function readInput() {
  const raw = await fs.readFile(inputPath, 'utf8');
  return JSON.parse(raw);
}

async function writeInput(data) {
  await fs.writeFile(inputPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function readOptions() {
  const raw = await fs.readFile(optionsPath, 'utf8');
  return JSON.parse(raw);
}

app.get('/api/input', async (req, res) => {
  try {
    const input = await readInput();
    res.json(input);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/options', async (req, res) => {
  try {
    const options = await readOptions();
    res.json(options);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/submit', async (req, res) => {
  try {
    const { field, value } = req.body;
    if (!field || typeof value === 'undefined') {
      return res.status(400).json({ error: 'field and value are required' });
    }

    const currentBranch = await runGitCommand('git branch --show-current');
    const status = await runGitCommand('git status --porcelain');
    if (status.trim()) {
      return res.status(400).json({ error: 'Please commit or stash any existing changes before submitting.' });
    }

    const input = await readInput();
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      return res.status(400).json({ error: `Unknown field: ${field}` });
    }

    input[field] = value;
    await writeInput(input);

    const branchName = `update-input-${Date.now()}`;
    await runGitCommand(`git checkout -b ${branchName}`);
    await runGitCommand(`git add ${path.basename(inputPath)}`);
    await runGitCommand(`git commit -m "Update input.json ${field} -> ${value}"`);
    await runGitCommand(`git push -u origin ${branchName}`);
    await runGitCommand(`git checkout ${currentBranch}`);

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return res.status(500).json({ error: 'Missing GITHUB_TOKEN environment variable. Set it before starting the server.' });
    }

    const [owner, repo] = await getRepoInfo();
    const octokit = new Octokit({ auth: githubToken });
    const pr = await octokit.pulls.create({
      owner,
      repo,
      title: `Update input.json: ${field} -> ${value}`,
      head: branchName,
      base: 'main',
      body: `This pull request updates the input.json field **${field}** to **${value}** from the local dashboard.`
    });

    res.json({ branch: branchName, prUrl: pr.data.html_url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Dashboard server running at http://localhost:${port}`);
});
