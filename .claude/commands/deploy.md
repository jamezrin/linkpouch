Deploy a Linkpouch component. Handle everything end-to-end: committing uncommitted changes, pushing, waiting for CI, and rolling out the new version (or rebuilding locally with docker-compose).

## Parsing the invocation

The user's arguments follow the slash command. Parse them to determine:

- **component** — one of: `frontend`, `stash-service`, `api-gateway`, `indexer-service`, `all`
- **environment** — `prod`/`production`/`k8s` → Kubernetes; `local`/`docker`/`compose` → docker-compose

If either is missing or ambiguous, ask the user to clarify before doing anything.

## Component reference table

| Component        | GitHub workflow file         | k8s deployment    | docker-compose service |
|------------------|------------------------------|-------------------|------------------------|
| frontend         | build-frontend.yml           | frontend          | frontend               |
| stash-service    | build-stash-service.yml      | stash-service     | stash-service          |
| api-gateway      | build-api-gateway.yml        | api-gateway       | api-gateway            |
| indexer-service  | build-indexer-service.yml    | indexer-service   | indexer-service        |

For `all`, apply every component in the table.

Shared constants:
- Working directory: `/home/jamezrin/dev/linkpouch`
- Kubernetes namespace: `linkpouch-dev`
- GitHub repo: `jamezrin/linkpouch`

---

## Production deployment (Kubernetes)

### Step 1 — Commit and push any local changes

Run `git status` in the working directory.

**If there are uncommitted changes:**
- Run `git diff --stat` and `git status` to understand what changed.
- Stage the relevant files. Prefer staging specific files over `git add -A`.
- Write a concise, descriptive commit message (what changed and why).
- Commit and push to `main`.
- Confirm the push succeeded before continuing.

**If the working tree is clean:** skip directly to Step 2.

### Step 2 — Find and wait for the CI build

After pushing (or if the tree was already clean), find the latest run of the component's workflow:

```bash
gh run list --repo jamezrin/linkpouch --workflow <workflow-file> --limit 1 --json databaseId,status,conclusion
```

- If the run is already `completed` with `success` and its `headSha` matches HEAD, consider it done and skip waiting.
- Otherwise, watch it:

```bash
gh run watch <run-id> --repo jamezrin/linkpouch
```

If the run fails, report the failure clearly (job name, step name if available) and **stop** — do not proceed to the rollout.

For `all`: find and watch all four workflows; wait for all of them to succeed before rolling out.

### Step 3 — Roll out to Kubernetes

Once the build is confirmed successful:

```bash
kubectl rollout restart deployment/<name> -n linkpouch-dev
kubectl rollout status deployment/<name> -n linkpouch-dev
```

For `all`, restart all four deployments. You can restart them in parallel with separate `kubectl rollout restart` commands, then check status for each.

Report success or any rollout errors clearly.

---

## Local deployment (docker-compose)

Local deployment does **not** require committing, pushing, or waiting for CI. It builds images directly from local source files.

### Rebuild and restart the service

```bash
cd /home/jamezrin/dev/linkpouch
docker-compose up -d --build <service-name>
```

For `all`:

```bash
docker-compose up -d --build frontend stash-service api-gateway indexer-service
```

(Only rebuild the deployable services — not postgres, redis, or seaweedfs.)

### Confirm it is running

```bash
docker-compose ps <service-name>
```

Report the container status. If a container exited immediately, fetch its logs:

```bash
docker-compose logs --tail=50 <service-name>
```

---

## General behaviour

- Always tell the user what you are about to do before running each major step (commit, push, watch CI, rollout, docker-compose build).
- Keep output concise — summarise CI step results rather than printing every line.
- If something goes wrong at any step, stop and explain clearly. Never force-push or use `--no-verify`.
