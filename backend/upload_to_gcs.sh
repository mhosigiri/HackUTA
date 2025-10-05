#!/bin/bash
# Upload training data to Google Cloud Storage for Document AI training

set -e

# Configuration
PROJECT_ID="652485593933"
BUCKET_NAME="invoice-training-${PROJECT_ID}"
TRAINING_DIR="training_dataset"

echo "=================================================="
echo "📤 Uploading Training Data to Google Cloud Storage"
echo "=================================================="

# Check if gcloud is installed
if ! command -v gsutil &> /dev/null; then
    echo "❌ Error: gsutil not found. Please install Google Cloud SDK:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if credentials are set
if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    echo "⚠️  GOOGLE_APPLICATION_CREDENTIALS not set in environment"
    echo "   Using credentials from .env file..."
    export GOOGLE_APPLICATION_CREDENTIALS="/Users/arniskc/Documents/HackUTA/docuextractmhosigiri-4cc95bebf955.json"
fi

echo ""
echo "📋 Configuration:"
echo "   Project ID: $PROJECT_ID"
echo "   Bucket: gs://$BUCKET_NAME"
echo "   Training Data: $TRAINING_DIR"
echo "   Images: $(ls $TRAINING_DIR/*.jpg 2>/dev/null | wc -l | tr -d ' ')"
echo ""

# Authenticate with service account
echo "🔐 Authenticating with service account..."
gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS" --project="$PROJECT_ID"

# Create bucket if it doesn't exist
echo ""
echo "📦 Creating GCS bucket (if not exists)..."
if gsutil ls -p "$PROJECT_ID" "gs://$BUCKET_NAME" 2>/dev/null; then
    echo "✅ Bucket already exists: gs://$BUCKET_NAME"
else
    gsutil mb -p "$PROJECT_ID" -l us "gs://$BUCKET_NAME"
    echo "✅ Created bucket: gs://$BUCKET_NAME"
fi

# Upload training images
echo ""
echo "📤 Uploading training images..."
gsutil -m cp "$TRAINING_DIR"/*.jpg "gs://$BUCKET_NAME/training-images/" 2>&1 | grep -v "^Copying"

echo ""
echo "✅ Upload complete!"
echo ""
echo "📊 Uploaded files:"
gsutil ls "gs://$BUCKET_NAME/training-images/" | wc -l | xargs echo "   Total images:"

echo ""
echo "=================================================="
echo "✅ Training Data Ready in GCS"
echo "=================================================="
echo ""
echo "📍 GCS Path: gs://$BUCKET_NAME/training-images/"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Go to Document AI Console:"
echo "   https://console.cloud.google.com/ai/document-ai?project=$PROJECT_ID"
echo ""
echo "2. Create Custom Processor:"
echo "   - Click 'Create Processor'"
echo "   - Select 'Custom Document Extractor'"
echo "   - Name: 'Custom Invoice Processor'"
echo ""
echo "3. Import Training Data:"
echo "   - Go to 'Train' tab"
echo "   - Click 'Import Data'"
echo "   - Select: gs://$BUCKET_NAME/training-images/"
echo ""
echo "4. Label & Train:"
echo "   - Review auto-labeled fields"
echo "   - Correct any errors"
echo "   - Click 'Train New Version'"
echo ""
echo "5. Deploy:"
echo "   - Wait 2-4 hours for training"
echo "   - Deploy trained version"
echo "   - Copy new Processor ID"
echo ""
echo "6. Update .env:"
echo "   DOCAI_PROCESSOR_ID=<your-new-processor-id>"
echo ""
