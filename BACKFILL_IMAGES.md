# How to Backfill Images for Extended History

If you already uploaded your JSON files and don't have images, you can manually trigger the backfill:

## Option 1: Via Chat (Easiest)

1. Open your app
2. Type `@backfill` in the Lotus chat
3. Wait for completion message

## Option 2: Via Browser Console (Manual)

1. Open your app
2. Press F12 → Console tab
3. Copy and paste this code:

```javascript
// Get the token from localStorage
const token = localStorage.getItem('spotify_token');

if (!token) {
    console.error('No Spotify token found. Please log in first.');
} else {
    // Import the function (works if your app exposes dbService)
    import('/src/services/dbService.ts').then(async ({ backfillExtendedHistoryImages }) => {
        console.log('Starting image backfill...');
        const result = await backfillExtendedHistoryImages(token, (status) => {
            console.log(status);
        });
        console.log('Result:', result);
    });
}
```

4. Press Enter
5. Wait for completion

---

## Automated (Built-in)

From now on, when you upload a JSON file via `@json`, images are **automatically fetched** after upload completes.
