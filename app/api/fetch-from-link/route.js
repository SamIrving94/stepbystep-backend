import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import axios from 'axios';

export async function POST(request) {
  const { url } = await request.json();

  if (!url) {
    return new Response(JSON.stringify({ error: 'No URL provided' }), {
      status: 400,
    });
  }

  try {
    const page = await axios.get(url);
    const dom = new JSDOM(page.data);
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      return new Response(JSON.stringify({ error: 'Could not extract content' }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify({ content: article.textContent }), {
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
} 