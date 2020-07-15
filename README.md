# Slack instructions
- [Create new app](https://api.slack.com/apps/new)
  - Set to whatever workspace you need it on
-Go to  "OAuth & Permissions"
  - Set scopes:
    - `users:read`
  - "Install App to Workspace"
    - "Allow"
  - Copy "OAuth Access Token"
    - `export SLACK_BOT_TOKEN=<oauth token>`
- Go to "Basic Information", copy "Signing Secret"
  - `export SLACK_SIGNING_SECRET=<signing secret>` 
- Go to "Event Subscriptions"
  - Enable and set url to https://<your-ngrok-slug>.ngrok.io/slack/events
  - Subscribe to bot events
    - add "team_join", "user_change"

## Message events
If logging message counts in public channels:
- `channels:history` scope needs to be added
- `conversations.join` needs to be called to join every public channel
- Need to listen for `channel_created` event to join new channels

Or it could just join and list to #stream channel, and ignore channels that opt out of that
Or stream bot could just include `@techby/impact` lib and do the `incrementMetric` in there...

# Run
Requires Node 14 (esm)

`SLACK_BOT_TOKEN=<token> SLACK_SIGNING_SECRET=<secret> IMPACT_API_KEY=<api key> npm run dev`
`ngrok http 3000`
See `Go to "Event Subscriptions"` step in Slack Instructions above