import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const handleMatch = url.match(/@([a-zA-Z0-9_-]+)/);
    if (!handleMatch) {
      return NextResponse.json({ error: "Invalid URL. Needs a channel handle (e.g., @mkbhd)" }, { status: 400 });
    }
    
    const handle = handleMatch[1];
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "Missing API Key" }, { status: 500 });

    // 1. Fetch Channel Info & Uploads Playlist ID
    const channelRes = await fetch(
      `https://youtube.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forHandle=${handle}&key=${apiKey}`
    );
    const channelData = await channelRes.json();

    if (!channelData.items || channelData.items.length === 0) {
      return NextResponse.json({ error: "Channel not found." }, { status: 404 });
    }

    const channel = channelData.items[0];
    const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;

    // 2. Fetch Latest 50 Videos from Uploads Playlist
    const playlistRes = await fetch(
      `https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`
    );
    const playlistData = await playlistRes.json();
    
    if (!playlistData.items) return NextResponse.json({ error: "No videos found" }, { status: 404 });

    const videoIds = playlistData.items.map((item: any) => item.contentDetails.videoId).join(',');

    // 3. Fetch Detailed Stats for those 50 Videos
    const videosRes = await fetch(
      `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${apiKey}`
    );
    const videosData = await videosRes.json();

    const formattedVideos = videosData.items.map((vid: any) => ({
      id: vid.id,
      title: vid.snippet.title,
      thumbnail: vid.snippet.thumbnails.medium?.url || vid.snippet.thumbnails.default?.url,
      publishedAt: vid.snippet.publishedAt,
      views: parseInt(vid.statistics.viewCount || "0"),
      likes: parseInt(vid.statistics.likeCount || "0"),
      comments: parseInt(vid.statistics.commentCount || "0"),
    }));

    return NextResponse.json({
      title: channel.snippet.title,
      description: channel.snippet.description,
      thumbnail: channel.snippet.thumbnails.high.url,
      stats: {
        subscribers: channel.statistics.subscriberCount,
        views: channel.statistics.viewCount,
        videos: channel.statistics.videoCount,
      },
      recentVideos: formattedVideos
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to analyze channel" }, { status: 500 });
  }
}