"""
Simplified training script - Download dataset and prepare for Document AI
"""

import os
import kagglehub
from pathlib import Path
from PIL import Image
import json
from dotenv import load_dotenv

load_dotenv()

def download_and_prepare_dataset():
    """Download invoice dataset and prepare for training"""
    print("=" * 60)
    print("📥 Downloading Invoice OCR Dataset")
    print("=" * 60)
    
    try:
        # Download dataset
        print("\n1️⃣  Downloading from Kaggle...")
        path = kagglehub.dataset_download("osamahosamabdellatif/high-quality-invoice-images-for-ocr")
        print(f"✅ Dataset downloaded to: {path}")
        
        # Analyze dataset
        print("\n2️⃣  Analyzing dataset structure...")
        dataset_dir = Path(path)
        
        # Find all images
        image_files = []
        for ext in ['.jpg', '.jpeg', '.png', '.pdf', '.tiff', '.tif']:
            image_files.extend(list(dataset_dir.rglob(f"*{ext}")))
        
        print(f"✅ Found {len(image_files)} invoice images")
        
        # Create organized structure
        output_dir = Path("training_dataset")
        output_dir.mkdir(exist_ok=True)
        
        print("\n3️⃣  Organizing dataset...")
        
        # Sample and organize images
        sample_count = min(100, len(image_files))
        dataset_info = {
            "total_images": len(image_files),
            "sample_size": sample_count,
            "images": []
        }
        
        for i, img_path in enumerate(image_files[:sample_count]):
            try:
                # Copy to organized structure
                dest_path = output_dir / f"invoice_{i:04d}{img_path.suffix}"
                
                # For images, verify they can be opened
                if img_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.tiff', '.tif']:
                    img = Image.open(img_path)
                    img.save(dest_path)
                    width, height = img.size
                    
                    dataset_info["images"].append({
                        "file_name": dest_path.name,
                        "original_path": str(img_path),
                        "width": width,
                        "height": height,
                        "format": img.format
                    })
                else:
                    # For PDFs, just copy
                    import shutil
                    shutil.copy(img_path, dest_path)
                    dataset_info["images"].append({
                        "file_name": dest_path.name,
                        "original_path": str(img_path),
                        "format": "PDF"
                    })
                
                if (i + 1) % 10 == 0:
                    print(f"  Processed {i + 1}/{sample_count} images...")
                    
            except Exception as e:
                print(f"  ⚠️  Skipped {img_path.name}: {e}")
                continue
        
        # Save dataset info
        with open(output_dir / "dataset_info.json", 'w') as f:
            json.dump(dataset_info, f, indent=2)
        
        print(f"\n✅ Organized {len(dataset_info['images'])} images in {output_dir}/")
        
        # Create training guide
        create_training_guide(output_dir, dataset_info)
        
        print("\n" + "=" * 60)
        print("✅ Dataset preparation complete!")
        print("=" * 60)
        print(f"\n📂 Training data location: {output_dir.absolute()}")
        print(f"📊 Total images: {len(dataset_info['images'])}")
        print(f"\n📖 Next steps:")
        print(f"   1. Review images in {output_dir}/")
        print(f"   2. Read TRAINING_GUIDE.md for instructions")
        print(f"   3. Upload to GCS for Document AI training")
        
        return output_dir
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def create_training_guide(output_dir: Path, dataset_info: dict):
    """Create a comprehensive training guide"""
    guide_path = output_dir / "TRAINING_GUIDE.md"
    
    with open(guide_path, 'w') as f:
        f.write(f"""# Invoice OCR Model Training Guide

## Dataset Information
- **Total Images**: {dataset_info['total_images']}
- **Training Sample**: {dataset_info['sample_size']}
- **Location**: `{output_dir.absolute()}`

## Training Options

### Option 1: Google Document AI Custom Processor (Recommended)

#### Prerequisites
- Google Cloud Project with Document AI API enabled
- GCS bucket for training data
- Billing enabled

#### Steps

1. **Upload Training Data to GCS**
```bash
# Create GCS bucket (if not exists)
gsutil mb -p {os.getenv('DOCAI_PROJECT_ID', 'YOUR_PROJECT')} gs://invoice-training-data

# Upload images
gsutil -m cp {output_dir}/*.jpg gs://invoice-training-data/images/
gsutil -m cp {output_dir}/*.png gs://invoice-training-data/images/
```

2. **Create Custom Processor**
- Go to: https://console.cloud.google.com/ai/document-ai
- Click "Create Processor"
- Select "Custom Document Extractor"
- Name: "Invoice OCR Processor"

3. **Import Training Data**
- In processor page, go to "Train" tab
- Click "Import Data"
- Select GCS path: `gs://invoice-training-data/images/`
- Document AI will auto-detect invoice fields

4. **Define Schema**
Configure fields to extract:
- Invoice Number
- Invoice Date
- Vendor/Supplier Name
- Vendor Address
- Customer Name
- Customer Address
- Line Items (table)
  - Description
  - Quantity
  - Unit Price
  - Amount
- Subtotal
- Tax Amount
- Total Amount
- Payment Terms
- Due Date

5. **Label Training Data**
- Document AI provides auto-labeling
- Review and correct labels
- Aim for at least 50-100 labeled documents

6. **Train Model**
- Click "Train New Version"
- Training takes 2-4 hours
- Monitor training progress

7. **Evaluate & Deploy**
- Review accuracy metrics
- Test with validation set
- Deploy trained version
- Copy new Processor ID

8. **Update Application**
```bash
# Update .env file
DOCAI_PROCESSOR_ID=YOUR_NEW_PROCESSOR_ID
```

### Option 2: Use Pre-trained Processor (Current)

Your current setup uses a pre-trained invoice processor:
- **Project**: {os.getenv('DOCAI_PROJECT_ID', '652485593933')}
- **Processor**: {os.getenv('DOCAI_PROCESSOR_ID', '488eb737f920bc88')}
- **Location**: {os.getenv('DOCAI_LOCATION', 'us')}

This works well for standard invoices but custom training improves accuracy for your specific invoice formats.

### Option 3: Fine-tune with TensorFlow/PyTorch

For advanced users who want full control:

1. **Install Dependencies**
```bash
pip install tensorflow pillow pytesseract transformers
```

2. **Use OCR + NER Pipeline**
- Extract text with Tesseract OCR
- Fine-tune BERT/LayoutLM for entity extraction
- Train on labeled invoice data

3. **Training Script**
```python
# See advanced_train.py for full implementation
from transformers import LayoutLMForTokenClassification
# ... training code
```

## Testing Your Model

After training, test with sample invoices:

```bash
# Test with Document AI
python test_model.py --image path/to/invoice.jpg

# Or use the web app
# Upload invoice at http://localhost:3000
```

## Performance Metrics

Target metrics for invoice OCR:
- **Field Extraction Accuracy**: >95%
- **Character Recognition**: >98%
- **Layout Understanding**: >90%
- **Processing Time**: <5 seconds per page

## Common Invoice Fields

Ensure your model can extract:
- ✅ Invoice metadata (number, date, due date)
- ✅ Vendor information (name, address, contact)
- ✅ Customer information (name, address)
- ✅ Line items (description, qty, price, amount)
- ✅ Financial totals (subtotal, tax, total)
- ✅ Payment terms and methods

## Troubleshooting

### Low Accuracy
- Add more training examples
- Improve label quality
- Use data augmentation

### Slow Processing
- Optimize image resolution
- Use batch processing
- Enable GPU acceleration

### Missing Fields
- Review schema definition
- Add more labeled examples for missing fields
- Check field name variations

## Resources

- [Document AI Documentation](https://cloud.google.com/document-ai/docs)
- [Custom Processor Training](https://cloud.google.com/document-ai/docs/custom-processor)
- [Invoice Parser Guide](https://cloud.google.com/document-ai/docs/processors-list#processor_invoice-processor)

## Cost Estimation

Document AI pricing (as of 2024):
- **Pre-trained processor**: $1.50 per 1,000 pages
- **Custom processor training**: $300 per training run
- **Custom processor usage**: $10 per 1,000 pages

For development/testing:
- First 1,000 pages/month: FREE
- Good for prototyping and demos

## Next Steps

1. ✅ Dataset downloaded and organized
2. ⬜ Upload to GCS bucket
3. ⬜ Create custom processor
4. ⬜ Label training data
5. ⬜ Train model
6. ⬜ Evaluate accuracy
7. ⬜ Deploy to production
8. ⬜ Update application config

---

**Need help?** Check the Document AI documentation or reach out to support.
""")
    
    print(f"✅ Created training guide: {guide_path}")


if __name__ == "__main__":
    download_and_prepare_dataset()
