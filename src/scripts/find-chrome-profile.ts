import { chromium } from 'playwright';

async function findChromeProfile() {
  const profiles = [
    { name: 'Default', path: '/Users/raunakbohra/Library/Application Support/Google/Chrome/Default' },
    { name: 'Profile 1', path: '/Users/raunakbohra/Library/Application Support/Google/Chrome/Profile 1' },
    { name: 'Profile 3', path: '/Users/raunakbohra/Library/Application Support/Google/Chrome/Profile 3' },
    { name: 'Profile 9', path: '/Users/raunakbohra/Library/Application Support/Google/Chrome/Profile 9' },
  ];

  for (const profile of profiles) {
    console.log('\n' + '='.repeat(60));
    console.log(`🔍 Opening Chrome ${profile.name}...`);
    console.log('='.repeat(60));
    
    try {
      const browser = await chromium.launchPersistentContext(
        profile.path,
        {
          channel: 'chrome',
          headless: false,
          viewport: { width: 1920, height: 1080 },
        }
      );

      const page = await browser.newPage();
      
      // Navigate to Google account page to show which account is logged in
      console.log('📍 Navigating to Google account page...');
      await page.goto('https://myaccount.google.com/', { waitUntil: 'networkidle' });
      
      console.log(`\n✅ ${profile.name} is now open!`);
      console.log('👀 Check if this shows rnkbohra@gmail.com');
      console.log('\nPress Enter to close this profile and try the next one...');
      
      // Wait for user input
      await new Promise((resolve) => {
        process.stdin.once('data', resolve);
      });
      
      await browser.close();
      console.log(`❌ Closed ${profile.name}\n`);
      
    } catch (error) {
      console.error(`❌ Error opening ${profile.name}:`, error.message);
    }
  }
  
  console.log('\n✅ All profiles checked!');
  console.log('If you found the correct profile, please let me know which one it was.');
}

// Enable stdin for user input
process.stdin.resume();
process.stdin.setEncoding('utf8');

// Run the script
findChromeProfile().catch(console.error).finally(() => {
  process.exit();
});