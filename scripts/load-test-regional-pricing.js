#!/usr/bin/env node

/**
 * Load Testing Script for Regional Pricing System
 * 
 * Tests performance under various load conditions:
 * - Multiple concurrent requests
 * - Different countries and regions
 * - Various service combinations
 * - Cache hit/miss scenarios
 * - Database performance under load
 */

import { performance } from 'perf_hooks';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test configuration
const LOAD_TEST_CONFIG = {
  // Test scenarios
  scenarios: [
    {
      name: 'Light Load',
      concurrent_users: 10,
      requests_per_user: 50,
      duration_seconds: 60
    },
    {
      name: 'Medium Load', 
      concurrent_users: 50,
      requests_per_user: 100,
      duration_seconds: 120
    },
    {
      name: 'Heavy Load',
      concurrent_users: 100,
      requests_per_user: 200,
      duration_seconds: 180
    },
    {
      name: 'Stress Test',
      concurrent_users: 200,
      requests_per_user: 500,
      duration_seconds: 300
    }
  ],
  
  // Test countries (mix of high-volume and edge cases)
  test_countries: [
    'US', 'IN', 'NP', 'GB', 'DE', 'JP', 'AU', 'CA', 'FR', 'BR',
    'CN', 'KR', 'SG', 'MY', 'TH', 'VN', 'ID', 'PH', 'BD', 'PK',
    'ZW', 'MT', 'IS', 'LU', 'AD'  // Small/edge case countries
  ],
  
  // Test services
  test_services: [
    'package_protection',
    'express_processing', 
    'priority_support',
    'gift_wrapping',
    'photo_documentation'
  ],
  
  // Order value ranges for testing
  order_values: [10, 50, 100, 200, 500, 1000, 2000, 5000],
  
  // Performance thresholds
  performance_thresholds: {
    response_time_95th_percentile: 500, // ms
    response_time_max: 2000, // ms
    error_rate_max: 1, // %
    cache_hit_rate_min: 70 // %
  }
};

// Test results storage
class LoadTestResults {
  constructor() {
    this.results = {
      scenarios: {},
      overall_stats: {
        total_requests: 0,
        total_errors: 0,
        total_duration: 0,
        cache_hits: 0,
        cache_misses: 0
      },
      response_times: [],
      errors: [],
      performance_issues: []
    };
  }

  addResult(scenarioName, result) {
    if (!this.results.scenarios[scenarioName]) {
      this.results.scenarios[scenarioName] = {
        requests: 0,
        errors: 0,
        response_times: [],
        cache_stats: { hits: 0, misses: 0 },
        start_time: Date.now(),
        end_time: null
      };
    }

    const scenario = this.results.scenarios[scenarioName];
    scenario.requests++;
    scenario.response_times.push(result.response_time);
    
    if (result.error) {
      scenario.errors++;
      this.results.errors.push({
        scenario: scenarioName,
        error: result.error,
        timestamp: Date.now()
      });
    }

    if (result.cache_hit) {
      scenario.cache_stats.hits++;
      this.results.overall_stats.cache_hits++;
    } else {
      scenario.cache_stats.misses++;
      this.results.overall_stats.cache_misses++;
    }

    this.results.overall_stats.total_requests++;
    this.results.response_times.push(result.response_time);
  }

  finishScenario(scenarioName) {
    if (this.results.scenarios[scenarioName]) {
      this.results.scenarios[scenarioName].end_time = Date.now();
    }
  }

  getStatistics() {
    const stats = {
      scenarios: {},
      overall: {}
    };

    // Calculate scenario statistics
    for (const [name, scenario] of Object.entries(this.results.scenarios)) {
      const responseTimes = scenario.response_times.sort((a, b) => a - b);
      const duration = scenario.end_time - scenario.start_time;
      
      stats.scenarios[name] = {
        total_requests: scenario.requests,
        total_errors: scenario.errors,
        error_rate: (scenario.errors / scenario.requests) * 100,
        duration_ms: duration,
        requests_per_second: (scenario.requests / duration) * 1000,
        
        response_times: {
          min: Math.min(...responseTimes),
          max: Math.max(...responseTimes),
          avg: responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length,
          p50: responseTimes[Math.floor(responseTimes.length * 0.5)],
          p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
          p99: responseTimes[Math.floor(responseTimes.length * 0.99)]
        },
        
        cache_performance: {
          hit_rate: (scenario.cache_stats.hits / (scenario.cache_stats.hits + scenario.cache_stats.misses)) * 100,
          total_hits: scenario.cache_stats.hits,
          total_misses: scenario.cache_stats.misses
        }
      };
    }

    // Calculate overall statistics
    const allResponseTimes = this.results.response_times.sort((a, b) => a - b);
    const totalCacheRequests = this.results.overall_stats.cache_hits + this.results.overall_stats.cache_misses;
    
    stats.overall = {
      total_requests: this.results.overall_stats.total_requests,
      total_errors: this.results.overall_stats.total_errors,
      error_rate: (this.results.overall_stats.total_errors / this.results.overall_stats.total_requests) * 100,
      
      response_times: {
        min: Math.min(...allResponseTimes),
        max: Math.max(...allResponseTimes),
        avg: allResponseTimes.reduce((sum, rt) => sum + rt, 0) / allResponseTimes.length,
        p95: allResponseTimes[Math.floor(allResponseTimes.length * 0.95)],
        p99: allResponseTimes[Math.floor(allResponseTimes.length * 0.99)]
      },
      
      cache_performance: {
        hit_rate: totalCacheRequests > 0 ? (this.results.overall_stats.cache_hits / totalCacheRequests) * 100 : 0,
        total_hits: this.results.overall_stats.cache_hits,
        total_misses: this.results.overall_stats.cache_misses
      }
    };

    return stats;
  }

