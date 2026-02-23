
import asyncio
import json
from playwright.async_api import async_playwright

async def verify_ui():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1280, 'height': 800}
        )

        # Inject fake token
        await context.add_init_script("localStorage.setItem('spotify_token', 'fake_token')")

        page = await context.new_page()

        # Mock only API calls
        async def handle_route(route):
            url = route.request.url
            if "api.spotify.com" in url:
                if "/v1/me" in url and "top" not in url and "player" not in url:
                    await route.fulfill(status=200, content_type="application/json", body=json.dumps({
                        "display_name": "Test User",
                        "id": "test_user",
                        "images": [{"url": "https://ui-avatars.com/api/?name=Test+User"}],
                        "product": "premium"
                    }))
                elif "currently-playing" in url:
                    await route.fulfill(status=204)
                else:
                    await route.fulfill(status=200, content_type="application/json", body=json.dumps({"items": []}))
            elif "supabase.co" in url:
                await route.fulfill(status=200, content_type="application/json", body=json.dumps([]))
            else:
                await route.continue_()

        await page.route("**/*", handle_route)

        # Go to the app
        await page.goto("http://localhost:3000")

        # Wait for potential loading
        await page.wait_for_timeout(5000)

        # Take screenshot
        await page.screenshot(path="/app/verification/main_page.png")
        print("Main page screenshot saved.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_ui())
