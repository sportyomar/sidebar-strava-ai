from youtube_transcript_api import YouTubeTranscriptApi

video_id = "ROwf5jS1MZY"
transcript = YouTubeTranscriptApi.get_transcript(video_id)

for entry in transcript:
    print(entry['text'])
