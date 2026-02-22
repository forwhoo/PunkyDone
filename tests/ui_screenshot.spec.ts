import { test, expect } from '@playwright/test';

test('capture dashboard interactions', async ({ page }) => {
  page.on('console', msg => console.log('App Console:', msg.text()));
  page.on('pageerror', err => console.log('App Error:', err));

  // Set fake token to bypass login
  await page.addInitScript(() => {
    localStorage.setItem('spotify_token', 'fake-token-123');
    // Pre-populate some artist images to avoid network calls or broken images
    localStorage.setItem('artist_images_cache', JSON.stringify({
        'Mock Artist 0': 'https://placehold.co/400x400/8A2BE2/white?text=Artist+0',
        'Mock Artist 1': 'https://placehold.co/400x400/FF4500/white?text=Artist+1',
        'Mock Artist 2': 'https://placehold.co/400x400/228B22/white?text=Artist+2',
        'Mock Artist 3': 'https://placehold.co/400x400/4169E1/white?text=Artist+3',
        'Mock Artist 4': 'https://placehold.co/400x400/FFD700/black?text=Artist+4',
    }));
  });

  // Mock Spotify User Profile
  await page.route('https://api.spotify.com/v1/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        display_name: 'Test User',
        id: 'test_user',
        images: [{ url: 'https://placehold.co/100x100/333/white?text=User' }],
        product: 'premium'
      })
    });
  });

  // Mock Top Artists (Spotify)
  await page.route('**/v1/me/top/artists*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] })
    });
  });

  // Mock Top Tracks (Spotify)
  await page.route('**/v1/me/top/tracks*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] })
    });
  });

  // Mock Recent Plays (Spotify)
  await page.route('**/v1/me/player/recently-played*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] })
    });
  });

  // Mock Now Playing (Spotify)
  await page.route('**/v1/me/player/currently-playing', async route => {
    await route.fulfill({ status: 204 });
  });

  // Mock Supabase Listening History
  // Intercept any request to listening_history
  await page.route('**/rest/v1/listening_history*', async route => {
    const url = route.request().url();

    // Check if it's a SELECT query
    if (url.includes('select=')) {
        // Generate 50 mock history items for "today"
        const now = new Date();
        const history = Array.from({ length: 100 }).map((_, i) => {
            const playedAt = new Date(now.getTime() - i * 15 * 60000); // Every 15 mins
            const artistId = i % 5;
            return {
                spotify_id: `track-${i}`,
                track_name: `Song ${i % 10}`,
                artist_name: `Mock Artist ${artistId}`,
                album_name: `Album ${artistId}`,
                album_cover: `https://placehold.co/300x300/${['red','blue','green','orange','purple'][artistId]}/white?text=Album+${artistId}`,
                duration_ms: 180000 + (Math.random() * 60000),
                played_at: playedAt.toISOString()
            };
        });

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(history)
        });
    } else {
        // Allow other requests (like OPTIONS) or just return empty
        await route.fulfill({ status: 200, body: '[]' });
    }
  });

  // Also mock any RPC calls if they happen
  await page.route('**/rest/v1/rpc/*', async route => {
     await route.fulfill({ status: 200, body: '[]' });
  });

  // Navigate to the dashboard
  await page.goto('/');

  // Wait for the dashboard to load 'Top Artists'
  try {
      // Desktop view has "Top Artists", mobile has "Your Top Artists"
      await expect(page.getByRole('heading', { name: 'Top Artists' })).toBeVisible({ timeout: 20000 });
  } catch (e) {
      console.log('Timeout waiting for heading. Taking debug screenshot.');
      await page.screenshot({ path: 'debug_timeout.png' });
      throw e;
  }

  // Allow animations and images to settle
  await page.waitForTimeout(3000);

  // Take screenshot of the Dashboard
  await page.screenshot({ path: 'dashboard_view.png' });
  console.log('Taken dashboard_view.png');

  // Find and Click on 'Mock Artist 0' (Ranked #1 likely)
  // We need to make sure we select the visible one (Desktop version)
  const artistCard = page.locator('.hidden.lg\\:block').getByText('Mock Artist 0').first();
  await expect(artistCard).toBeVisible();

  // Click the artist card. We might need to click the parent container.
  // The text is inside the container which has the onClick.
  // We can just click the text, events should bubble.
  await artistCard.click();

  // Wait for the modal to open
  // We expect a large "Mock Artist 0" heading (level 1)
  await expect(page.getByRole('heading', { name: 'Mock Artist 0', level: 1 })).toBeVisible();

  // Wait for modal animations
  await page.waitForTimeout(1000);

  // Take screenshot of the Modal
  await page.screenshot({ path: 'artist_modal_view.png' });
  console.log('Taken artist_modal_view.png');

  // Close the modal
  // There is a close button (X icon) in the modal
  // It's usually the one fixed at top right
  const closeButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first();
  await closeButton.click();

  // Wait for modal to disappear
  await expect(page.getByRole('heading', { name: 'Mock Artist 0', level: 1 })).not.toBeVisible();

  // Wait for closing animation
  await page.waitForTimeout(1000);

  // Take screenshot after closing
  await page.screenshot({ path: 'dashboard_after_close.png' });
  console.log('Taken dashboard_after_close.png');
});
