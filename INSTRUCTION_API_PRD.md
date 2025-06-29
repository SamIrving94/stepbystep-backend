# Instruction Processing API - Product Requirements Document

## 🎯 **Overview**
The Instruction Processing API is a core backend service that transforms complex, hard-to-follow instructions into simplified, accessible formats optimized for users with dyslexia and ADHD. This API serves as the foundation for making DIY and cooking instructions more manageable and user-friendly.

## 🏗️ **Technical Architecture**

### **API Endpoint**: `/api/process-instructions`
- **Method**: POST
- **Content-Type**: application/json
- **Response**: JSON

### **Dependencies**
- OpenAI API (GPT-4) or Claude API for AI processing
- Input validation and sanitization
- Error handling and logging

## 📋 **Core Functionality**

### **1. Input Processing**
**Accepts**:
- Raw instruction text (from manual, recipe, etc.)
- Optional metadata (title, category, difficulty level)
- User preferences (reading level, step granularity)

**Example Input**:
```json
{
  "rawText": "Preheat the oven to 350°F (175°C). In a large mixing bowl, combine 2 cups of all-purpose flour, 1 cup of granulated sugar, 1 teaspoon of baking powder, and 1/2 teaspoon of salt. Whisk the dry ingredients together until well combined...",
  "title": "Classic Chocolate Chip Cookies",
  "category": "baking",
  "difficulty": "beginner",
  "preferences": {
    "readingLevel": "simple",
    "stepGranularity": "detailed",
    "includeWarnings": true
  }
}
```

### **2. AI-Powered Processing**
**Transformation Tasks**:
- **Text Simplification**: Convert complex sentences to simple, clear language
- **Step Structuring**: Break down into numbered, sequential steps
- **Ingredient/Tool Extraction**: Identify and list required items
- **Warning Identification**: Highlight safety notes and important tips
- **Time Estimation**: Add approximate time for each step

**AI Prompt Strategy**:
```
You are an accessibility expert helping users with dyslexia and ADHD follow instructions. 
Transform the given instructions into a clear, step-by-step format:

1. Use short, simple sentences (max 15 words)
2. Number each step clearly
3. Extract and list all ingredients/tools at the beginning
4. Include safety warnings as separate bullet points
5. Add estimated time for each step
6. Use active voice and direct commands
7. Avoid jargon and complex terminology
```

### **3. Output Structure**
**Returns**:
```json
{
  "success": true,
  "processedInstructions": {
    "title": "Classic Chocolate Chip Cookies",
    "category": "baking",
    "difficulty": "beginner",
    "totalTime": "45 minutes",
    "ingredients": [
      "2 cups all-purpose flour",
      "1 cup granulated sugar",
      "1 teaspoon baking powder",
      "1/2 teaspoon salt"
    ],
    "tools": [
      "Large mixing bowl",
      "Whisk",
      "Oven",
      "Baking sheet"
    ],
    "warnings": [
      "Oven will be hot - use oven mitts",
      "Keep children away from hot surfaces"
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instruction": "Turn on oven to 350°F",
        "estimatedTime": "5 minutes",
        "tips": "Let oven heat up completely"
      },
      {
        "stepNumber": 2,
        "instruction": "Put flour, sugar, baking powder, and salt in bowl",
        "estimatedTime": "2 minutes",
        "tips": "Measure ingredients carefully"
      }
    ]
  }
}
```

## 🔧 **Implementation Requirements**

### **1. Error Handling**
- **Invalid Input**: Return 400 with clear error message
- **AI Service Unavailable**: Return 503 with fallback processing
- **Processing Timeout**: Return 408 with partial results if available
- **Rate Limiting**: Implement per-user request limits

### **2. Performance Requirements**
- **Response Time**: < 5 seconds for typical instructions
- **Concurrent Requests**: Support 100+ simultaneous users
- **Caching**: Cache processed results for identical inputs
- **Fallback**: Basic text processing if AI unavailable

### **3. Security Considerations**
- **Input Sanitization**: Prevent injection attacks
- **Rate Limiting**: Prevent abuse
- **API Key Management**: Secure AI service credentials
- **Data Privacy**: No persistent storage of user content

## 🧪 **Testing Strategy**

### **1. Unit Tests**
- Input validation
- AI prompt generation
- Response formatting
- Error handling

### **2. Integration Tests**
- End-to-end API calls
- AI service integration
- Performance under load

### **3. User Acceptance Tests**
- Test with real instruction manuals
- Validate accessibility improvements
- Measure comprehension improvements

## 📊 **Success Metrics**

### **1. Technical Metrics**
- API response time < 5 seconds
- 99.9% uptime
- < 1% error rate
- Successful processing rate > 95%

### **2. User Experience Metrics**
- Instruction clarity improvement (measured by user feedback)
- Step completion rate
- User satisfaction scores
- Accessibility compliance

## 🚀 **Implementation Phases**

### **Phase 1: Core Processing** (Week 1)
- Basic API endpoint setup
- AI integration for text simplification
- Step-by-step structuring
- Basic error handling

### **Phase 2: Enhanced Features** (Week 2)
- Ingredient/tool extraction
- Warning identification
- Time estimation
- Caching implementation

### **Phase 3: Optimization** (Week 3)
- Performance optimization
- Advanced error handling
- Rate limiting
- Comprehensive testing

### **Phase 4: Integration** (Week 4)
- Frontend integration testing
- User feedback incorporation
- Documentation completion
- Production deployment

## 🔗 **Integration Points**

### **Frontend Integration**
- V0 will call this API to process user-uploaded instructions
- Real-time processing during user input
- Cached results for improved performance

### **Other APIs**
- **TTS API**: Uses processed instructions for audio generation
- **Chat API**: Provides context for AI assistant responses
- **Image API**: Processes visual instructions alongside text

## 📝 **API Documentation**

### **Endpoint**: `POST /api/process-instructions`

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer <api-key> (optional)
```

**Request Body**:
```json
{
  "rawText": "string (required)",
  "title": "string (optional)",
  "category": "string (optional)",
  "difficulty": "beginner|intermediate|advanced (optional)",
  "preferences": {
    "readingLevel": "simple|standard|detailed (optional)",
    "stepGranularity": "basic|detailed|very-detailed (optional)",
    "includeWarnings": "boolean (optional)"
  }
}
```

**Response Codes**:
- `200`: Successfully processed
- `400`: Invalid input
- `408`: Processing timeout
- `503`: Service unavailable
- `429`: Rate limit exceeded

**Error Response Format**:
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": "Additional error information"
}
```

## 🎯 **Next Steps**
1. Set up OpenAI/Claude API integration
2. Create the basic API endpoint structure
3. Implement input validation
4. Build AI prompt engineering
5. Add error handling and testing
6. Integrate with frontend for testing

This API will serve as the foundation for transforming complex instructions into accessible, user-friendly formats that empower users with dyslexia and ADHD to successfully complete DIY and cooking tasks. 