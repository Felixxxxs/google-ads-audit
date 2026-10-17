# Security

## Reporting a vulnerability

If you find a security issue in this skill (for example a script that could leak a token, write to an account, or send data somewhere it should not), please **do not open a public issue**. Use GitHub's **"Report a vulnerability"** button on the Security tab to file a private advisory.

## How the skill handles your data and credentials

- **Read only.** The scripts call read endpoints only and request read scopes only. They cannot change your account.
- **Credentials stay on your machine**, in `~/.config/google-ads-audit/` outside any repository, or in environment variables. They are never printed, committed or sent anywhere except to Google's own OAuth and API endpoints.
- **Reports contain business data.** Store them in a private repository or folder. Do not post exports, reports or screenshots in public issues; remove account IDs and figures first.
- If a token ever ends up in a chat, a commit or a log: revoke it immediately (Google account permissions, or delete the service-account key) and create a new one.
