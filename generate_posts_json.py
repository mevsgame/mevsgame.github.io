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
                        
                        # Extract title from the first h1 or h2 found
                        title_tag = soup.find(['h1', 'h2', 'title'])
                        title = title_tag.text if title_tag else os.path.splitext(file)[0]
                        
                        # Try to find a date in the meta tags or post-meta div
                        date = None
                        meta_date = soup.find('meta', {'name': 'date'})
                        if meta_date:
                            date = meta_date.get('content')
                        else:
                            date_div = soup.find('div', {'class': 'post-meta'})
                            if date_div and 'Posted on' in date_div.text:
                                date_text = date_div.text.replace('Posted on', '').strip()
                                try:
                                    parsed_date = datetime.strptime(date_text, '%B %d, %Y')
                                    date = parsed_date.strftime('%Y-%m-%d')
                                except ValueError:
                                    date = mod_time.strftime('%Y-%m-%d')
                        
                        if not date:
                            date = mod_time.strftime('%Y-%m-%d')
                        
                        # Try to find category
                        category = "Uncategorized"
                        category_meta = soup.find('meta', {'name': 'category'})
                        if category_meta:
                            category = category_meta.get('content')
                        
                        # Get relative URL path
                        rel_path = os.path.relpath(file_path).replace('\\', '/')
                        
                        posts.append({
                            "title": title,
                            "url": rel_path,
                            "date": date,
                            "category": category
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
    return posts

if __name__ == "__main__":
    generate_posts_json()