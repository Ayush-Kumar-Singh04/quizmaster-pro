import { YoutubeTranscript } from 'youtube-transcript';

YoutubeTranscript.fetchTranscript('JtUAAXe_0VI').then(res => {
  console.log("Success! Length:", res.length);
  console.log("First line:", res[0].text);
}).catch(e => {
  console.error("Failed:", e);
});
