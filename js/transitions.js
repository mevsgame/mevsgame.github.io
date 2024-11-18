class PageTransitions {
    constructor() {
        this.isNavigating = false;
        this.init();
    }

    init() {
        // Add loading overlay to the body if it doesn't exist
        if (!document.querySelector('.loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="loading-spinner"></div>';
            document.body.appendChild(overlay);
        }

        // Intercept all internal navigation clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && this.isInternalLink(link)) {
                e.preventDefault();
                this.navigateTo(link.href);
            }
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state) {
                this.navigateTo(window.location.href, false);
            }
        });
    }

    isInternalLink(link) {
        return link.href.startsWith(window.location.origin) && !link.hasAttribute('download') && link.target !== '_blank';
    }

    async navigateTo(url, addToHistory = true) {
        if (this.isNavigating) return;
        this.isNavigating = true;

        try { 
            await new Promise(resolve => setTimeout(resolve, 100));

            // Fetch the new page
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const html = await response.text();

            // Parse the new page
            const parser = new DOMParser();
            const newDoc = parser.parseFromString(html, 'text/html');

            // Update the page title
            document.title = newDoc.title;

            // Update the main content
            const currentMain = document.querySelector('main');
            const newMain = newDoc.querySelector('main');
            if (currentMain && newMain) {
                currentMain.innerHTML = newMain.innerHTML;
                currentMain.className = newMain.className;
            }

            // Update meta tags
            this.updateMetaTags(newDoc);

            // Add to browser history
            if (addToHistory) {
                window.history.pushState({}, '', url);
            }

            // Reinitialize any necessary scripts
            await this.reinitializeScripts();

        } catch (error) {
            console.error('Navigation error:', error);
        } finally { 
            this.isNavigating = false;
        }
    }

    updateMetaTags(newDoc) {
        // Update meta tags in head
        const metaTags = document.querySelectorAll('meta[name^="post:"]');
        metaTags.forEach(tag => tag.remove());

        const newMetaTags = newDoc.querySelectorAll('meta[name^="post:"]');
        newMetaTags.forEach(tag => {
            document.head.appendChild(tag.cloneNode(true));
        });
    }

    async reinitializeScripts() {
        // Update recent posts and categories
        if (typeof loadPosts === 'function') {
            await loadPosts();
        }

        // Update post metadata if on a post page
        if (document.querySelector('.post-meta')) {
            const date = document.querySelector('meta[name="post:date"]')?.content;
            const category = document.querySelector('meta[name="post:category"]')?.content;
            const tags = document.querySelector('meta[name="post:tags"]')?.content;

            if (date) {
                const formattedDate = new Date(date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                document.querySelector('.post-meta .date').textContent = `Posted on ${formattedDate}`;
            }

            if (category) {
                document.querySelector('.post-meta .category').textContent = ` in ${category}`;
            }

            if (tags) {
                const tagsList = tags.split(',').map(tag => tag.trim());
                const tagsHtml = tagsList.map(tag => 
                    `<a href="/tags/${tag.toLowerCase()}.html" class="tag">${tag}</a>`
                ).join(' ');
                document.querySelector('.post-meta .tags').innerHTML = tagsHtml;
            }
        }
    }
}

// Initialize page transitions when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.pageTransitions = new PageTransitions();
});