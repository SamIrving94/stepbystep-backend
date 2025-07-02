// Comprehensive Backend API Test Script
// This will test all endpoints and identify issues

const BACKEND_URL = 'https://stepbystep-backend-8gcnNLVjMJEwrWXrg3P-samjlirving-gmailcoms-projects.vercel.app';

// Test 1: Check if backend is accessible
async function testBackendAccess() {
  console.log('🔍 Testing backend accessibility...');
  try {
    const response = await fetch(BACKEND_URL);
    const text = await response.text();
    console.log('✅ Backend is accessible');
    console.log('📄 Response preview:', text.substring(0, 200) + '...');
    return true;
  } catch (error) {
    console.error('❌ Backend not accessible:', error.message);
    return false;
  }
}

// Test 2: Test fetch-from-link API
async function testFetchFromLink() {
  console.log('\n🔍 Testing /api/fetch-from-link...');
  
  // Test with a simple HTML page
  const testUrl = 'https://example.com';
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/fetch-from-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: testUrl })
    });

    const result = await response.json();
    console.log('📊 Response status:', response.status);
    console.log('📄 Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ fetch-from-link API is working correctly');
      return true;
    } else {
      console.log('❌ fetch-from-link API returned error:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing fetch-from-link:', error.message);
    return false;
  }
}

// Test 3: Test fetch-from-link with PDF URL (should return specific error)
async function testFetchFromLinkPDF() {
  console.log('\n🔍 Testing /api/fetch-from-link with PDF URL...');
  
  const pdfUrl = 'https://example.com/document.pdf';
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/fetch-from-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: pdfUrl })
    });

    const result = await response.json();
    console.log('📊 Response status:', response.status);
    console.log('📄 Response:', JSON.stringify(result, null, 2));
    
    if (!result.success && result.error === 'PDF files are not currently supported') {
      console.log('✅ PDF error handling is working correctly');
      return true;
    } else {
      console.log('❌ Unexpected response for PDF URL');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing PDF handling:', error.message);
    return false;
  }
}

// Test 4: Test fetch-and-simplify API
async function testFetchAndSimplify() {
  console.log('\n🔍 Testing /api/fetch-and-simplify...');
  
  const testUrl = 'https://example.com';
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/fetch-and-simplify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: testUrl })
    });

    const result = await response.json();
    console.log('📊 Response status:', response.status);
    console.log('📄 Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ fetch-and-simplify API is working correctly');
      return true;
    } else {
      console.log('❌ fetch-and-simplify API returned error:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing fetch-and-simplify:', error.message);
    return false;
  }
}

// Test 5: Test process-instructions API
async function testProcessInstructions() {
  console.log('\n🔍 Testing /api/process-instructions...');
  
  const testInstructions = 'Boil water in a pot. Add pasta and cook for 10 minutes. Drain and serve.';
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/process-instructions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rawText: testInstructions,
        title: 'Simple Pasta Recipe',
        category: 'cooking',
        difficulty: 'beginner'
      })
    });

    const result = await response.json();
    console.log('📊 Response status:', response.status);
    console.log('📄 Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ process-instructions API is working correctly');
      return true;
    } else {
      console.log('❌ process-instructions API returned error:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing process-instructions:', error.message);
    return false;
  }
}

// Test 6: Test CORS headers
async function testCORS() {
  console.log('\n🔍 Testing CORS headers...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/fetch-from-link`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://v0.dev',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    console.log('📊 CORS Response status:', response.status);
    console.log('📄 CORS Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 200) {
      console.log('✅ CORS is configured correctly');
      return true;
    } else {
      console.log('❌ CORS configuration issue');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing CORS:', error.message);
    return false;
  }
}

// Test 7: Test image processing APIs
async function testImageProcessing() {
  console.log('\n🔍 Testing image processing APIs...');
  
  // Test the GET endpoint for documentation
  try {
    const response = await fetch(`${BACKEND_URL}/api/process-images`);
    const result = await response.json();
    console.log('📊 Image API documentation response:', JSON.stringify(result, null, 2));
    console.log('✅ Image processing API documentation is accessible');
    return true;
  } catch (error) {
    console.error('❌ Error testing image processing API:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive backend API tests...\n');
  
  const results = {
    backendAccess: await testBackendAccess(),
    fetchFromLink: await testFetchFromLink(),
    fetchFromLinkPDF: await testFetchFromLinkPDF(),
    fetchAndSimplify: await testFetchAndSimplify(),
    processInstructions: await testProcessInstructions(),
    cors: await testCORS(),
    imageProcessing: await testImageProcessing()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Your backend is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the details above for issues.');
  }
  
  return results;
}

// Run the tests
runAllTests().catch(console.error); 