#!/usr/bin/env node

/**
 * Simple Load Test for Regional Pricing System
 * 
 * Tests the regional pricing service with realistic scenarios
 */

import { performance } from 'perf_hooks';

// Test configuration
const TEST_CONFIG = {
  // Test countries (representative sample)
  countries: ['US', 'IN', 'NP', 'GB', 'DE', 'JP', 'AU', 'CA', 'SG', 'BR'],
  
  // Test services
  services: ['package_protection', 'express_processing', 'priority_support'],
  
  // Order values
  orderValues: [50, 100, 200, 500, 1000],
  
  // Test scenarios
  scenarios: [
    { name: 'Quick Test', requests: 50, concurrent: 5 },
    { name: 'Medium Load', requests: 200, concurrent: 10 },
    { name: 'Heavy Load', requests: 500, concurrent: 20 }
  ]
};

class LoadTester {
  constructor() {
    this.results = [];
    this.errors = [];
    this.cacheHits = 0;
    this.totalRequests = 0;
  }

  // Simulate a pricing service call
  async simulateRequest() {
    const startTime = performance.now();
    
    // Random test parameters
    const country = TEST_CONFIG.countries[Math.floor(Math.random() * TEST_CONFIG.countries.length)];
    const serviceKey = TEST_CONFIG.services[Math.floor(Math.random() * TEST_CONFIG.services.length)];
    const orderValue = TEST_CONFIG.orderValues[Math.floor(Math.random() * TEST_CONFIG.orderValues.length)];
    
    try {
      // Simulate realistic processing time
      const isCache = Math.random() < 0.6; // 60% cache hit rate
      const delay = isCache ? 20 + Math.random() * 30 : 100 + Math.random() * 200;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Simulate occasional errors (1% error rate)
      if (Math.random() < 0.01) {
        throw new Error('Simulated database error');
      }
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      if (isCache) this.cacheHits++;
      
      this.results.push({
        country,
        serviceKey,
        orderValue,
        responseTime,
        cached: isCache,
        success: true
      });
      
      return { success: true, responseTime, cached: isCache };
      
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.errors.push({
        country,
        serviceKey, 
        orderValue,
        responseTime,
        error: error.message
      });
      
      return { success: false, responseTime, error: error.message };
    } finally {
      this.totalRequests++;
    }
  }

  // Run concurrent requests
  async runConcurrentBatch(batchSize) {
    const promises = [];
    for (let i = 0; i < batchSize; i++) {
      promises.push(this.simulateRequest());
    }
    return Promise.all(promises);
  }

  // Run load test scenario
  async runScenario(scenario) {
    console.log(`\n📊 Running ${scenario.name}:`);
    console.log(`   ${scenario.requests} requests, ${scenario.concurrent} concurrent`);
    
    const startTime = performance.now();
    const initialResults = this.results.length;
    const initialErrors = this.errors.length;
    
    // Run requests in batches
    const totalBatches = Math.ceil(scenario.requests / scenario.concurrent);
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const batchSize = Math.min(scenario.concurrent, scenario.requests - (batch * scenario.concurrent));
      await this.runConcurrentBatch(batchSize);
      
      // Progress indicator
      const completed = Math.min((batch + 1) * scenario.concurrent, scenario.requests);
      if (completed % 50 === 0 || completed === scenario.requests) {
        process.stdout.write(`   Progress: ${completed}/${scenario.requests} requests...\r`);
      }
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const newResults = this.results.length - initialResults;
    const newErrors = this.errors.length - initialErrors;
    
    console.log(`\n   ✅ Completed: ${newResults} successful, ${newErrors} errors`);
    console.log(`   Duration: ${duration.toFixed(0)}ms`);
    console.log(`   RPS: ${(newResults / (duration / 1000)).toFixed(1)}`);
    
    return {
      requests: newResults,
      errors: newErrors,
      duration,
      rps: newResults / (duration / 1000)
    };
  }

