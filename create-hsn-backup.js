#!/usr/bin/env node
/**
 * Database Backup Script for HSN Implementation
 * Creates complete backup of critical tables before HSN tax system implementation
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const BACKUP_TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const BACKUP_DIR = `backups/pre-hsn-implementation-${BACKUP_TIMESTAMP}`;

async function createBackup() {
  console.log('🔄 Starting database backup before HSN implementation...');
  
  // Create backup directory
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const tables = [
    'shipping_routes',
    'country_settings', 
    'quotes',
    'profiles',
    'user_addresses'
  ];

  const backupSummary = {
    timestamp: new Date().toISOString(),
    tables: {},
    totalRecords: 0
  };

  try {
    for (const table of tables) {
      console.log(`📊 Backing up ${table}...`);
      
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' });

      if (error) {
        console.error(`❌ Error backing up ${table}:`, error);
        continue;
      }

      // Save data to JSON file
      const fileName = `${table}_backup.json`;
      const filePath = path.join(BACKUP_DIR, fileName);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

      backupSummary.tables[table] = {
        records: count || data?.length || 0,
        file: fileName,
        size: fs.statSync(filePath).size
      };

      backupSummary.totalRecords += (count || data?.length || 0);
      console.log(`✅ ${table}: ${count || data?.length || 0} records backed up`);
    }

    // Save backup summary
    fs.writeFileSync(
      path.join(BACKUP_DIR, 'backup_summary.json'),
      JSON.stringify(backupSummary, null, 2)
    );

    console.log('\n🎉 Database backup completed successfully!');
    console.log(`📁 Backup location: ${BACKUP_DIR}`);
    console.log(`📊 Total records backed up: ${backupSummary.totalRecords}`);
    console.log('\nBackup includes:');
    Object.entries(backupSummary.tables).forEach(([table, info]) => {
      console.log(`  - ${table}: ${info.records} records (${(info.size / 1024).toFixed(1)} KB)`);
    });

    return true;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    return false;
  }
}

// Run backup
createBackup().then(success => {
  if (success) {
    console.log('\n✅ Ready to proceed with HSN implementation!');
    process.exit(0);
  } else {
    console.log('\n❌ Backup failed - DO NOT PROCEED with implementation!');
    process.exit(1);
  }
});