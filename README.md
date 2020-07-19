# Slack instructions
- [Create new app](https://api.slack.com/apps?new_classic_app=1)
  - Needs to be a "Classic" app to use RTM
    - Events API doesn't support presence changes (yet?)
    - See [this](https://medium.com/@ritikjain1272/how-to-make-a-slack-bot-in-python-using-slacks-rtm-api-335b393563cd) for more info
  - Set to whatever workspace you need it on
- Go to "App Home"
  - "Add Legacy Bot User"
- Go to "OAuth & Permissions"
  - "Install App to Workspace"
    - "Allow"
  - Copy "OAuth Access Token"
    - `export SLACK_BOT_TOKEN=<oauth token>`
- Go to "Basic Information", copy "Signing Secret"
  - `export SLACK_SIGNING_SECRET=<signing secret>` 

## Message events
If logging message counts in public channels:
- `conversations.join` needs to be called to join every public channel
- Need to listen for `channel_created` event to join new channels

Or it could just join and list to #stream channel, and ignore channels that opt out of that
Or stream bot could just include `@techby/impact` lib and do the `incrementMetric` in there...

# Run
Requires Node 14 (esm)

`SLACK_BOT_TOKEN=<token> SLACK_SIGNING_SECRET=<secret> TECH_BY_API_KEY=<api key> npm run dev`
`ngrok http 3000`
See `Go to "Event Subscriptions"` step in Slack Instructions above

For scraper to work, it needs a Slack email and pw
`SLACK_EMAIL=<email> SLACK_PASSWORD=<password> SLACK_BOT_TOKEN=<token> SLACK_SIGNING_SECRET=<secret> TECH_BY_API_KEY=<api key> npm run dev`