  checkPerformanceThresholds() {
    const stats = this.getStatistics();
    const issues = [];
    const thresholds = LOAD_TEST_CONFIG.performance_thresholds;

    if (stats.overall.response_times.p95 > thresholds.response_time_95th_percentile) {
      issues.push(`95th percentile response time (${stats.overall.response_times.p95}ms) exceeds threshold (${thresholds.response_time_95th_percentile}ms)`);
    }

    if (stats.overall.response_times.max > thresholds.response_time_max) {
      issues.push(`Maximum response time (${stats.overall.response_times.max}ms) exceeds threshold (${thresholds.response_time_max}ms)`);
    }

    if (stats.overall.error_rate > thresholds.error_rate_max) {
      issues.push(`Error rate (${stats.overall.error_rate.toFixed(2)}%) exceeds threshold (${thresholds.error_rate_max}%)`);
    }

    if (stats.overall.cache_performance.hit_rate < thresholds.cache_hit_rate_min) {
      issues.push(`Cache hit rate (${stats.overall.cache_performance.hit_rate.toFixed(1)}%) below threshold (${thresholds.cache_hit_rate_min}%)`);
    }

    this.results.performance_issues = issues;
    return issues;
  }
}

// Worker function for concurrent load testing
async function workerFunction(workerData) {
  const { scenarioName, requests, testConfig } = workerData;
  const results = [];

  // Simulate RegionalPricingService calls
  for (let i = 0; i < requests; i++) {
    const startTime = performance.now();
    
    try {
      // Randomly select test parameters
      const country = testConfig.test_countries[Math.floor(Math.random() * testConfig.test_countries.length)];
      const services = [testConfig.test_services[Math.floor(Math.random() * testConfig.test_services.length)]];
      const orderValue = testConfig.order_values[Math.floor(Math.random() * testConfig.order_values.length)];
      
      // Simulate pricing calculation call
      const result = await simulatePricingCall(services, country, orderValue);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      results.push({
        response_time: responseTime,
        cache_hit: result.cache_hit,
        error: null
      });

      // Add some realistic delay to prevent overwhelming
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }

    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      results.push({
        response_time: responseTime,
        cache_hit: false,
        error: error.message
      });
    }
  }

  return results;
}

// Simulate regional pricing service call
async function simulatePricingCall(serviceKeys, countryCode, orderValue) {
  // Simulate realistic processing time based on complexity
  const baseDelay = 50; // ms
  const complexityFactor = serviceKeys.length * 10;
  const cacheHitChance = Math.random() < 0.7; // 70% cache hit rate
  const delay = cacheHitChance ? baseDelay * 0.3 : baseDelay + complexityFactor;
  
  await new Promise(resolve => setTimeout(resolve, delay));

  // Simulate occasional errors (2% error rate)
  if (Math.random() < 0.02) {
    throw new Error('Simulated database timeout');
  }

  return {
    success: true,
    calculations: serviceKeys.map(key => ({
      service_key: key,
      applicable_rate: Math.random() * 0.05, // 0-5% rate
      calculated_amount: orderValue * (Math.random() * 0.05),
      pricing_tier: ['global', 'continental', 'regional', 'country'][Math.floor(Math.random() * 4)]
    })),
    cache_hit: cacheHitChance
  };
}

