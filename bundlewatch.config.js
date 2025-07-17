module.exports = {
  files: [
    {
      path: "dist/assets/index-*.js",
      maxSize: "400 kB",
      compression: "gzip"
    },
    {
      path: "dist/assets/*.js",
      maxSize: "100 kB",
      compression: "gzip"
    },
    {
      path: "dist/assets/*.css",
      maxSize: "50 kB",
      compression: "gzip"
    }
  ],
  ci: {
    trackBranches: ["main"],
    repoBranchBase: "main"
  }
};
