import { chromium } from 'playwright';

async function openChromeProfile(profileName: string, profilePath: string) {
  console.log(`\n🚀 Opening Chrome with ${profileName}...`);

  try {
    // Launch Chrome with the specific profile
    const browser = await chromium.launch({
      channel: 'chrome',
      headless: false,
      args: [`--profile-directory=${profileName}`, '--no-first-run', '--no-default-browser-check'],
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    });

    console.log(`✅ Chrome opened with ${profileName}`);
    console.log('🔍 Check which account is logged in');
    console.log("📝 When ready, close the browser and I'll open the next profile\n");

    // Keep the script running until browser is closed
    await new Promise(() => {});
  } catch (error) {
    console.log(`Trying alternative method for ${profileName}...`);

    // Alternative: Use launchPersistentContext
    try {
      const browser = await chromium.launchPersistentContext(profilePath, {
        channel: 'chrome',
        headless: false,
        viewport: { width: 1920, height: 1080 },
      });

      const page = await browser.newPage();
      await page.goto('https://gmail.com');

      console.log(`✅ Chrome opened with ${profileName} (alternative method)`);
      console.log('🔍 Check the Gmail account to see which email is logged in');
      console.log('Press Ctrl+C when you find the right profile\n');

      // Keep running
      await new Promise(() => {});
    } catch (err) {
      console.error(`❌ Failed to open ${profileName}:`, err.message);
    }
  }
}

async function main() {
  console.log('🔍 Chrome Profile Finder');
  console.log('I will open each Chrome profile one by one.');
  console.log('When you see rnkbohra@gmail.com, let me know!\n');

  const profiles = [
    {
      name: 'Default',
      path: '/Users/raunakbohra/Library/Application Support/Google/Chrome/Default',
    },
    {
      name: 'Profile 1',
      path: '/Users/raunakbohra/Library/Application Support/Google/Chrome/Profile 1',
    },
    {
      name: 'Profile 3',
      path: '/Users/raunakbohra/Library/Application Support/Google/Chrome/Profile 3',
    },
    {
      name: 'Profile 9',
      path: '/Users/raunakbohra/Library/Application Support/Google/Chrome/Profile 9',
    },
  ];

  // Try each profile
  for (const profile of profiles) {
    await openChromeProfile(profile.name, profile.path);
  }
}

main().catch(console.error);
