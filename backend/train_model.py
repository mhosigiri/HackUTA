"""
Fine-tuning script for Document AI OCR model using invoice dataset
"""

import os
import json
import kagglehub
from pathlib import Path
from typing import List, Dict
from google.cloud import documentai_v1 as documentai
from google.api_core.client_options import ClientOptions
from dotenv import load_dotenv
import time

load_dotenv()

# Configuration
PROJECT_ID = os.getenv("DOCAI_PROJECT_ID", "652485593933")
LOCATION = os.getenv("DOCAI_LOCATION", "us")
PROCESSOR_ID = os.getenv("DOCAI_PROCESSOR_ID", "488eb737f920bc88")
GOOGLE_CREDENTIALS_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

# Set credentials
if GOOGLE_CREDENTIALS_PATH and os.path.exists(GOOGLE_CREDENTIALS_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_CREDENTIALS_PATH
    print(f"✅ Using credentials: {GOOGLE_CREDENTIALS_PATH}")
else:
    print("❌ Error: Google credentials not found!")
    exit(1)


def download_invoice_dataset():
    """Download the invoice dataset from Kaggle"""
    print("\n📥 Downloading invoice dataset from Kaggle...")
    try:
        path = kagglehub.dataset_download("osamahosamabdellatif/high-quality-invoice-images-for-ocr")
        print(f"✅ Dataset downloaded to: {path}")
        return path
    except Exception as e:
        print(f"❌ Error downloading dataset: {e}")
        return None


def analyze_dataset(dataset_path: str):
    """Analyze the downloaded dataset structure"""
    print(f"\n🔍 Analyzing dataset at: {dataset_path}")
    
    dataset_dir = Path(dataset_path)
    
    # Find all image files
    image_extensions = ['.jpg', '.jpeg', '.png', '.pdf', '.tiff']
    images = []
    for ext in image_extensions:
        images.extend(list(dataset_dir.rglob(f"*{ext}")))
    
    print(f"📊 Found {len(images)} images")
    
    # Check for annotation files
    annotations = list(dataset_dir.rglob("*.json")) + list(dataset_dir.rglob("*.xml"))
    print(f"📝 Found {len(annotations)} annotation files")
    
    return {
        "images": images,
        "annotations": annotations,
        "total_images": len(images)
    }


def process_training_samples(dataset_info: Dict, max_samples: int = 100):
    """Process training samples through Document AI to build training data"""
    print(f"\n🔄 Processing {min(max_samples, dataset_info['total_images'])} training samples...")
    
    # Initialize Document AI client
    opts = ClientOptions(api_endpoint=f"{LOCATION}-documentai.googleapis.com")
    client = documentai.DocumentProcessorServiceClient(client_options=opts)
    processor_name = client.processor_path(PROJECT_ID, LOCATION, PROCESSOR_ID)
    
    training_data = []
    processed_count = 0
    
    for image_path in dataset_info['images'][:max_samples]:
        try:
            print(f"Processing: {image_path.name}...", end=" ")
            
            # Read the image
            with open(image_path, 'rb') as f:
                image_content = f.read()
            
            # Determine MIME type
            mime_type = "application/pdf" if image_path.suffix.lower() == '.pdf' else "image/jpeg"
            
            # Process with Document AI
            raw_document = documentai.RawDocument(content=image_content, mime_type=mime_type)
            request = documentai.ProcessRequest(name=processor_name, raw_document=raw_document)
            
            result = client.process_document(request=request)
            document = result.document
            
            # Extract training data
            sample_data = {
                "file_name": image_path.name,
                "text": document.text,
                "entities": [
                    {
                        "type": entity.type_,
                        "mention_text": entity.mention_text,
                        "confidence": entity.confidence
                    }
                    for entity in document.entities
                ],
                "key_value_pairs": []
            }
            
            # Extract form fields
            for page in document.pages:
                if page.form_fields:
                    for field in page.form_fields:
                        field_name = get_text(field.field_name, document)
                        field_value = get_text(field.field_value, document)
                        sample_data["key_value_pairs"].append({
                            "key": field_name.strip() if field_name else "",
                            "value": field_value.strip() if field_value else "",
                            "confidence": field.field_value.confidence if field.field_value else 0.0
                        })
            
            training_data.append(sample_data)
            processed_count += 1
            print("✅")
            
            # Rate limiting - Document AI has quotas
            time.sleep(0.5)
            
        except Exception as e:
            print(f"❌ Error: {e}")
            continue
    
    print(f"\n✅ Successfully processed {processed_count} samples")
    return training_data


def get_text(layout, document):
    """Extract text from layout"""
    if not layout or not layout.text_anchor:
        return ""
    
    text = ""
    for segment in layout.text_anchor.text_segments:
        start_index = int(segment.start_index) if segment.start_index else 0
        end_index = int(segment.end_index) if segment.end_index else 0
        text += document.text[start_index:end_index]
    
    return text


def save_training_data(training_data: List[Dict], output_path: str = "training_data.json"):
    """Save processed training data to JSON"""
    print(f"\n💾 Saving training data to {output_path}...")
    
    with open(output_path, 'w') as f:
        json.dump(training_data, f, indent=2)
    
    print(f"✅ Saved {len(training_data)} training samples")


def analyze_training_data(training_data: List[Dict]):
    """Analyze the processed training data"""
    print("\n📊 Training Data Analysis:")
    print(f"Total samples: {len(training_data)}")
    
    total_entities = sum(len(sample['entities']) for sample in training_data)
    total_kvp = sum(len(sample['key_value_pairs']) for sample in training_data)
    
    print(f"Total entities extracted: {total_entities}")
    print(f"Total key-value pairs: {total_kvp}")
    print(f"Average entities per document: {total_entities / len(training_data):.2f}")
    print(f"Average key-value pairs per document: {total_kvp / len(training_data):.2f}")
    
    # Entity types distribution
    entity_types = {}
    for sample in training_data:
        for entity in sample['entities']:
            entity_type = entity['type']
            entity_types[entity_type] = entity_types.get(entity_type, 0) + 1
    
    print("\n📋 Entity Types Distribution:")
    for entity_type, count in sorted(entity_types.items(), key=lambda x: x[1], reverse=True):
        print(f"  {entity_type}: {count}")


def create_document_ai_training_format(training_data: List[Dict], output_dir: str = "docai_training"):
    """
    Create training data in Document AI format for custom processor training
    
    Document AI expects:
    - Training documents in GCS bucket
    - Annotation files in JSONL format
    """
    print(f"\n📝 Creating Document AI training format in {output_dir}...")
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Create JSONL annotation file
    annotations_file = os.path.join(output_dir, "annotations.jsonl")
    
    with open(annotations_file, 'w') as f:
        for sample in training_data:
            # Document AI annotation format
            annotation = {
                "document": {
                    "text": sample["text"],
                    "entities": sample["entities"]
                },
                "annotations": {
                    "key_value_pairs": sample["key_value_pairs"]
                }
            }
            f.write(json.dumps(annotation) + '\n')
    
    print(f"✅ Created annotations file: {annotations_file}")
    
    # Create training instructions
    instructions_file = os.path.join(output_dir, "TRAINING_INSTRUCTIONS.md")
    with open(instructions_file, 'w') as f:
        f.write("""# Document AI Custom Processor Training Instructions

## Steps to Train Custom Processor:

### 1. Upload Training Data to GCS
```bash
gsutil -m cp -r docai_training/* gs://YOUR_BUCKET/training_data/
```

### 2. Create Custom Processor
- Go to Document AI Console: https://console.cloud.google.com/ai/document-ai
- Click "Create Processor"
- Select "Custom Document Extractor"
- Name your processor

### 3. Import Training Data
- In the processor page, go to "Train" tab
- Click "Import Data"
- Select your GCS bucket path: gs://YOUR_BUCKET/training_data/
- Map the annotation file

### 4. Configure Schema
Define the entities and fields you want to extract:
- Invoice Number
- Date
- Vendor Name
- Total Amount
- Line Items
- etc.

### 5. Start Training
- Review the training data
- Click "Train New Version"
- Training typically takes 2-4 hours

### 6. Evaluate and Deploy
- Review accuracy metrics
- Test with sample documents
- Deploy the trained version

### 7. Update Your Code
Replace PROCESSOR_ID in .env with your new custom processor ID.

## Training Data Statistics
""")
        f.write(f"- Total samples: {len(training_data)}\n")
        f.write(f"- Total entities: {sum(len(s['entities']) for s in training_data)}\n")
        f.write(f"- Total key-value pairs: {sum(len(s['key_value_pairs']) for s in training_data)}\n")
    
    print(f"✅ Created training instructions: {instructions_file}")


def main():
    """Main training pipeline"""
    print("=" * 60)
    print("🚀 Document AI Model Fine-Tuning Pipeline")
    print("=" * 60)
    
    # Step 1: Download dataset
    dataset_path = download_invoice_dataset()
    if not dataset_path:
        print("❌ Failed to download dataset")
        return
    
    # Step 2: Analyze dataset
    dataset_info = analyze_dataset(dataset_path)
    
    # Step 3: Process training samples
    # Note: Start with a small number due to Document AI quotas
    training_data = process_training_samples(dataset_info, max_samples=50)
    
    if not training_data:
        print("❌ No training data generated")
        return
    
    # Step 4: Analyze training data
    analyze_training_data(training_data)
    
    # Step 5: Save training data
    save_training_data(training_data, "training_data.json")
    
    # Step 6: Create Document AI training format
    create_document_ai_training_format(training_data)
    
    print("\n" + "=" * 60)
    print("✅ Training data preparation complete!")
    print("=" * 60)
    print("\n📚 Next steps:")
    print("1. Review training_data.json")
    print("2. Follow instructions in docai_training/TRAINING_INSTRUCTIONS.md")
    print("3. Upload data to GCS and train custom processor")
    print("4. Update DOCAI_PROCESSOR_ID in .env with new processor")


if __name__ == "__main__":
    main()