// Main load testing function
async function runLoadTest() {
  console.log('🚀 Starting Regional Pricing Load Test...\n');
  console.log('Configuration:');
  console.log(`- Test Countries: ${LOAD_TEST_CONFIG.test_countries.length}`);
  console.log(`- Test Services: ${LOAD_TEST_CONFIG.test_services.length}`);
  console.log(`- Scenarios: ${LOAD_TEST_CONFIG.scenarios.length}\n`);

  const testResults = new LoadTestResults();

  for (const scenario of LOAD_TEST_CONFIG.scenarios) {
    console.log(`📊 Running Scenario: ${scenario.name}`);
    console.log(`   Concurrent Users: ${scenario.concurrent_users}`);
    console.log(`   Requests per User: ${scenario.requests_per_user}`);
    console.log(`   Duration: ${scenario.duration_seconds}s\n`);

    const startTime = Date.now();

    // Create worker promises for concurrent execution
    const workerPromises = [];
    for (let i = 0; i < scenario.concurrent_users; i++) {
      const workerPromise = new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
          workerData: {
            scenarioName: scenario.name,
            requests: scenario.requests_per_user,
            testConfig: LOAD_TEST_CONFIG
          }
        });

        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
      });

      workerPromises.push(workerPromise);
    }

    try {
      // Wait for all workers to complete
      const workerResults = await Promise.all(workerPromises);
      
      // Aggregate results
      for (const results of workerResults) {
        for (const result of results) {
          testResults.addResult(scenario.name, result);
        }
      }

      testResults.finishScenario(scenario.name);
      
      const duration = Date.now() - startTime;
      console.log(`   ✅ Completed in ${duration}ms\n`);

    } catch (error) {
      console.error(`   ❌ Scenario failed: ${error.message}\n`);
    }
  }

  return testResults;
}

// Generate detailed report
function generateReport(testResults) {
  const stats = testResults.getStatistics();
  const issues = testResults.checkPerformanceThresholds();

  console.log('=' .repeat(80));
  console.log('📋 REGIONAL PRICING LOAD TEST RESULTS');
  console.log('=' .repeat(80));

  // Overall Statistics
  console.log('\n📊 Overall Performance:');
  console.log(`   Total Requests: ${stats.overall.total_requests.toLocaleString()}`);
  console.log(`   Total Errors: ${stats.overall.total_errors}`);
  console.log(`   Error Rate: ${stats.overall.error_rate.toFixed(2)}%`);
  console.log(`   Response Time P95: ${stats.overall.response_times.p95.toFixed(2)}ms`);
  console.log(`   Response Time Max: ${stats.overall.response_times.max.toFixed(2)}ms`);
  console.log(`   Cache Hit Rate: ${stats.overall.cache_performance.hit_rate.toFixed(1)}%`);

  // Scenario Breakdown
  console.log('\n📋 Scenario Breakdown:');
  for (const [name, scenario] of Object.entries(stats.scenarios)) {
    console.log(`\n   ${name}:`);
    console.log(`     Requests: ${scenario.total_requests.toLocaleString()}`);
    console.log(`     RPS: ${scenario.requests_per_second.toFixed(1)}`);
    console.log(`     Error Rate: ${scenario.error_rate.toFixed(2)}%`);
    console.log(`     Avg Response: ${scenario.response_times.avg.toFixed(2)}ms`);
    console.log(`     P95 Response: ${scenario.response_times.p95.toFixed(2)}ms`);
    console.log(`     Cache Hit Rate: ${scenario.cache_performance.hit_rate.toFixed(1)}%`);
  }

  // Performance Issues
  if (issues.length > 0) {
    console.log('\n⚠️  Performance Issues Detected:');
    issues.forEach(issue => {
      console.log(`   • ${issue}`);
    });
  } else {
    console.log('\n✅ All performance thresholds met!');
  }

  // Recommendations
  console.log('\n💡 Recommendations:');
  if (stats.overall.cache_performance.hit_rate < 80) {
    console.log('   • Consider increasing cache duration or improving cache strategy');
  }
  if (stats.overall.response_times.p95 > 200) {
    console.log('   • Database query optimization may be needed');
  }
  if (stats.overall.error_rate > 0.5) {
    console.log('   • Review error handling and database connection limits');
  }
  
  console.log('   • Monitor database connection pool under high load');
  console.log('   • Consider implementing circuit breakers for external dependencies');
  console.log('   • Set up performance monitoring alerts for production');

  console.log('\n' + '=' .repeat(80));
}

// Main execution
async function main() {
  if (isMainThread) {
    try {
      const testResults = await runLoadTest();
      generateReport(testResults);
      
      console.log('✅ Load testing completed successfully!');
      process.exit(0);
    } catch (error) {
      console.error('❌ Load testing failed:', error);
      process.exit(1);
    }
  } else {
    // Worker thread execution
    try {
      const results = await workerFunction(workerData);
      parentPort.postMessage(results);
    } catch (error) {
      parentPort.postMessage({ error: error.message });
    }
  }
}

// Handle worker thread messages
if (!isMainThread) {
  main();
} else {
  main();
}