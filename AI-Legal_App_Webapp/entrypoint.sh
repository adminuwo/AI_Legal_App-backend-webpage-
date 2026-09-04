#!/bin/sh

# Default to empty object if file doesn't exist (though we create it here)
echo "window._env_ = {" > /usr/share/nginx/html/env-config.js

# Read environment variables that start with AISA_
# We use 'env' to list them, grep to filter, and assume simple key=value pairs
env | grep -E "^(AISA_|VITE_)" | while read -r line; do
  # Split into key and value
  key=$(echo "$line" | cut -d '=' -f 1)
  value=$(echo "$line" | cut -d '=' -f 2-)
  
  # Append to the config file
  echo "  \"$key\": \"$value\"," >> /usr/share/nginx/html/env-config.js
done

echo "};" >> /usr/share/nginx/html/env-config.js

# Execute the passed command (CMD)
exec "$@"
