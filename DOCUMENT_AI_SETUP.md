# Google Document AI Integration Setup Guide

## Overview

DocuExtract now integrates with Google Cloud Document AI to automatically extract key-value pairs, entities, and tables from uploaded mortgage documents. This guide walks you through setting up Document AI for your project.

## Architecture

The implementation follows the [Google Cloud Document AI samples](https://github.com/GoogleCloudPlatform/document-ai-samples) best practices, specifically the web-app-demo pattern.

### Flow:
1. **Upload**: User uploads documents via drag-and-drop interface
2. **Storage**: Files are saved locally (or GCS in production)
3. **Processing**: Document AI extracts structured data
4. **Database**: Extracted data stored in PostgreSQL as JSON
5. **Display**: Frontend shows key-value pairs, entities, and tables

## Prerequisites

- Google Cloud Project with billing enabled
- Document AI API enabled
- Service account with Document AI permissions
- Cloud SQL instance (already configured)

## Step 1: Enable Document AI API

```bash
# Enable the API
gcloud services enable documentai.googleapis.com

# Verify it's enabled
gcloud services list --enabled | grep documentai
```

## Step 2: Create a Document AI Processor

### Using Console:
1. Go to [Document AI Console](https://console.cloud.google.com/ai/document-ai)
2. Click "Create Processor"
3. Select processor type:
   - **Form Parser**: For generic forms and key-value extraction
   - **Invoice Parser**: For invoices
   - **Specialized**: For specific document types (W-2, paystubs, etc.)
4. Choose region: **us** or **eu**
5. Note the **Processor ID** (format: `abc123def456`)

### Using gcloud:
```bash
# List available processor types
gcloud documentai processor-types list --location=us

# Create a Form Parser processor
gcloud documentai processors create \
  --display-name="mortgage-form-parser" \
  --type=FORM_PARSER_PROCESSOR \
  --location=us \
  --project=docuextractmhosigiri
```

## Step 3: Configure Service Account

Your existing service account needs Document AI permissions:

```bash
# Add Document AI User role
gcloud projects add-iam-policy-binding docuextractmhosigiri \
  --member="serviceAccount:mortgage-app-sa@docuextractmhosigiri.iam.gserviceaccount.com" \
  --role="roles/documentai.apiUser"
```

## Step 4: Update Backend Environment Variables

Add these to `/Users/arniskc/Desktop/HackUTA/backend/.env`:

```bash
# Document AI Configuration
DOCAI_PROCESSOR_ID=YOUR_PROCESSOR_ID_HERE
DOCAI_LOCATION=us  # or 'eu'

# Optional: Cloud Storage for production
GCS_BUCKET_NAME=your-bucket-name  # For storing uploaded files
```

## Step 5: Install Backend Dependencies

```bash
cd /Users/arniskc/Desktop/HackUTA/backend
pip install -r requirements.txt
```

This will install:
- `google-cloud-documentai==2.24.0`
- `google-cloud-storage` (already included)

## Step 6: Test the Integration

### 1. Start the Backend

```bash
cd /Users/arniskc/Desktop/HackUTA/backend

# Make sure Cloud SQL Proxy is running
./start-cloud-sql-proxy.sh

# In another terminal, start FastAPI
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend is Already Running
Your frontend should already be running on `http://localhost:3000`

### 3. Test Document Upload

1. Navigate to Dashboard
2. Upload a test document (PDF, JPG, or PNG)
3. Wait for processing
4. Go to Activities → My Documents to see the processed document

## API Endpoints

### Upload Documents
```
POST /api/documents/upload
Authorization: Bearer {auth0_token}
Content-Type: multipart/form-data

files: [File, File, ...]
```

### Process Document with Document AI
```
POST /api/documents/{document_id}/process
Authorization: Bearer {auth0_token}

Response:
{
  "message": "Document processed successfully",
  "document_id": 123,
  "extracted_data": {
    "text": "...",
    "entities": [...],
    "key_value_pairs": [...],
    "tables": [...],
    "pages": 3,
    "confidence": 0.95
  }
}
```

### Get Extracted Data
```
GET /api/documents/{document_id}/extracted-data
Authorization: Bearer {auth0_token}

Response:
{
  "document_id": 123,
  "file_name": "w2_form.pdf",
  "status": "processed",
  "extracted_data": {...},
  "processed_date": "2025-10-05T..."
}
```

## Extracted Data Structure

Document AI returns structured data:

```json
{
  "text": "Full OCR text...",
  "entities": [
    {
      "type": "ssn",
      "mention_text": "123-45-6789",
      "confidence": 0.98,
      "normalized_value": {
        "text": "123456789"
      }
    }
  ],
  "key_value_pairs": [
    {
      "key": "Employee Name",
      "value": "John Doe",
      "confidence": 0.95
    }
  ],
  "tables": [
    {
      "rows": [
        ["Header 1", "Header 2"],
        ["Value 1", "Value 2"]
      ]
    }
  ],
  "pages": 2,
  "confidence": 0.94
}
```

## Frontend Components

### DocumentUpload
Location: `/Users/arniskc/Desktop/HackUTA/frontend/src/components/DocumentUpload.tsx`

Features:
- Drag-and-drop interface
- Multi-file upload
- Automatic Document AI processing
- Progress indicators

### ExtractedDataView
Location: `/Users/arniskc/Desktop/HackUTA/frontend/src/components/ExtractedDataView.tsx`

Displays:
- Key-value pairs with confidence scores
- Detected entities
- Tables
- Raw OCR text (collapsible)

## Testing with Sample Documents

Google provides sample documents for testing:
```bash
# Download sample invoice
gsutil cp gs://cloud-samples-data/documentai/invoice.pdf ./test-invoice.pdf

# Download sample form
gsutil cp gs://cloud-samples-data/documentai/form.pdf ./test-form.pdf
```

## Troubleshooting

### Error: "Missing Processor ID"
- Ensure `DOCAI_PROCESSOR_ID` is set in `backend/.env`
- Format: `abc123def456` (no dashes or spaces)

### Error: "Permission Denied"
```bash
# Verify service account has correct role
gcloud projects get-iam-policy docuextractmhosigiri \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:mortgage-app-sa@*"
```

### Error: "Processor Not Found"
- Verify processor location matches `DOCAI_LOCATION` in `.env`
- US processors: `us`
- EU processors: `eu`

### Low Confidence Scores
- Ensure documents are clear and high-quality
- PDFs work better than images
- Consider using specialized processors (Invoice, W-2, etc.) instead of Form Parser

## Cost Estimation

Document AI pricing (as of 2025):
- **Form Parser**: $0.010 per page
- **Invoice Parser**: $0.010 per page
- **Specialized Processors**: $0.010 per page

Free tier: 1,000 pages/month for first 3 months

Example for 100 documents (avg 3 pages each):
- 300 pages × $0.010 = **$3.00/month**

[See latest pricing](https://cloud.google.com/document-ai/pricing)

## Production Deployment

For production, consider:

1. **Use Cloud Storage** instead of local file storage
2. **Enable Cloud SQL** connector (already configured)
3. **Add rate limiting** for uploads
4. **Implement retry logic** for failed extractions
5. **Add webhook support** for async processing
6. **Enable audit logging** for compliance

## References

- [Document AI Documentation](https://cloud.google.com/document-ai/docs)
- [Document AI Samples Repo](https://github.com/GoogleCloudPlatform/document-ai-samples)
- [Web App Demo Reference](https://github.com/GoogleCloudPlatform/document-ai-samples/tree/main/web-app-demo)
- [Python Client Library](https://googleapis.dev/python/documentai/latest/)

## Support

For issues:
1. Check backend logs: `uvicorn` output
2. Check frontend console: Browser DevTools
3. Verify Cloud SQL connection: `python backend/test_connection.py`
4. Test Document AI directly: Use [Document AI Console](https://console.cloud.google.com/ai/document-ai)

---

**Implementation Complete!** 🎉

Your DocuExtract app now supports:
- ✅ Document upload with drag-and-drop
- ✅ Google Document AI processing
- ✅ Key-value pair extraction
- ✅ Entity recognition
- ✅ Table extraction
- ✅ Confidence scoring
- ✅ PostgreSQL storage
- ✅ Beautiful UI display
