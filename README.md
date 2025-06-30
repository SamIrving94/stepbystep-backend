# Accessible Instruction Assistant

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/samjlirving-gmailcoms-projects/v0-accessible-instruction-assistant)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/UjMNwm5pL0A)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[https://vercel.com/samjlirving-gmailcoms-projects/v0-accessible-instruction-assistant](https://vercel.com/samjlirving-gmailcoms-projects/v0-accessible-instruction-assistant)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/UjMNwm5pL0A](https://v0.dev/chat/projects/UjMNwm5pL0A)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

# StepByStep Backend API

A backend service for processing and simplifying complex instructions, optimized for users with dyslexia and ADHD.

## 🚀 Features

- **Instruction Processing**: Transform complex instructions into simple, step-by-step formats
- **Content Extraction**: Extract readable content from web pages
- **AI-Powered**: Uses OpenAI GPT-4 for intelligent text processing
- **Accessibility Focused**: Designed for users with dyslexia and ADHD

## 📡 API Endpoints

### POST /api/process-instructions
Processes complex instructions into simplified, accessible formats.

**Request Body:**
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

**Response:**
```json
{
  "success": true,
  "processedInstructions": {
    "title": "string",
    "category": "string",
    "difficulty": "string",
    "totalTime": "string",
    "ingredients": ["array of strings"],
    "tools": ["array of strings"],
    "warnings": ["array of strings"],
    "steps": [
      {
        "stepNumber": 1,
        "instruction": "string",
        "estimatedTime": "string",
        "tips": "string (optional)"
      }
    ]
  }
}
```

### POST /api/fetch-from-link
Extracts readable content from web pages.

**Request Body:**
```json
{
  "url": "string (required)"
}
```

**Response:**
```json
{
  "content": "string (extracted text)",
  "error": "string (if any)"
}
```

## 🛠️ Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set environment variables:**
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## 🌐 Deployment

This backend is designed to be deployed to Vercel, Railway, or any Node.js hosting platform.

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set the `OPENAI_API_KEY` environment variable
3. Deploy automatically on push to main branch

## 🔗 Frontend Integration

Your frontend (V0 or any other) can call these endpoints:

```javascript
// Process instructions
const response = await fetch('/api/process-instructions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rawText: 'Your complex instructions here...',
    title: 'Recipe Title',
    category: 'cooking'
  })
});

const result = await response.json();
```

## 📄 License

MIT License
