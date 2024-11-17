const SITE_CONFIG = {
    // Change this to your repository name for GitHub Pages
    // or leave empty for custom domain or local development
    basePath: '',  // e.g., '/my-blog' for GitHub Pages
    
    // Helper function to get the full path
    getPath: function(path) {
        return this.basePath + path;
    }
};