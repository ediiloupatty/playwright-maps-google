const { chromium } = require('playwright');
const fs = require('fs');

const urls = [
    'https://maps.app.goo.gl/GjkLKCgRLAz7Wvc29',
    'https://maps.app.goo.gl/9nbxTkXVrrTwf2xW7',
    'https://maps.app.goo.gl/JiPL1N4rUs2M5mn1A',
    'https://maps.app.goo.gl/KDrvPWB8GRaxNXBy7',
    'https://maps.app.goo.gl/oBpRqNEW9ZAUMWtt8',
    'https://maps.app.goo.gl/FjAgN6Dne1yQKQbp9',
    'https://maps.app.goo.gl/QXmkEpZVLYwxnNrU7',
    'https://maps.app.goo.gl/f9AweRF7XbdtNQ8N8',
    'https://maps.app.goo.gl/oYNx1rerc6P37yZf8',
    'https://maps.app.goo.gl/m1QEeWAaCMT67AHR6',
    'https://maps.app.goo.gl/RG3mtEynRyp1euTE9',
    'https://maps.app.goo.gl/yRxaLeNF1oPsqu7y6'
];

(async () => {
    // Path to User Data Directory. We use the parent 'User Data' folder to access the 'Default' profile.
    const userDataDir = 'C:\\Users\\ediloupatty\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data';

    console.log("Launching Brave with persistent profile...");
    console.log("IMPORTANT: Please ensure all Brave windows are CLOSED before running this script.");

    // Launch browser with persistent context
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        viewport: null // Use actual window size
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    for (const url of urls) {
        try {
            console.log(`\n--------------------------------------------------`);
            console.log(`Navigating to: ${url}`);
            await page.goto(url);

            // Wait for the place name to load
            await page.waitForSelector('h1', { timeout: 20000 });

            // Extract the Place Name
            const placeName = await page.locator('h1').first().innerText();
            console.log('Place Name:', placeName);

            // Sanitize place name for filename
            const safeFileName = placeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `${safeFileName}.csv`;

            // Extract Rating (if available)
            const ratingLocator = page.locator('div[role="img"][aria-label*="bintang"], div[role="img"][aria-label*="stars"]').first();
            let rating = 'N/A';
            if (await ratingLocator.count() > 0) {
                rating = await ratingLocator.getAttribute('aria-label');
                console.log('Rating:', rating);
            }

            // Extract Address
            const addressButton = page.locator('button[data-item-id="address"]');
            if (await addressButton.count() > 0) {
                const address = await addressButton.getAttribute('aria-label');
                console.log('Address:', address);
            }

            // Click on "Ulasan" (Reviews) tab
            console.log("Looking for 'Ulasan' tab...");
            const ulasanTab = page.locator('button, div[role="tab"]').filter({ hasText: /^Ulasan$|^Reviews$/ }).first();
            const fallbackReviewsTab = page.locator('button[aria-label*="Ulasan"], button[aria-label*="Reviews"], div[role="tab"]:has-text("Ulasan")').first();

            if (await ulasanTab.count() > 0 && await ulasanTab.isVisible()) {
                await ulasanTab.click();
            } else if (await fallbackReviewsTab.count() > 0 && await fallbackReviewsTab.isVisible()) {
                await fallbackReviewsTab.click();
            } else {
                // Fallback: strict partial match
                const ulasanPartial = page.getByText('Ulasan', { exact: false }).first();
                if (await ulasanPartial.isVisible()) {
                    await ulasanPartial.click();
                } else {
                    console.log("Could not find Ulasan/Reviews tab. Skipping reviews for this location.");
                    continue;
                }
            }

            console.log("Waiting for reviews to appear...");
            try {
                await page.waitForSelector('.jftiEf', { timeout: 10000 });
            } catch (e) {
                console.log("No reviews found or timeout waiting for reviews.");
                continue;
            }

            console.log("Reviews loaded. Scrolling to fetch ALL reviews...");

            const scrollableSelector = 'div.m6QErb.DxyBCb.kA9KIf.dS8AEf';

            let previousCount = 0;
            let sameCountSteps = 0;
            const MAX_RETRIES = 5;

            while (true) {
                const currentCount = await page.locator('div.jftiEf').count();
                process.stdout.write(`\rLoaded reviews: ${currentCount}`);

                if (currentCount === previousCount) {
                    sameCountSteps++;
                    if (sameCountSteps >= MAX_RETRIES) {
                        console.log("\nReview count stabilized. Assuming all reviews loaded.");
                        break;
                    }
                } else {
                    sameCountSteps = 0;
                    previousCount = currentCount;
                }

                // Scroll down
                const scrolled = await page.evaluate((selector) => {
                    const el = document.querySelector(selector);
                    if (el) {
                        el.scrollTop = el.scrollHeight;
                        return true;
                    }
                    return false;
                }, scrollableSelector);

                if (!scrolled) {
                    await page.keyboard.press('End');
                }

                await page.waitForTimeout(2000 + Math.random() * 1000);
            }

            console.log("Extracting data...");
            // Extract reviews data
            const reviewsData = await page.$$eval('div.jftiEf', (reviews) => {
                return reviews.map(review => {
                    // Name
                    const nameEl = review.querySelector('.d4r55');
                    const name = nameEl ? nameEl.innerText.trim() : 'Unknown';

                    // Rating
                    const ratingEl = review.querySelector('span[role="img"]');
                    const rating = ratingEl ? ratingEl.getAttribute('aria-label') : 'N/A';

                    // Time
                    const timeEl = review.querySelector('.rsqaWe');
                    const time = timeEl ? timeEl.innerText.trim() : 'N/A';

                    // Review Text
                    const textEl = review.querySelector('.wiI7pd');
                    const text = textEl ? textEl.innerText.trim() : '';
                    const cleanText = text.replace(/(\r\n|\n|\r)/gm, " ");

                    return { name, rating, time, text: cleanText };
                });
            });

            console.log(`Successfully extracted ${reviewsData.length} reviews for ${placeName}.`);

            // Create CSV Content
            const header = 'Name,Rating,Time,Review Text\n';
            const csvContent = reviewsData.map(r => {
                const safeName = `"${r.name.replace(/"/g, '""')}"`;
                const safeRating = `"${r.rating.replace(/"/g, '""')}"`;
                const safeTime = `"${r.time.replace(/"/g, '""')}"`;
                const safeText = `"${r.text.replace(/"/g, '""')}"`;
                return `${safeName},${safeRating},${safeTime},${safeText}`;
            }).join('\n');

            fs.writeFileSync(filename, header + csvContent);
            console.log(`Data saved to ${filename}`);

        } catch (error) {
            console.error(`Error processing ${url}:`, error);
        }
    }

    console.log("All URLs processed.");
    await context.close();
})();
