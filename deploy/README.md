# Deploy

Combat Planner in production on one Ubuntu 24.04 VPS (`linux/amd64`, 1 GB RAM, 10 GB disk):
HTTPS on a domain and a continuous SQLite backup to Yandex Object Storage.

`compose.yml` runs three services:

- `app`: the release image `ghcr.io/clericlvl2/combat-planner-v2:<tag>`, pulled anonymously.
  No port is published; only Caddy reaches it. It receives only `BETTER_AUTH_URL`,
  `BETTER_AUTH_SECRET`, `LINK_SECRET`, the optional `GOOGLE_*` and `GITHUB_*` sign-in pairs and
  `ADMIN_PAGE=1`, never the bucket key. `ADMIN_PAGE=1` turns on the owner's status page `/admin`;
  without it the app answers 404 there.
- `caddy`: `caddy:2` on ports 80/tcp and 443/tcp+udp (HTTP/3), with automatic Let's Encrypt
  certificates for `DOMAIN` and `www.DOMAIN`, proxying `DOMAIN` to `app:3000` and redirecting
  `www.DOMAIN` to `DOMAIN` (`Caddyfile`). It refuses a request body over 64 KiB under `/api/`
  with 413 and sends no `Via` header. It asks for `ADMIN_USER` and its password (checked against
  `ADMIN_PASSWORD_HASH`) on `/admin*` and answers 401 without them; it refuses to start while
  either variable is empty.
- `litestream`: `litestream/litestream:0.5`, replicating `/data/combat-planner.db` to the bucket
  every 10 s (`litestream.yml`), and serves Prometheus metrics on port 9090 inside the compose
  network only, read by the app's status page. It runs as uid 1000, like `app`, because it writes beside the
  database. It starts once `app` is healthy, so `app` creates the `data` volume with the right
  owner.

`caddy` and `litestream` are pinned by image digest. Every container runs with a read-only root
filesystem (writable volumes and a `/tmp` tmpfs only), `no-new-privileges`, every capability
dropped except Caddy's `NET_BIND_SERVICE`, and a memory limit sized for 1 GB RAM plus 1 GB swap:
`app` 512 MB, `caddy` and `litestream` 128 MB each.

Every setting lives in `deploy/.env` on the server only; `.env.example` lists the variables and
where each value comes from. Litestream copies only the database, not `secrets.json`, so
`BETTER_AUTH_SECRET` and `LINK_SECRET` are set in `.env` and kept in the password manager: a
database restored without them signs every user out and breaks every player link. Sessions and
player links are bound to `DOMAIN` as well: changing it signs everyone out and breaks shared
player links; accounts and combats stay.

The app refuses to start on a wrong setting and names the variable in `docker compose logs app`.

The commands use placeholders: `<server-ip>` for the server's address, `<bucket>` for the bucket
name, `~/.ssh/<key>` for the operator's private SSH key, `<domain>` for `DOMAIN` and `<tag>` for a
release tag. Replace each before running a command.

## Runbook

Prerequisites:

- SSH access as `root` by key, e.g. `ssh -i ~/.ssh/<key> root@<server-ip>`.
- A domain whose `A` records for the bare name and `www` point to the server.
- A Yandex Object Storage bucket (standard class, public access off, versioning off: Litestream
  deletes its own old files, and versioning would keep them) and a service account with the
  folder role `storage.editor` and a static access key.

Commands run as root: logged in as `root` until step 1 restarts SSH, afterwards logged in as
`deploy` and switched to root with `sudo -i`. Commands marked "As `deploy`" run without `sudo`.

