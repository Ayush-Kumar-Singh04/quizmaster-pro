export async function getYoutubeTranscript(url) {
  try {
    // Robust YouTube Video ID regex matching standard, mobile, embed, and shorts URLs
    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?\/ ]{11})/);
    if (!videoIdMatch) throw new Error("Invalid YouTube URL");
    const videoId = videoIdMatch[1];
    
    let text = "";
    
    // 1. Try local dev endpoint first
    try {
      const response = await fetch(`/api/transcript?videoId=${videoId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.text) text = data.text;
      }
    } catch (e) {
      console.warn("Local API transcript fetch failed, trying fallback public API...", e);
    }
    
    // 2. Fallback to public CORS-friendly API
    if (!text) {
      const fallbackResponse = await fetch(`https://youtube-transcript.ai/transcript/${videoId}.txt`);
      if (!fallbackResponse.ok) {
        throw new Error(`Public API extraction failed with status ${fallbackResponse.status}`);
      }
      const rawText = await fallbackResponse.text();
      
      // Clean up headers and timestamp formatting from the public API output
      let transcriptText = rawText;
      const transcriptIndex = rawText.indexOf("## Transcript");
      if (transcriptIndex !== -1) {
        transcriptText = rawText.slice(transcriptIndex + "## Transcript".length);
      }
      
      const footerIndex = transcriptText.indexOf("---");
      if (footerIndex !== -1) {
        transcriptText = transcriptText.slice(0, footerIndex);
      }
      
      // Remove timestamp brackets like [0:02] and extra whitespace
      text = transcriptText
        .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, "")
        .replace(/\s+/g, " ")
        .trim();
        
      if (!text) throw new Error("Transcript was empty from fallback API.");
    }
    
    return text;
  } catch (error) {
    throw new Error(`YouTube Extraction Failed: ${error.message}`);
  }
}
