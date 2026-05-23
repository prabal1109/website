# website

This repository now includes a local dashboard that can edit `input.json`, create a git branch, push it, and open a GitHub PR.

## Setup

1. Install dependencies:

   ```powershell
   cd c:\Users\praba\website\website
   npm install
   ```

2. Set your GitHub token in the environment and start the server:

   ```powershell
   $env:GITHUB_TOKEN = "YOUR_TOKEN"
   npm start
   ```

3. Open the dashboard in your browser:

   ```text
   http://localhost:3000
   ```

## How it works

- The dashboard reads the current `input.json` values.
- Select a field and a new value from the dropdowns.
- Click `Submit` to update `input.json`, create a new git branch, commit the change, push the branch, and create a PR.
- The response includes the PR URL for manual review and merge.

## Notes

- The PR is created against the `main` branch.
- Make sure the repo is clean before submitting.
- Your GitHub token must have `repo` permissions.
- If you are using a fork or organization repo, authorize the token for that org and verify the `repo`/`public_repo` scope.

## Existing command

`gcp cloud build push`
