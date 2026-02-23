from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})

        # Mock token
        context.add_init_script("localStorage.setItem('spotify_token', 'mock_token')")
        context.add_init_script("localStorage.setItem('spotify_token_timestamp', Date.now().toString())")

        # Mock Spotify API & Supabase
        def handle_route(route):
            url = route.request.url
            # print(f"Request: {url}")

            if "v1/me/player" in url:
                route.fulfill(status=204)
            elif "v1/me/top/artists" in url:
                route.fulfill(status=200, content_type="application/json", body='{"items": [{"name": "Artist 1", "images": [{"url": "http://example.com/img.jpg"}]}]}')
            elif "v1/me/top/tracks" in url:
                route.fulfill(status=200, content_type="application/json", body='{"items": []}')
            elif "v1/me/player/recently-played" in url:
                route.fulfill(status=200, content_type="application/json", body='{"items": []}')
            elif "v1/me" in url:
                route.fulfill(status=200, content_type="application/json", body='{"id": "testuser", "display_name": "Test User", "images": []}')
            elif "rest/v1" in url:
                route.fulfill(status=200, content_type="application/json", body='[]')
            else:
                route.continue_()

        page = context.new_page()
        page.route("**/*", handle_route)

        page.goto("http://localhost:3000")

        # Wait for page to load - wait for dashboard element
        try:
            page.wait_for_selector('input[placeholder*="Ask about your music"]', timeout=10000)
        except:
            print("Timeout waiting for search input")

        # Take screenshot of dashboard
        page.screenshot(path="verification/dashboard.png")

        # Find the Search/Chat input to open the modal
        search_input = page.get_by_placeholder("Ask about your music...")

        if search_input.is_visible():
            print("Found search input")
            # Type and enter to open modal
            search_input.fill("Show me my top artists")
            search_input.press("Enter")

            # Wait for modal animation
            page.wait_for_timeout(2000)

            # Take screenshot of open chat modal
            page.screenshot(path="verification/chat_modal.png")

            # Verify "Lotus Chat" header is GONE
            if page.get_by_text("Lotus Chat").is_visible():
                print("FAILURE: Lotus Chat header is still visible")
            else:
                print("SUCCESS: Lotus Chat header is gone")

            # Check for PromptInput (textarea)
            textarea = page.locator("textarea")
            if textarea.is_visible():
                print("SUCCESS: PromptInput textarea found")
            else:
                print("FAILURE: PromptInput textarea not found")

        else:
            print("Search input not found. Check dashboard.png")

        browser.close()

if __name__ == "__main__":
    run()
