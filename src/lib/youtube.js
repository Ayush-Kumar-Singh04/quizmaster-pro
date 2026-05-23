export async function getYoutubeTranscript(url) {
  try {
    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
    if (!videoIdMatch) throw new Error("Invalid YouTube URL");
    const videoId = videoIdMatch[1];
    
    // Call our local Vite API endpoint
    const response = await fetch(`/api/transcript?videoId=${videoId}`);
    
    if (!response.ok) {
        const err = await response.json().catch(()=>({}));
        throw new Error(err.error || `Server responded with ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.text) throw new Error("Transcript is empty.");
    return data.text;
  } catch (error) {
    throw new Error(`YouTube Extraction Failed: ${error.message}`);
  }
}