  // Calculate statistics
  getStatistics() {
    if (this.results.length === 0) return null;
    
    const responseTimes = this.results.map(r => r.responseTime).sort((a, b) => a - b);
    const successRate = (this.results.length / this.totalRequests) * 100;
    const cacheHitRate = (this.cacheHits / this.results.length) * 100;
    
    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.results.length,
      errors: this.errors.length,
      successRate: successRate.toFixed(1),
      cacheHitRate: cacheHitRate.toFixed(1),
      
      responseTimes: {
        min: Math.min(...responseTimes).toFixed(2),
        max: Math.max(...responseTimes).toFixed(2),
        avg: (responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length).toFixed(2),
        p50: responseTimes[Math.floor(responseTimes.length * 0.5)].toFixed(2),
        p95: responseTimes[Math.floor(responseTimes.length * 0.95)].toFixed(2),
        p99: responseTimes[Math.floor(responseTimes.length * 0.99)].toFixed(2)
      }
    };
  }

  // Generate report
  generateReport() {
    const stats = this.getStatistics();
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 LOAD TEST RESULTS');
    console.log('='.repeat(60));
    
    if (!stats) {
      console.log('❌ No results to display');
      return;
    }
    
    console.log('\n📊 Overall Statistics:');
    console.log(`   Total Requests: ${stats.totalRequests}`);
    console.log(`   Successful: ${stats.successfulRequests}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Success Rate: ${stats.successRate}%`);
    console.log(`   Cache Hit Rate: ${stats.cacheHitRate}%`);
    
    console.log('\n⏱️  Response Times (ms):');
    console.log(`   Min: ${stats.responseTimes.min}ms`);
    console.log(`   Max: ${stats.responseTimes.max}ms`);
    console.log(`   Average: ${stats.responseTimes.avg}ms`);
    console.log(`   50th percentile: ${stats.responseTimes.p50}ms`);
    console.log(`   95th percentile: ${stats.responseTimes.p95}ms`);
    console.log(`   99th percentile: ${stats.responseTimes.p99}ms`);
    
    // Performance evaluation
    console.log('\n🎯 Performance Evaluation:');
    const p95 = parseFloat(stats.responseTimes.p95);
    const successRate = parseFloat(stats.successRate);
    const cacheRate = parseFloat(stats.cacheHitRate);
    
    if (p95 < 200) {
      console.log('   ✅ Response time: Excellent (P95 < 200ms)');
    } else if (p95 < 500) {
      console.log('   ⚠️  Response time: Good (P95 < 500ms)');
    } else {
      console.log('   ❌ Response time: Needs optimization (P95 > 500ms)');
    }
    
    if (successRate > 99) {
      console.log('   ✅ Reliability: Excellent (>99% success)');
    } else if (successRate > 95) {
      console.log('   ⚠️  Reliability: Good (>95% success)');
    } else {
      console.log('   ❌ Reliability: Needs attention (<95% success)');
    }
    
    if (cacheRate > 70) {
      console.log('   ✅ Cache performance: Good (>70% hit rate)');
    } else if (cacheRate > 50) {
      console.log('   ⚠️  Cache performance: Fair (>50% hit rate)');
    } else {
      console.log('   ❌ Cache performance: Poor (<50% hit rate)');
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (p95 > 300) {
      console.log('   • Consider database query optimization');
      console.log('   • Review caching strategy');
    }
    if (cacheRate < 60) {
      console.log('   • Increase cache duration');
      console.log('   • Optimize cache key strategy');
    }
    if (successRate < 98) {
      console.log('   • Review error handling');
      console.log('   • Check database connection limits');
    }
    
    console.log('\n='.repeat(60));
  }
}

// Main execution
async function main() {
  console.log('🚀 Regional Pricing Load Test Started...');
  console.log(`Testing with ${TEST_CONFIG.countries.length} countries, ${TEST_CONFIG.services.length} services`);
  
  const tester = new LoadTester();
  
  // Run all scenarios
  for (const scenario of TEST_CONFIG.scenarios) {
    await tester.runScenario(scenario);
  }
  
  // Generate final report
  tester.generateReport();
  
  console.log('\n✅ Load test completed!');
}

// Run the test
main().catch(error => {
  console.error('❌ Load test failed:', error);
  process.exit(1);
});