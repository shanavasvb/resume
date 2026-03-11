🤖 Beep-Boop 🤖

Maybe you, the reader: "What is this, a messy repo?! Can you arChiTecT the cOdEb4Se a little bit cleaner??? use ReAct probably??"
Me: "No, I don't want to"


![You Wouldn't](you_wouldnt.png)
## Deploy

- **Local (interactive):** run `npx wrangler login` then `npx wrangler pages deploy .`
- **Local (API token):** set `CLOUDFLARE_API_TOKEN` and run `npx wrangler pages deploy .`
- **CI (GitHub Actions):** this repo includes `.github/workflows/deploy-pages.yml`. Create a Cloudflare API token with `pages:write` permission and add it to the repository secrets as `CLOUDFLARE_API_TOKEN`. Push to `main` to trigger the workflow.