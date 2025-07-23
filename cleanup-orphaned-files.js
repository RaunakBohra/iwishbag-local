// Cleanup script for orphaned files
// Run this script periodically (e.g., daily via cron job)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key needed for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupOrphanedFiles() {
  console.log('🧹 Starting orphaned file cleanup...');
  
  try {
    // Step 1: Mark files as orphaned (files older than 48 hours without quotes)
    console.log('📋 Marking orphaned files...');
    const { data: markedCount, error: markError } = await supabase.rpc('mark_orphaned_files_for_cleanup');
    
    if (markError) {
      console.error('❌ Error marking orphaned files:', markError);
      return;
    }
    
    console.log(`✅ Marked ${markedCount} files as orphaned`);
    
    // Step 2: Get files to delete from storage (orphaned for 24+ hours)
    console.log('🗑️  Getting files to delete...');
    const { data: filesToDelete, error: filesError } = await supabase.rpc('cleanup_orphaned_files');
    
    if (filesError) {
      console.error('❌ Error getting files to delete:', filesError);
      return;
    }
    
    if (!filesToDelete || filesToDelete.length === 0) {
      console.log('✅ No files to delete');
      return;
    }
    
    console.log(`🗂️  Found ${filesToDelete.length} files to delete`);
    
    // Step 3: Delete files from Supabase storage
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const file of filesToDelete) {
      try {
        const { error: deleteError } = await supabase.storage
          .from('quote-requests')
          .remove([file.file_path]);
        
        if (deleteError) {
          console.error(`❌ Failed to delete ${file.file_name}:`, deleteError);
          errorCount++;
        } else {
          console.log(`✅ Deleted ${file.file_name}`);
          deletedCount++;
        }
      } catch (error) {
        console.error(`❌ Error deleting ${file.file_name}:`, error);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   • Files marked as orphaned: ${markedCount}`);
    console.log(`   • Files deleted from storage: ${deletedCount}`);
    console.log(`   • Files with errors: ${errorCount}`);
    console.log('✅ Cleanup completed\n');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run cleanup
cleanupOrphanedFiles();