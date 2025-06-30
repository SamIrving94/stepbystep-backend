# StepByStep Image Processing API

This document describes the new image processing capabilities added to the StepByStep backend using Azure Computer Vision.

## 🎯 Overview

The StepByStep backend now supports processing images alongside text instructions, making it easier to create accessible instructions from visual content like:
- Screenshots of software interfaces
- Photos of DIY projects
- Recipe images
- Technical diagrams
- Handwritten notes

## 📋 Available Endpoints

### 1. **Process Images Only** - `/api/process-images`
Process images to extract text (OCR) and generate descriptions.

### 2. **Process Instructions with Images** - `/api/process-instructions-with-images`
Combine text instructions with images for comprehensive processing.

## 🔧 Setup

### Azure Computer Vision Setup

1. **Create Azure Resource:**
   - Go to [Azure Portal](https://portal.azure.com/#create/Microsoft.CognitiveServicesComputerVision)
   - Create a Computer Vision resource
   - Note your endpoint URL and API key

2. **Environment Variables:**
   ```bash
   AZURE_VISION_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com/
   AZURE_VISION_API_KEY=your_azure_vision_api_key_here
   ```

3. **Free Tier Benefits:**
   - 5,000 requests per month free
   - $1.00 per 1,000 requests after free tier
   - Perfect for development and small-scale usage

## 📡 API Usage

### Process Images Only

**Endpoint:** `POST /api/process-images`

**Request Body:**
```json
{
  "images": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  ],
  "extractText": true,
  "describeImages": true
}
```

**Response:**
```json
{
  "success": true,
  "processedImages": [
    {
      "index": 0,
      "description": "A screenshot showing a software interface with buttons and text",
      "extractedText": "Click here to continue\nNext step\nSubmit",
      "tags": ["text", "interface", "button"],
      "confidence": 0.95
    }
  ],
  "totalImages": 2,
  "successfulImages": 2
}
```

### Process Instructions with Images

**Endpoint:** `POST /api/process-instructions-with-images`

**Request Body:**
```json
{
  "rawText": "Follow these steps to install the software",
  "images": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
  ],
  "title": "Software Installation Guide",
  "category": "technical",
  "difficulty": "beginner",
  "preferences": {
    "readingLevel": "simple",
    "stepGranularity": "detailed",
    "includeWarnings": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "processedInstructions": {
    "title": "Software Installation Guide",
    "category": "technical",
    "difficulty": "beginner",
    "totalTime": "15 minutes",
    "ingredients": [],
    "tools": ["computer", "internet connection"],
    "warnings": ["Make sure to backup your data before installation"],
    "steps": [
      {
        "stepNumber": 1,
        "instruction": "Open the installation file by double-clicking the downloaded .exe file",
        "estimatedTime": "2 minutes",
        "tips": "Look for the file in your Downloads folder",
        "relatedImages": [0]
      }
    ],
    "imageInsights": {
      "totalImages": 1,
      "successfulImages": 1,
      "imageDescriptions": ["A software installation wizard with a welcome screen"],
      "extractedTextFromImages": ["Welcome to Setup\nClick Next to continue"]
    }
  }
}
```

## 🎨 Image Format Support

### Supported Formats:
- **JPEG/JPG**
- **PNG**
- **BMP**
- **GIF** (first frame only)
- **TIFF**

### Size Limits:
- **Maximum file size:** 4MB per image
- **Maximum dimensions:** 4,096 x 4,096 pixels
- **Maximum images per request:** 10

### Base64 Encoding:
Images must be base64 encoded. You can include the data URL prefix:
```
data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...
```

Or just the base64 string:
```
/9j/4AAQSkZJRgABAQAAAQ...
```

## 🔍 Features

### 1. **OCR Text Extraction**
- Extracts printed text from images
- Supports multiple languages
- Handles rotated and skewed text
- Returns structured text with line breaks

### 2. **Image Description**
- AI-powered descriptions of image content
- Confidence scores for accuracy
- Relevant tags for categorization

### 3. **Combined Processing**
- Integrates image insights with text instructions
- Creates comprehensive, accessible instructions
- Links steps to relevant images

## 💰 Cost Analysis

### Azure Computer Vision Pricing:
- **Free tier:** 5,000 requests/month
- **Paid tier:** $1.00 per 1,000 requests
- **Typical usage:** 1-2 requests per instruction set

### Cost Examples:
- **100 instruction sets with images:** Free (within free tier)
- **1,000 instruction sets:** ~$1.00
- **10,000 instruction sets:** ~$10.00

## 🚀 Frontend Integration

### JavaScript Example:
```javascript
// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Process images
async function processImages(files) {
  const base64Images = await Promise.all(
    Array.from(files).map(file => fileToBase64(file))
  );

  const response = await fetch('/api/process-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      images: base64Images,
      extractText: true,
      describeImages: true
    })
  });

  return response.json();
}
```

### React Example:
```jsx
import { useState } from 'react';

function ImageProcessor() {
  const [images, setImages] = useState([]);
  const [results, setResults] = useState(null);

  const handleFileUpload = async (files) => {
    const base64Images = await Promise.all(
      Array.from(files).map(file => fileToBase64(file))
    );
    setImages(base64Images);
  };

  const processImages = async () => {
    const response = await fetch('/api/process-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images, extractText: true, describeImages: true })
    });
    const data = await response.json();
    setResults(data);
  };

  return (
    <div>
      <input type="file" multiple onChange={(e) => handleFileUpload(e.target.files)} />
      <button onClick={processImages}>Process Images</button>
      {results && (
        <div>
          {results.processedImages.map((img, index) => (
            <div key={index}>
              <h3>Image {index + 1}</h3>
              <p>Description: {img.description}</p>
              <p>Text: {img.extractedText}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 🔧 Error Handling

### Common Errors:
- **Missing credentials:** Azure Vision not configured
- **Invalid image format:** Unsupported file type
- **Image too large:** Exceeds 4MB limit
- **Too many images:** More than 10 images per request

### Error Response Format:
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information",
  "totalImages": 0,
  "successfulImages": 0
}
```

## 🎯 Best Practices

### 1. **Image Quality**
- Use clear, well-lit images
- Ensure text is readable
- Avoid heavily compressed images

### 2. **File Size**
- Compress images to under 1MB when possible
- Use appropriate formats (JPEG for photos, PNG for screenshots)

### 3. **Error Handling**
- Always check for errors in responses
- Implement fallback processing for failed images
- Provide user feedback for processing status

### 4. **Cost Optimization**
- Cache processed results when possible
- Only process images when necessary
- Monitor usage to stay within free tier

## 🔄 Migration Guide

### From Text-Only Processing:
1. **Update API calls** to include image arrays
2. **Add image upload** functionality to frontend
3. **Handle new response format** with image insights
4. **Update UI** to display image-related information

### Example Migration:
```javascript
// Before (text only)
const response = await fetch('/api/process-instructions', {
  method: 'POST',
  body: JSON.stringify({ rawText: instructions })
});

// After (with images)
const response = await fetch('/api/process-instructions-with-images', {
  method: 'POST',
  body: JSON.stringify({ 
    rawText: instructions,
    images: base64Images 
  })
});
```

## 📞 Support

For issues or questions:
1. Check the error messages in API responses
2. Verify Azure Vision credentials are correct
3. Ensure images meet format and size requirements
4. Monitor Azure Vision usage in the Azure portal

---

**Next Steps:** Deploy the updated backend and test with your V0 frontend! 