export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>StepByStep Backend API</h1>
      <p>This is a backend-only API service for processing instructions.</p>
      
      <h2>Available Endpoints:</h2>
      <ul>
        <li><strong>POST /api/process-instructions</strong> - Process and simplify instructions</li>
        <li><strong>POST /api/fetch-from-link</strong> - Extract content from URLs</li>
      </ul>
      
      <h2>Status: ✅ Running</h2>
      <p>Your backend is ready to receive requests from your frontend.</p>
    </div>
  )
} 