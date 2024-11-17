// Function to load HTML content
async function loadHTML(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.text();
    } catch (error) {
        console.error('Error loading HTML:', error);
        return '';
    }
}

// Function to load and inject includes
async function loadIncludes() {
    try {
        // Load header
        const headerContent = await loadHTML('/includes/header.html');
        document.querySelector('#header-include').innerHTML = headerContent;

        // Load footer
        const footerContent = await loadHTML('/includes/footer.html');
        document.querySelector('#footer-include').innerHTML = footerContent;
    } catch (error) {
        console.error('Error loading includes:', error);
    }
}

// Load includes when the DOM is ready
document.addEventListener('DOMContentLoaded', loadIncludes);