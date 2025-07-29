// Run this in the browser console to clear all auth-related data
console.log('Clearing auth cache...');

// Clear local storage
localStorage.clear();

// Clear session storage
sessionStorage.clear();

// Clear cookies for localhost
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

// Clear IndexedDB
if (window.indexedDB) {
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      indexedDB.deleteDatabase(db.name);
    });
  });
}

console.log('✅ Auth cache cleared\! Please refresh the page.');
