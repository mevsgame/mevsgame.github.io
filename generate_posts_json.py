import os
import json
from datetime import datetime
from bs4 import BeautifulSoup
from pathlib import Path

def scan_posts_directory(posts_dir="posts"):
    """Scan the posts directory and gather information about all posts."""
    posts = []
    
    # Walk through the posts directory
    for root, _, files in os.walk(posts_dir):
        for file in files:
            if file.endswith('.html') and file != 'template.html':
                file_path = os.path.join(root, file)
                
                try:
                    # Get file modification time as a fallback date
                    mod_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                    
                    # Parse the HTML file
                    with open(file_path, 'r', encoding='utf-8') as f:
                        soup = BeautifulSoup(f.read(), 'html.parser')
                        
                        # Get metadata from meta tags
                        meta_date = soup.find('meta', {'name': 'post:date'})
                        meta_category = soup.find('meta', {'name': 'post:category'})
                        meta_tags = soup.find('meta', {'name': 'post:tags'})
                        meta_excerpt = soup.find('meta', {'name': 'post:excerpt'})
                        
                        # Extract title from the first h1 or h2 found
                        title_tag = soup.find(['h1', 'h2'])
                        if not title_tag:
                            title_tag = soup.find('title')
                        title = title_tag.text.replace(' - My Blog', '') if title_tag else os.path.splitext(file)[0]
                        
                        # Get date from meta tag or fallback to file modification time
                        date = meta_date.get('content') if meta_date else mod_time.strftime('%Y-%m-%d')
                        
                        # Get category from meta tag or default to "Uncategorized"
                        category = meta_category.get('content') if meta_category else "Uncategorized"
                        
                        # Get tags list
                        tags = []
                        if meta_tags:
                            tags = [tag.strip() for tag in meta_tags.get('content').split(',')]
                        
                        # Get excerpt from meta tag or generate from content
                        excerpt = ''
                        if meta_excerpt:
                            excerpt = meta_excerpt.get('content')
                        else:
                            # Try to generate excerpt from first paragraph
                            first_p = soup.find('div', {'class': 'post-content'}).find('p')
                            if first_p:
                                excerpt = first_p.text[:200] + ('...' if len(first_p.text) > 200 else '')
                        
                        # Get relative URL path
                        rel_path = os.path.relpath(file_path, start='.').replace('\\', '/')
                        
                        posts.append({
                            "title": title,
                            "url": rel_path,
                            "date": date,
                            "category": category,
                            "tags": tags,
                            "excerpt": excerpt
                        })
                
                except Exception as e:
                    print(f"Error processing {file_path}: {str(e)}")
    
    return posts

def generate_posts_json():
    """Generate the posts.json file."""
    posts = scan_posts_directory()
    
    # Sort posts by date, most recent first
    posts.sort(key=lambda x: x['date'], reverse=True)
    
    # Create data directory if it doesn't exist
    data_dir = Path('data')
    data_dir.mkdir(exist_ok=True)
    
    # Write the JSON file
    output_file = data_dir / 'posts.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({"posts": posts}, f, indent=2, ensure_ascii=False)
    
    print(f"Generated posts.json with {len(posts)} posts")
    
    # Generate some statistics
    categories = {}
    tags = {}
    for post in posts:
        categories[post['category']] = categories.get(post['category'], 0) + 1
        for tag in post['tags']:
            tags[tag] = tags.get(tag, 0) + 1
    
    print("\nCategories:")
    for category, count in categories.items():
        print(f"  {category}: {count} posts")
    
    print("\nTags:")
    for tag, count in sorted(tags.items(), key=lambda x: x[1], reverse=True):
        print(f"  {tag}: {count} posts")

if __name__ == "__main__":
    generate_posts_json()