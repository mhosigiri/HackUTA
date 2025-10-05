# Invoice OCR Model Training Guide

## Dataset Information
- **Total Images**: 8181
- **Training Sample**: 100
- **Location**: `/Users/arniskc/Documents/HackUTA/backend/training_dataset`

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
gsutil mb -p 652485593933 gs://invoice-training-data

# Upload images
gsutil -m cp training_dataset/*.jpg gs://invoice-training-data/images/
gsutil -m cp training_dataset/*.png gs://invoice-training-data/images/
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
- **Project**: 652485593933
- **Processor**: 488eb737f920bc88
- **Location**: us

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
