// Function to load and display posts
async function loadPosts() {
    try {
        const response = await fetch('/data/posts.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        // Sort posts by date (most recent first)
        const sortedPosts = data.posts.sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );

        // Handle main content area if it exists
        const mainContent = document.querySelector('.posts');
        if (mainContent) {
            // Take the 5 most recent posts for the main page
            const recentPosts = sortedPosts.slice(0, 5);
            const postsHTML = recentPosts.map(post => `
                <article class="post-card">
                    <h2 class="post-title">
                        <a href="/${post.url}">${post.title}</a>
                    </h2>
                    <div class="post-meta">
                        Posted on ${formatDate(post.date)}
                        ${post.category ? `<span class="category">in ${post.category}</span>` : ''}
                    </div>
                    <div class="post-excerpt">
                        <p>${post.excerpt || 'Click to read more...'}</p>
                    </div>
                    <a href="/${post.url}" class="read-more">Read More →</a>
                </article>
            `).join('');

            mainContent.innerHTML = postsHTML;
        }

        // Handle sidebar recent posts
        const recentPostsList = document.querySelector('#recent-posts-list');
        if (recentPostsList) {
            const sidebarPosts = sortedPosts.slice(0, 5);
            const recentPostsHTML = sidebarPosts.map(post => `
                <li>
                    <a href="/${post.url}">${post.title}</a>
                    <span class="post-date">${formatDate(post.date)}</span>
                </li>
            `).join('');
            recentPostsList.innerHTML = recentPostsHTML;
        }

        // Handle categories
        const categoriesList = document.querySelector('#categories-list');
        if (categoriesList) {
            const categories = [...new Set(data.posts.map(post => post.category))];
            const categoriesHTML = categories.map(category => `
                <li>
                    <a href="/categories/${category.toLowerCase()}.html">${category}</a>
                </li>
            `).join('');
            categoriesList.innerHTML = categoriesHTML;
        }

    } catch (error) {
        console.error('Error loading posts:', error);
        document.querySelector('.posts').innerHTML = '<p>Error loading posts</p>';
    }
}

// Helper function to format dates
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Load posts when the DOM is ready
document.addEventListener('DOMContentLoaded', loadPosts);