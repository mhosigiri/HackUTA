"""
Upload training data to Google Cloud Storage for Document AI custom processor training
"""

import os
from google.cloud import storage
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

# Configuration
PROJECT_ID = os.getenv("DOCAI_PROJECT_ID", "652485593933")
BUCKET_NAME = f"invoice-training-{PROJECT_ID}"
TRAINING_DIR = "training_dataset"
CREDENTIALS_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

# Try alternative credential paths
if not CREDENTIALS_PATH or not os.path.exists(CREDENTIALS_PATH):
    possible_paths = [
        "/Users/arniskc/Documents/HackUTA/docuextractmhosigiri-4cc95bebf955.json",
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "docuextractmhosigiri-4cc95bebf955.json")
    ]
    for path in possible_paths:
        if os.path.exists(path):
            CREDENTIALS_PATH = path
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = path
            break

def upload_training_data():
    """Upload training images to GCS"""
    print("=" * 60)
    print("📤 Uploading Training Data to Google Cloud Storage")
    print("=" * 60)
    
    # Check credentials
    if not CREDENTIALS_PATH or not os.path.exists(CREDENTIALS_PATH):
        print(f"❌ Error: Credentials file not found!")
        print(f"   Looked for: {CREDENTIALS_PATH}")
        print(f"\n💡 Please ensure your service account key is at:")
        print(f"   /Users/arniskc/Documents/HackUTA/docuextractmhosigiri-4cc95bebf955.json")
        return False
    
    print(f"\n✅ Using credentials: {CREDENTIALS_PATH}")
    print(f"📋 Project ID: {PROJECT_ID}")
    print(f"📦 Bucket: gs://{BUCKET_NAME}")
    
    # Check training directory
    training_path = Path(TRAINING_DIR)
    if not training_path.exists():
        print(f"\n❌ Error: Training directory not found: {TRAINING_DIR}")
        return False
    
    # Get list of images
    images = list(training_path.glob("*.jpg")) + list(training_path.glob("*.png"))
    print(f"📊 Found {len(images)} training images")
    
    if len(images) == 0:
        print("❌ No images found in training directory!")
        return False
    
    try:
        # Initialize GCS client
        print("\n🔐 Authenticating with Google Cloud...")
        storage_client = storage.Client(project=PROJECT_ID)
        
        # Create or get bucket
        print(f"\n📦 Setting up bucket: {BUCKET_NAME}")
        try:
            bucket = storage_client.get_bucket(BUCKET_NAME)
            print(f"✅ Bucket already exists")
        except:
            print(f"📦 Creating new bucket...")
            bucket = storage_client.create_bucket(BUCKET_NAME, location="us")
            print(f"✅ Created bucket: {BUCKET_NAME}")
        
        # Upload images
        print(f"\n📤 Uploading {len(images)} images...")
        uploaded_count = 0
        
        for i, image_path in enumerate(images):
            blob_name = f"training-images/{image_path.name}"
            blob = bucket.blob(blob_name)
            
            # Upload file
            blob.upload_from_filename(str(image_path))
            uploaded_count += 1
            
            # Progress indicator
            if (i + 1) % 10 == 0:
                print(f"   Uploaded {i + 1}/{len(images)} images...")
        
        print(f"\n✅ Successfully uploaded {uploaded_count} images!")
        
        # List uploaded files
        print(f"\n📊 Verifying upload...")
        blobs = list(bucket.list_blobs(prefix="training-images/"))
        print(f"✅ Confirmed {len(blobs)} files in GCS")
        
        print("\n" + "=" * 60)
        print("✅ Training Data Ready in Google Cloud Storage")
        print("=" * 60)
        
        print(f"\n📍 GCS Path: gs://{BUCKET_NAME}/training-images/")
        print(f"\n🎯 Next Steps:")
        print(f"\n1. Go to Document AI Console:")
        print(f"   https://console.cloud.google.com/ai/document-ai?project={PROJECT_ID}")
        print(f"\n2. Create Custom Processor:")
        print(f"   - Click 'Create Processor'")
        print(f"   - Select 'Custom Document Extractor'")
        print(f"   - Name: 'Custom Invoice Processor'")
        print(f"\n3. Import Training Data:")
        print(f"   - Go to 'Train' tab")
        print(f"   - Click 'Import Data'")
        print(f"   - Source: gs://{BUCKET_NAME}/training-images/")
        print(f"   - Document AI will auto-detect invoice fields")
        print(f"\n4. Define Schema (Fields to Extract):")
        print(f"   - Invoice Number")
        print(f"   - Invoice Date")
        print(f"   - Vendor Name & Address")
        print(f"   - Customer Name & Address")
        print(f"   - Line Items (table)")
        print(f"   - Subtotal, Tax, Total")
        print(f"   - Payment Terms")
        print(f"\n5. Label Training Data:")
        print(f"   - Review auto-labeled fields")
        print(f"   - Correct any errors")
        print(f"   - Label at least 50-100 documents")
        print(f"\n6. Train Model:")
        print(f"   - Click 'Train New Version'")
        print(f"   - Training takes 2-4 hours")
        print(f"   - Monitor progress in console")
        print(f"\n7. Deploy & Update:")
        print(f"   - Deploy trained version")
        print(f"   - Copy new Processor ID")
        print(f"   - Update .env: DOCAI_PROCESSOR_ID=<new-id>")
        print(f"   - Restart backend")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error uploading to GCS: {e}")
        print(f"\n💡 Troubleshooting:")
        print(f"   1. Check credentials file exists and is valid")
        print(f"   2. Ensure billing is enabled on project {PROJECT_ID}")
        print(f"   3. Verify Storage Admin permissions on service account")
        print(f"   4. Check network connectivity")
        return False


if __name__ == "__main__":
    success = upload_training_data()
    exit(0 if success else 1)
