# OAuth Setup

## 1. Register OAuth Apps

Redirect URI pattern: `https://linkpou.ch/login/oauth2/code/{provider}`

### GitHub
1. github.com → Settings → Developer settings → OAuth Apps → **New OAuth App**
2. Homepage URL: `https://linkpou.ch`
3. Authorization callback URL: `https://linkpou.ch/login/oauth2/code/github`
4. Note **Client ID**, generate and note **Client Secret**

### Google
1. console.cloud.google.com → APIs & Services → Credentials → **Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. Authorized redirect URI: `https://linkpou.ch/login/oauth2/code/google`
4. Note **Client ID** and **Client Secret**
5. Configure OAuth consent screen (External; add your email as test user until published)

### Discord
1. discord.com/developers/applications → **New Application**
2. OAuth2 → General → add redirect: `https://linkpou.ch/login/oauth2/code/discord`
3. Note **Client ID** and **Client Secret** (Reset Secret to reveal)

### Twitter/X
1. developer.twitter.com → Projects & Apps → **New App**
2. Select **OAuth 2.0** (not OAuth 1.0a), App type: **Web App**
3. Callback URI: `https://linkpou.ch/login/oauth2/code/twitter`
4. Note **Client ID** and **Client Secret**
5. In User authentication settings, enable **"Request email from users"** — otherwise email is always null

Note: the Twitter v2 user info endpoint wraps the response in `{"data": {...}}` — the success handler already handles this.

---

## 2. Create Bitwarden Secrets

Create 8 entries in Bitwarden Secrets Manager:

| Secret name             | Value                                      |
|-------------------------|--------------------------------------------|
| `GITHUB_CLIENT_ID`      | Client ID from GitHub OAuth app            |
| `GITHUB_CLIENT_SECRET`  | Client secret from GitHub OAuth app        |
| `GOOGLE_CLIENT_ID`      | Client ID from Google Cloud console        |
| `GOOGLE_CLIENT_SECRET`  | Client secret from Google Cloud console    |
| `DISCORD_CLIENT_ID`     | Client ID from Discord developer portal    |
| `DISCORD_CLIENT_SECRET` | Client secret from Discord developer portal |
| `TWITTER_CLIENT_ID`     | Client ID from Twitter developer portal    |
| `TWITTER_CLIENT_SECRET` | Client secret from Twitter developer portal |

Then update `k8s/stash-service/external-secret.yaml` — replace the placeholder `key` values for each OAuth secret with the real Bitwarden UUIDs.

---

## 3. Local Testing (GitHub only)

Create a separate GitHub OAuth app for local use:
- Homepage URL: `http://localhost:8080`
- Callback URL: `http://localhost:8081/login/oauth2/code/github`

Run stash-service with:
```
GITHUB_CLIENT_ID=xxx GITHUB_CLIENT_SECRET=yyy mvn spring-boot:run -pl boot
```

Then hit `http://localhost:8081/oauth2/authorization/github` — should redirect to GitHub and back to `http://localhost:3000/account?token=...`.
