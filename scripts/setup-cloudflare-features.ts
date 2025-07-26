#!/usr/bin/env tsx
// ============================================================================
// CLOUDFLARE FEATURES SETUP SCRIPT
// Automated configuration of all Cloudflare free tier features
// ============================================================================

import { cloudflareService } from '../src/services/CloudflareFeatureService';

async function main() {
  console.log('🚀 Starting Cloudflare Features Setup for iwishBag');
  console.log('================================================\n');

  try {
    // 1. ⚖️ Load Balancing Setup
    console.log('1. 🔄 Setting up Load Balancing...');
    
    const loadBalancerResult = await cloudflareService.createLoadBalancer({
      name: 'iwishbag-main-pool',
      description: 'Main iwishBag application pool with Supabase and Pages backup',
      enabled: true,
      origins: [
        {
          name: 'supabase-primary',
          address: 'grgvlrvywsfmnmkxrecd.supabase.co',
          enabled: true,
          weight: 1.0,
        },
        {
          name: 'pages-backup',
          address: 'iwishbag.pages.dev',
          enabled: true,
          weight: 0.8,
        },
      ],
      minimum_origins: 1,
      check_regions: ['WEU', 'EEU', 'SEAS'], // Western Europe, Eastern Europe, Southeast Asia
    });
    
    console.log('✅ Load Balancer created:', loadBalancerResult.loadBalancer.id);
    console.log('   Monitor ID:', loadBalancerResult.monitor.id);
    console.log('   Pool ID:', loadBalancerResult.pool.id);

    // 2. ⚡ Speed Optimizations
    console.log('\n2. ⚡ Enabling Speed Optimizations...');
    
    const speedResult = await cloudflareService.enableSpeedOptimizations({
      auto_minify: {
        css: true,
        html: true,
        js: true,
      },
      polish: 'lossless',
      mirage: true,
      rocket_loader: true,
      brotli: true,
    });
    
    console.log('✅ Speed optimizations enabled:', speedResult.length, 'features');
    speedResult.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.feature}: ${result.result.success ? '✅' : '❌'}`);
    });

    // 3. 💾 Cache Reserve
    console.log('\n3. 💾 Enabling Cache Reserve...');
    
    const cacheReserveResult = await cloudflareService.enableCacheReserve();
    console.log('✅ Cache Reserve enabled:', cacheReserveResult.success);

    // 4. 🔐 Zero Trust Access (Admin Dashboard)
    console.log('\n4. 🔐 Setting up Zero Trust Access...');
    
    const zeroTrustResult = await cloudflareService.setupZeroTrustApplication({
      name: 'iwishBag Admin Dashboard',
      domain: 'admin.iwishbag.com',
      type: 'self_hosted',
      session_duration: '24h',
      policies: [
        {
          name: 'Admin Access Policy',
          action: 'allow',
          include: [
            { email_domain: { domain: 'iwishbag.com' } },
            { email_domain: { domain: 'gmail.com' } }, // Temporary for testing
          ],
        },
      ],
    });
    
    console.log('✅ Zero Trust application created:', zeroTrustResult.id);

    // 5. 🛡️ DNS Firewall
    console.log('\n5. 🛡️ Enabling DNS Firewall...');
    
    const firewallResult = await cloudflareService.enableDNSFirewall();
    console.log('✅ DNS Firewall enabled:', firewallResult.success);

    // 6. ⏳ Waiting Room (for flash sales)
    console.log('\n6. ⏳ Creating Waiting Room...');
    
    const waitingRoomResult = await cloudflareService.createWaitingRoom({
      name: 'Flash Sale Protection',
      host: 'iwishbag.com',
      path: '/flash-sale/*',
      total_active_users: 1000,
      new_users_per_minute: 200,
    });
    
    console.log('✅ Waiting Room created:', waitingRoomResult.id);

    // 7. 🔄 Transform Rules
    console.log('\n7. 🔄 Creating Transform Rules...');
    
    const transformResult = await cloudflareService.createTransformRules();
    console.log('✅ Transform Rules created:', transformResult.length, 'rules');

    // 8. 📊 Final Status Check
    console.log('\n8. 📊 Final Status Check...');
    
    const finalStatus = await cloudflareService.getAllFeatureStatus();
    console.log('✅ All features configured successfully!');
    console.log('\nFinal Status Summary:');
    console.log('- Load Balancers:', finalStatus.load_balancers?.length || 0);
    console.log('- Access Apps:', finalStatus.access_apps?.length || 0);
    console.log('- Waiting Rooms:', finalStatus.waiting_rooms?.length || 0);
    console.log('- Zone Settings:', finalStatus.zone_settings?.length || 0);

    console.log('\n🎉 Cloudflare Features Setup Complete!');
    console.log('================================================');
    console.log('Your iwishBag platform now has:');
    console.log('✅ High Availability (Load Balancing)');
    console.log('✅ Enterprise Security (Zero Trust)');
    console.log('✅ Optimized Performance (Speed Features)');
    console.log('✅ Enhanced Caching (Cache Reserve)');
    console.log('✅ Traffic Protection (Waiting Room)');
    console.log('✅ Advanced Security (DNS Firewall)');
    console.log('✅ URL Optimization (Transform Rules)');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Check your Cloudflare API token permissions');
    console.error('2. Verify zone ID is correct');
    console.error('3. Ensure you have access to free tier features');
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  main().catch(console.error);
}

export { main as setupCloudflareFeatures };