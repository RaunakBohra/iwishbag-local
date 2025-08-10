#!/bin/bash

# Configure AWS CLI with your credentials
if [ -z "\$AWS_ACCESS_KEY_ID" ] || [ -z "\$AWS_SECRET_ACCESS_KEY" ]; then
    echo "❌ Error: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables must be set"
    exit 1
fi

echo "Configuring AWS CLI..."

# Create AWS credentials directory
mkdir -p ~/.aws

# Create credentials file
cat > ~/.aws/credentials << EOF
[default]
aws_access_key_id = \${AWS_ACCESS_KEY_ID}
aws_secret_access_key = \${AWS_SECRET_ACCESS_KEY}
EOF

# Create config file
cat > ~/.aws/config << EOF
[default]
region = us-east-1
output = json
EOF

echo "✅ AWS CLI configured successfully!"
echo ""
echo "Testing AWS CLI..."
aws sts get-caller-identity