1. **Base system.**
   - `lsb_release -d` shows Ubuntu 24.04. On another release, stop until Docker's apt repository
     is confirmed for it.
   - `apt update && apt upgrade -y`
   - Create the user `deploy` with sudo and root's keys. Choose its password at the prompt and
     keep it in the password manager; `sudo` asks for it.

     ```sh
     adduser --gecos '' deploy
     usermod -aG sudo deploy
     install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
     install -m 600 -o deploy -g deploy /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
     ```

   - Refuse root and password logins. A file in `/etc/ssh/sshd_config.d/` is read before the
     cloud-init drop-ins, and the first value of a setting wins:

     ```sh
     printf 'PasswordAuthentication no\nPermitRootLogin no\n' > /etc/ssh/sshd_config.d/00-hardening.conf
     sshd -T | grep -E '^(passwordauthentication|permitrootlogin) '
     ```

     Both lines read `no`. Restart SSH only after `ssh -i ~/.ssh/<key>
     deploy@<server-ip>` and `sudo -i` work from a second terminal: `systemctl restart ssh`.

2. **Swap.**

   ```sh
   fallocate -l 1G /swapfile
   chmod 600 /swapfile
   mkswap /swapfile
   swapon /swapfile
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf
   sysctl -p /etc/sysctl.d/99-swap.conf
   free -h
   ```

   `free -h` shows 1 GB swap.

3. **Firewall.**

   ```sh
   ufw allow OpenSSH
   ufw allow 80,443/tcp
   ufw allow 443/udp
   ufw enable
   ```

   Ports published by Docker bypass ufw; `compose.yml` publishes only Caddy's 80/tcp and
   443/tcp+udp.

4. **Docker.** Docker Engine with the compose plugin from Docker's apt repository, in place of
   Ubuntu's `docker.io` packages:

   ```sh
   apt-get remove -y docker.io docker-compose docker-compose-v2 podman-docker containerd runc
   apt-get install -y ca-certificates curl git
   install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
   chmod a+r /etc/apt/keyrings/docker.asc
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
   apt-get update
   apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   echo '{"log-driver": "local", "log-opts": {"max-size": "10m", "max-file": "3"}}' > /etc/docker/daemon.json
   systemctl daemon-reload
   systemctl reset-failed docker.service docker.socket
   systemctl restart docker.socket docker
   usermod -aG docker deploy
   ```

   `docker compose version` prints a version. Log in again as `deploy` for the group to apply.

5. **Files.** The checkout is read-only on the server and always on a release tag (detached
   `HEAD`), the same tag as the app image; only `deploy/.env` is added. No branch is checked out
   or pulled on the server: unreleased code runs only in a separate test environment.
   `<tag>` is the latest release on https://github.com/clericlvl2/combat-planner-v2/releases.

   ```sh
   git clone --branch <tag> https://github.com/clericlvl2/combat-planner-v2 /opt/combat-planner
   chown -R deploy:deploy /opt/combat-planner
   ```

   As `deploy`:

   ```sh
   cd /opt/combat-planner/deploy
   cp .env.example .env
   chmod 600 .env
   nano .env
   ```

   In `nano`, set `APP_IMAGE` to `<tag>` without the `v`.

6. **Registry check.** As `deploy`, in `/opt/combat-planner/deploy`:

   ```sh
   docker pull "$(sed -n 's/^APP_IMAGE=//p' .env)"
   ```

   When ghcr.io does not answer from the server, the image moves by hand. On the operator's
   machine:

   ```sh
   docker pull ghcr.io/clericlvl2/combat-planner-v2:<tag>
   docker save ghcr.io/clericlvl2/combat-planner-v2:<tag> | gzip > combat-planner.tar.gz
   scp -i ~/.ssh/<key> combat-planner.tar.gz deploy@<server-ip>:
   ```

   On the server, as `deploy`:

   ```sh
   docker load < ~/combat-planner.tar.gz && rm ~/combat-planner.tar.gz
   ```

