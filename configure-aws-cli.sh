#!/bin/bash

# Configure AWS CLI with your credentials
echo "Configuring AWS CLI..."

# Create AWS credentials directory
mkdir -p ~/.aws

# Create credentials file
cat > ~/.aws/credentials << EOF
[default]
aws_access_key_id = AKIAYWBJYE26OFEJGTHW
aws_secret_access_key = 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
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