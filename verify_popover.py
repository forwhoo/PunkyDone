from playwright.sync_api import sync_playwright, expect
import time
import os

if os.path.exists("verification_popover.png"):
    os.remove("verification_popover.png")

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1280, "height": 720},
        storage_state={
            "origins": [
                {
                    "origin": "http://localhost:3000",
                    "localStorage": [
                        {"name": "spotify_token", "value": "mock_token"}
                    ]
                }
            ]
        },
        bypass_csp=True
    )

    page = context.new_page()

    # Register routes
    def handle_spotify(route):
        route.fulfill(status=200, content_type="application/json", body='{"items": []}')
    page.route("**/v1/**", handle_spotify)

    def handle_supabase(route):
        route.fulfill(status=200, content_type="application/json", body='[]')
    page.route("**/rest/v1/**", handle_supabase)

    def handle_me(route):
        route.fulfill(status=200, content_type="application/json", body='{"id": "user1", "display_name": "Test User", "images": [], "product": "premium"}')
    page.route("**/v1/me", handle_me)

    page.route("**/v1/me/player/currently-playing", lambda route: route.fulfill(status=204))

    print("Navigating to app...")
    page.goto("http://localhost:3000")

    # Target desktop search bar
    desktop_search = page.locator(".lg\\:block input[placeholder*='Ask']")

    try:
        desktop_search.wait_for(state="visible", timeout=10000)
    except:
        print("Search bar not found.")
        if page.get_by_text("Retry Connection").is_visible():
             print("Clicking Retry...")
             page.get_by_text("Retry Connection").click()
             try:
                 desktop_search.wait_for(state="visible", timeout=5000)
             except:
                 pass

        if not desktop_search.is_visible():
             print("Still failing.")
             browser.close()
             return

    print("Typing search query to open AI modal...")
    desktop_search.fill("Hello")
    desktop_search.press("Enter")

    print("Waiting for AI modal...")
    page.wait_for_selector("#ai-spotlight", timeout=5000)

    print("Clicking Persona button (looking for 'Default')...")
    persona_btn = page.locator("#ai-spotlight button").filter(has_text="Default").first
    persona_btn.click()

    print("Verifying popover content...")
    try:
        popover_item = page.get_by_text("Music Critic")
        expect(popover_item).to_be_visible(timeout=5000)
        print("SUCCESS: Popover is visible!")

        z_index = popover_item.evaluate("el => getComputedStyle(el.closest('.z-\\\\[10002\\\\]')).zIndex")
        print(f"Popover Z-Index: {z_index}")

        box = popover_item.bounding_box()
        print(f"Bounding Box: {box}")

        opacity = popover_item.evaluate("el => getComputedStyle(el).opacity")
        print(f"Opacity: {opacity}")

        visibility = popover_item.evaluate("el => getComputedStyle(el).visibility")
        print(f"Visibility: {visibility}")

        # Highlight it
        popover_item.evaluate("el => el.style.border = '5px solid red'")
        popover_item.evaluate("el => el.style.backgroundColor = 'yellow'")

        # Highlight parent
        popover_item.evaluate("el => el.closest('.z-\\\\[10002\\\\]').style.border = '5px solid green'")

    except Exception as e:
        print(f"FAILURE: Popover not visible. {e}")

    # Wait for animation
    time.sleep(2)

    page.screenshot(path="verification_popover.png")
    print("Screenshot saved.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
