#!/bin/bash
# setup-hooks.sh

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Create symbolic links for all hooks
for hook in .github/hooks/*; do
    if [ -f "$hook" ]; then
        hook_name=$(basename "$hook")
        ln -sf "../../.github/hooks/$hook_name" ".git/hooks/$hook_name"
        chmod +x ".github/hooks/$hook_name"
    fi
done