7. **Secrets.** As `deploy`, run `openssl rand -hex 32` twice, then `nano .env` and fill in:
   - `DOMAIN`: the bare domain, e.g. `planner.example.com`;
   - `BETTER_AUTH_SECRET` and `LINK_SECRET`: the two generated values;
   - `LITESTREAM_BUCKET`: `<bucket>`; `LITESTREAM_ACCESS_KEY_ID` and
     `LITESTREAM_SECRET_ACCESS_KEY` from the Yandex console;
   - optionally `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID` and
     `GITHUB_CLIENT_SECRET` from the OAuth clients registered with the callback URLs
     `https://<domain>/api/auth/callback/google` and `https://<domain>/api/auth/callback/github`.
     An empty pair keeps that sign-in off. A change takes `docker compose up -d app`.

   - `ADMIN_USER` and `ADMIN_PASSWORD_HASH`: [Admin page](#admin-page), steps 1–2.

   Copy the two secrets into the password manager, then `clear`. Values typed in `nano` stay out
   of the shell history; never pass them as command arguments.

8. **Start.** The domain's `A` record resolves to the server (`dig +short <domain>`); otherwise
   Caddy cannot obtain the certificate.

   ```sh
   docker compose up -d
   docker compose ps
   curl -fsS https://<domain>/api/health
   docker compose logs litestream
   ```

   - `docker compose ps` shows `app` healthy, `caddy` and `litestream` running.
   - `curl` prints `{"status":"ok"}`. Caddy needs up to a minute for the first certificate; a TLS
     error before that is expected, so repeat `curl` after a minute, then read
     `docker compose logs caddy`.
   - The Litestream log shows replication of `/data/combat-planner.db` and no errors; the bucket
     lists `combat-planner.db/` in the Yandex console.

9. **Smoke.**
   - From a phone: sign up, create a combat, add a unit, share the player link.
   - Open the link on a second device; a change by the DM appears there within a second.

10. **Restore drill.** Run the [restore drill](#restore-drill) once.

## Admin page

`https://<domain>/admin` shows server load, usage, a 14-day table and the status of every part of
the stack, refreshed every 30 s; the background checks run every minute. Caddy refuses to start
without `ADMIN_USER` and `ADMIN_PASSWORD_HASH`, so a server updated to a release with the admin
page takes these steps before `docker compose up`. As `deploy`, in `/opt/combat-planner/deploy`:

1. Choose a login and a long password; keep both in the password manager.
2. `docker compose run --rm --no-deps caddy caddy hash-password` asks for the password twice and
   prints its hash. `nano .env`: set `ADMIN_USER` to the login and `ADMIN_PASSWORD_HASH` to the
   hash in single quotes, e.g. `ADMIN_PASSWORD_HASH='$2a$14$…'`: unquoted, Compose would read
   each `$` as a variable. Then `clear`.
3. `docker compose up -d --force-recreate caddy app litestream`: Caddy reads the login, the app
   turns the page on and Litestream starts serving its metrics.

`https://<domain>/admin` asks for the login and password; without them it answers 401.

The section «Последние ошибки» lists the newest 20 of the errors the app records itself: uncaught
browser errors (`POST /api/errors`, at most 10 a minute per address) and unhandled server errors,
with the route pattern as the path. URLs lose their query and fragment, so player link tokens are
never stored; no address, user or header is stored. The sweeper keeps 14 days and at most 500
rows. The check «Ошибки за час» turns red from 1 server error or 10 browser errors in the last
hour.

## Monitoring

`GET /api/health/checks` exists while `ADMIN_PAGE=1`, outside the admin login: `200
{"status":"ok"}` while no check on `/admin` is red, `503 {"status":"problem"}` otherwise, with no
check names. The Docker healthcheck and `deploy/deploy.sh` read only `/api/health`, so a red check
never restarts the container or rolls back a deploy.

UptimeRobot (free plan) e-mails the owner. In its dashboard, with the owner's e-mail as the alert
contact:

1. HTTP(s) keyword monitor `https://<domain>/api/health`, keyword `ok`, interval 5 min.
2. HTTP(s) monitor `https://<domain>/api/health/checks`, alert on any status other than 200,
   interval 5 min.

When the second monitor alerts, open `/admin` and look for the red row.

## Deploy

A release deploys itself: the `release` workflow ends with the job `deploy`
(`.github/workflows/deploy.yml`), which waits in the GitHub environment `production` until the
owner presses "Review deployments" → "Approve and deploy" on the run. A manual run deploys any
released tag, the current one (redeploy) or an older one (rollback):

```sh
gh workflow run deploy -f tag=<tag>
```

The run waits for the same approval. The job refuses a tag that is not `vX.Y.Z` or has no GitHub
Release, then connects as `deploy` with the deploy key, which can run only `deploy/deploy.sh`
([Deploy key](#deploy-key)). The script's output is the job log and its exit code the job's
result. The script:

1. Runs from a temporary copy of itself, refuses anything but `vX.Y.Z` and refuses to run while
   another deploy holds `/opt/combat-planner/.deploy.lock`.
2. Records the commit of the checkout and `APP_IMAGE` from `.env`, runs `git fetch --tags origin`
   and refuses a tag without `deploy/deploy.sh`, which the next deploy could not run. Such a tag
   is deployed by hand ([Manual deploy](#manual-deploy)).
3. Checks out the tag (detached), pulls `ghcr.io/clericlvl2/combat-planner-v2:<version>` and
   snapshots the database through the running app into the `data` volume,
   `/data/backups/pre-<tag>-<UTC time>.db`; the newest 3 snapshots stay.
4. Sets `APP_IMAGE` in `.env` (no other line changes), runs
   `docker compose up -d --force-recreate --wait` and waits up to 60 s for
   `<BETTER_AUTH_URL>/api/health` to answer 200.
5. Success: drops dangling images (`docker image prune -f`; the previous release's image stays
   for a rollback), prints the tag and commit, exits 0.
6. Failure in step 3 or 4: checks out the previous commit, restores the previous `APP_IMAGE`,
   recreates the containers and checks health again; prints `rolled back to <commit> (<image>)`
   and exits 1. When the previous version is not healthy either, it exits 2 without touching the
   database and prints the snapshot path and the commands of a [restore](#restore) to the moment
   the deploy started.

Images of older releases stay on the 10 GB disk; `docker image prune -af` while production runs
drops every image no container uses, the previous release's included.

Old code may not run on a schema migrated by a newer release: a rollback across a migration first
restores the database to a moment before the newer release was deployed ([Restore](#restore),
with `-timestamp`), then deploys the previous tag.

## Deploy key

One-time setup of the deploy button. The key is used only by the `deploy` workflow; its private
half lives only on the operator's machine and in the GitHub secret, and is never printed or
pasted anywhere. Prerequisite: the server runs a release that contains `deploy/deploy.sh`, deployed
by hand ([Manual deploy](#manual-deploy)); `<tag>` below is that release.

1. On the operator's machine, create the key:

   ```sh
   ssh-keygen -t ed25519 -N '' -C 'github-deploy' -f ~/.ssh/combat_planner_github_deploy
   ```

2. Allow it on the server for `deploy/deploy.sh` only: `command=` runs the script whatever the
   client asks, with the requested command (the tag) in `SSH_ORIGINAL_COMMAND`; `restrict` turns
   off port, agent and X11 forwarding and the PTY. On the operator's machine:

   ```sh
   printf 'command="/opt/combat-planner/deploy/deploy.sh",restrict %s\n' \
     "$(cat ~/.ssh/combat_planner_github_deploy.pub)" \
     | ssh -i ~/.ssh/<key> deploy@<server-ip> 'cat >> ~/.ssh/authorized_keys'
   ```

3. Read the server's host key and check it against the server's own:

   ```sh
   ssh-keyscan -t ed25519 <server-ip> > /tmp/combat_planner_known_hosts
   ssh-keygen -lf /tmp/combat_planner_known_hosts
   ssh -i ~/.ssh/<key> deploy@<server-ip> 'ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub'
   ```

   Both fingerprints are equal; otherwise stop.

4. Create the GitHub environment `production` with the owner as its required reviewer, and its
   three secrets:

   ```sh
   gh api -X PUT repos/clericlvl2/combat-planner-v2/environments/production --input - <<EOF
   {"reviewers": [{"type": "User", "id": $(gh api user --jq .id)}]}
   EOF
   gh secret set DEPLOY_HOST --env production --repo clericlvl2/combat-planner-v2 --body '<server-ip>'
   gh secret set DEPLOY_KNOWN_HOSTS --env production --repo clericlvl2/combat-planner-v2 < /tmp/combat_planner_known_hosts
   gh secret set DEPLOY_SSH_KEY --env production --repo clericlvl2/combat-planner-v2 < ~/.ssh/combat_planner_github_deploy
   rm /tmp/combat_planner_known_hosts
   ```

5. Test: `gh workflow run deploy -f tag=<tag>`, approve the run on GitHub; the same version
   redeploys and the job ends green.

To revoke the key, delete its line from `/home/deploy/.ssh/authorized_keys` on the server and the
secret `DEPLOY_SSH_KEY` on GitHub.

## Manual deploy

For emergencies, e.g. when GitHub Actions is down, or for a tag without `deploy/deploy.sh`.
Production runs released code only: the image and the `deploy/` files of the same release tag.

As `deploy`, in `/opt/combat-planner/deploy`:

1. Check out the release's files:

   ```sh
   git fetch --tags origin && git checkout --detach <tag>
   ```

2. `nano .env`: set the release tag, without the `v`, in `APP_IMAGE`.
3. Pull the image and recreate the containers: a bind-mounted file such as `Caddyfile` reaches
   its container only when the container is recreated.

   ```sh
   docker compose pull app && docker compose up -d --force-recreate --wait
   ```

4. `docker compose ps` shows `app` healthy; `curl -fsS https://<domain>/api/health` prints
   `{"status":"ok"}`.

Rollback is the same procedure with the previous tag; the rule on migrations under
[Deploy](#deploy) applies.

## Restore drill

Restores the replica into a side file and starts a throwaway app on it; production keeps running.
As `deploy`, in `/opt/combat-planner/deploy`:

```sh
docker compose run --rm litestream restore -o /data/restore-test.db /data/combat-planner.db
docker compose run -d --rm --no-deps --name combat-planner-restore-test \
  -p 127.0.0.1:3001:3000 -e DATABASE_PATH=/data/restore-test.db app
sleep 10
curl -fsS http://127.0.0.1:3001/api/health
docker stop combat-planner-restore-test
docker compose exec app rm -f /data/restore-test.db /data/restore-test.db-wal /data/restore-test.db-shm
```

`restore` reads the bucket, endpoint and key from `litestream.yml` for the database path given;
`curl` prints `{"status":"ok"}`.

## Restore

Rebuilds production from the bucket, e.g. on a new server, or rolls the database back to a
moment before damage.

The bucket holds the changes of the last 24 h (Litestream's default snapshot retention).
Without `-timestamp`, `restore` returns the latest replicated state, which contains any damage
older than 10 s. With `-timestamp <RFC 3339, UTC>` it returns the last replicated state strictly
before that moment; for a moment older than a few minutes the state may be up to a few minutes
earlier, never later. The moment before a bad action, migration or deletion is chosen before
anything is deleted: after 24 h the damaged state is the only one left.

1. Runbook steps 1–6.
2. Step 7 with `BETTER_AUTH_SECRET` and `LINK_SECRET` from the password manager and the same
   `DOMAIN`. Other values sign every user out and break every player link.
3. Create the `data` volume through `app`, so it belongs to uid 1000, then restore into it:

   ```sh
   docker compose run --rm --no-deps --entrypoint true app
   docker compose run --rm --no-deps litestream restore /data/combat-planner.db
   ```

   For a moment before damage:
   `docker compose run --rm --no-deps litestream restore -timestamp <RFC 3339, UTC> /data/combat-planner.db`,
   e.g. `-timestamp 2026-10-22T10:00:00Z`.

   `restore` refuses to overwrite an existing database. To restore on a server whose database
   is damaged, first `docker compose down`, then `docker volume rm combat-planner_data`, then
   step 3.

4. Runbook step 8 onwards. Accounts, sessions, combats and player links work as before the
   loss, up to the last replicated 10 s.
