// Test script for StepByStep Image Processing APIs
// Run with: node test-image-api.js

const fs = require('fs');
const path = require('path');

// Your backend URL
const BACKEND_URL = 'https://stepbystep-backend-o6ouyy2md-samjlirving-gmailcoms-projects.vercel.app';

// Convert image file to base64
function imageToBase64(filePath) {
  const imageBuffer = fs.readFileSync(filePath);
  const base64String = imageBuffer.toString('base64');
  return `data:image/jpeg;base64,${base64String}`;
}

// Test 1: Process Images Only
async function testProcessImages() {
  console.log('🧪 Testing /api/process-images...');
  
  try {
    // Create a simple test image (you can replace this with a real image)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const response = await fetch(`${BACKEND_URL}/api/process-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: [testImageBase64],
        extractText: true,
        describeImages: true
      })
    });

    const result = await response.json();
    console.log('✅ Process Images Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('🎉 Image processing API is working!');
    } else {
      console.log('❌ Image processing failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error testing process-images:', error.message);
  }
}

// Test 2: Process Instructions with Images
async function testProcessInstructionsWithImages() {
  console.log('\n🧪 Testing /api/process-instructions-with-images...');
  
  try {
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const response = await fetch(`${BACKEND_URL}/api/process-instructions-with-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rawText: 'Take a screenshot of your computer screen and save it to your desktop.',
        images: [testImageBase64],
        title: 'Screenshot Tutorial',
        category: 'technical',
        difficulty: 'beginner',
        preferences: {
          readingLevel: 'simple',
          stepGranularity: 'detailed',
          includeWarnings: true
        }
      })
    });

    const result = await response.json();
    console.log('✅ Process Instructions with Images Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('🎉 Combined processing API is working!');
      console.log(`📊 Processed ${result.processedInstructions?.steps?.length || 0} steps`);
      if (result.processedInstructions?.imageInsights) {
        console.log(`🖼️ Processed ${result.processedInstructions.imageInsights.successfulImages}/${result.processedInstructions.imageInsights.totalImages} images`);
      }
    } else {
      console.log('❌ Combined processing failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error testing process-instructions-with-images:', error.message);
  }
}

// Test 3: Check API Documentation
async function testAPIDocumentation() {
  console.log('\n🧪 Testing API Documentation...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/process-images`);
    const result = await response.json();
    console.log('✅ API Documentation Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error testing API documentation:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting StepByStep Image Processing API Tests...\n');
  
  await testAPIDocumentation();
  await testProcessImages();
  await testProcessInstructionsWithImages();
  
  console.log('\n✨ All tests completed!');
  console.log('\n📝 Next steps:');
  console.log('1. If tests pass, your APIs are working correctly');
  console.log('2. If you see "Azure Vision service not configured", add your environment variables');
  console.log('3. Try with real images by replacing the test base64 strings');
}

// Run the tests
runAllTests().catch(console.error); 