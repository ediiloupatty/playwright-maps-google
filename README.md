# Google Maps Reviews Scraper

A Node.js script using [Playwright](https://playwright.dev/) to scrape reviews from Google Maps URLs. The script uses a persistent browser profile (Brave Browser) to avoid repeated logins and bypass basic anti-bot measures.

## Features

- Scrapes Place Name, Rating, Address, and Reviews (Name, Rating, Time, Text).
- Supports multiple Google Maps URLs.
- Scrolls automatically to load all reviews.
- Exports data to CSV files.
- Uses existing Brave Browser profile for authentication.

## Prerequisites

- [Node.js](https://nodejs.org/) installed.
- Brave Browser installed (or update the path in `index.js` to your preferred browser).

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Maps
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   or manually:
   ```bash
   npm install playwright
   ```

3. Configure Browser Path:
   Open `index.js` and update the `executablePath` and `userDataDir` to match your local Brave Browser or Chrome installation.
   
   ```javascript
   const userDataDir = 'C:\\Users\\<YOUR_USERNAME>\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data';
   // ...
   executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
   ```

## Usage

1. **Close all instances of Brave Browser.** The script requires exclusive access to the user profile.
2. Run the script:
   ```bash
   node index.js
   ```

## Output

The script generates CSV files named after the location (e.g., `j_t_express_manado.csv`) containing the scraped reviews.

## Disclaimer

This tool is for educational purposes only. Automated scraping may violate Google Maps' Terms of Service. Use responsibly.
