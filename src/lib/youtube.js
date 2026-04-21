// Note: Fetching transcripts often requires reading the ytInitialPlayerResponse from the HTML page or using a specialized API endpoint.

export async function fetchTranscript(videoUrl) {
  try {
    const response = await fetch(videoUrl);
    const html = await response.text();

    // Strategy 1: Find ytInitialPlayerResponse JSON payload
    const jsonMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*var/);
    if (!jsonMatch) {
      throw new Error('Could not find player response data. The structure may have changed or captions are turned off.');
    }

    const playerResponse = JSON.parse(jsonMatch[1]);
    const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!tracks || tracks.length === 0) {
      throw new Error('No caption tracks found for this video.');
    }

    // Default to the first available track (usually English if available)
    const transcriptUrl = tracks[0].baseUrl;
    const transcriptResponse = await fetch(transcriptUrl);
    const transcriptXml = await transcriptResponse.text();

    const textSegments = parseTranscriptXml(transcriptXml);
    return textSegments;
  } catch (error) {
    console.error('Failed fetching transcript:', error);
    throw error;
  }
}

function parseTranscriptXml(xmlStr) {
  // Simple regex parsing of the yt transcript XML format
  // Format: <text start="0" dur="4.23">Hello world</text>
  const textRegex = /<text start="([\d.]+)" dur="([\d.]+)">([^<]+)<\/text>/g;
  let match;
  const segments = [];

  while ((match = textRegex.exec(xmlStr)) !== null) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    let text = match[3]
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"');

    segments.push({
      start,
      duration,
      text: text.trim()
    });
  }

  return segments;
}

// Convert seconds into [H:]MM:SS for formatting
export function formatTime(seconds) {
  const date = new Date(null);
  date.setSeconds(Math.floor(seconds));
  if (seconds >= 3600) {
    return date.toISOString().substr(11, 8);
  }
  return date.toISOString().substr(14, 5);
}
