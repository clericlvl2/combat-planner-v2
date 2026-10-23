# Deploy

Combat Planner in production on one Ubuntu 24.04 VPS (`linux/amd64`, 1 GB RAM, 10 GB disk):
HTTPS on a domain and a continuous SQLite backup to Yandex Object Storage.

`compose.yml` runs three services:

- `app`: the release image `ghcr.io/clericlvl2/combat-planner-v2:<tag>`, pulled anonymously.
  No port is published; only Caddy reaches it. It receives only `BETTER_AUTH_URL`,
  `BETTER_AUTH_SECRET`, `LINK_SECRET` and the optional `GOOGLE_*` and `GITHUB_*` sign-in pairs,
  never the bucket key.
- `caddy`: `caddy:2` on ports 80/tcp and 443/tcp+udp (HTTP/3), with automatic Let's Encrypt
  certificates for `DOMAIN` and `www.DOMAIN`, proxying `DOMAIN` to `app:3000` and redirecting
  `www.DOMAIN` to `DOMAIN` (`Caddyfile`). It refuses a request body over 64 KB under `/api/`
  with 413 and sends no `Via` header.
- `litestream`: `litestream/litestream:0.5`, replicating `/data/combat-planner.db` to the bucket
  every 10 s (`litestream.yml`). It runs as uid 1000, like `app`, because it writes beside the
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

5. **Files.** The checkout is read-only on the server and always on `main`; only `deploy/.env` is
   added. No other branch is checked out or pulled on the server: unreleased code runs only in a
   separate test environment.

   ```sh
   git clone --branch main https://github.com/clericlvl2/combat-planner-v2 /opt/combat-planner
   chown -R deploy:deploy /opt/combat-planner
   ```

   As `deploy`:

   ```sh
   cd /opt/combat-planner/deploy
   cp .env.example .env
   chmod 600 .env
   nano .env
   ```

   In `nano`, set `APP_IMAGE` to the tag of the latest release on
   https://github.com/clericlvl2/combat-planner-v2/releases, without the `v`.

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

## Update

Production runs released code only: the image tag of a release and the `deploy/` files from
`main`, pulled after the release is merged.

As `deploy`, in `/opt/combat-planner/deploy`:

1. `nano .env`: set the release tag in `APP_IMAGE`.
2. Pull and restart the app, then drop every image no container uses, the previous release
   included: the 10 GB disk holds only a few images.

   ```sh
   docker compose pull app && docker compose up -d app && docker image prune -af
   ```

3. `docker compose ps` shows `app` healthy; `curl -fsS https://<domain>/api/health` prints
   `{"status":"ok"}`.

A release that changes files in `deploy/` takes `git pull` before step 2 and
`docker compose up -d --force-recreate` in step 2: a bind-mounted file such as `Caddyfile`
reaches its container only when the container is recreated.

Rollback is the same procedure with the previous tag, which is pulled again. Old code may not run
on a schema migrated by a newer release: such a rollback first restores the database to a moment
before the update ([Restore](#restore), with `-timestamp`), then starts the previous tag.

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
