import os
import re
import json
import m3u8
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

class StreamParser:
    def __init__(self):
        self.supported_formats = {
            'youtube': r'(?:youtube\.com|youtu\.be)',
            'twitch': r'twitch\.tv',
            'acestream': r'^acestream://',
            'm3u': r'\.m3u$',
            'm3u8': r'\.m3u8$',
            'rtmp': r'^rtmp://'
        }

    def detect_stream_type(self, url):
        for stream_type, pattern in self.supported_formats.items():
            if re.search(pattern, url, re.I):
                return stream_type
        return 'direct'

    def parse_playlist(self, file_path):
        _, ext = os.path.splitext(file_path)
        if ext.lower() == '.m3u' or ext.lower() == '.m3u8':
            return self._parse_m3u(file_path)
        return []

    def _parse_m3u(self, file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            playlist = m3u8.loads(content)
            streams = []
            
            for segment in playlist.segments:
                stream = {
                    'title': segment.title or 'Untitled Stream',
                    'url': segment.uri,
                    'type': self.detect_stream_type(segment.uri)
                }
                streams.append(stream)
            
            return streams
        except Exception as e:
            print(f"Error parsing M3U playlist: {str(e)}")
            return []

    def get_stream_info(self, url):
        stream_type = self.detect_stream_type(url)
        info = {
            'url': url,
            'type': stream_type,
            'title': 'Unknown Stream',
            'thumbnail': None,
            'description': None
        }
        
        try:
            response = requests.get(url)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                info['title'] = soup.title.string if soup.title else 'Unknown Stream'
                meta_desc = soup.find('meta', {'name': 'description'})
                if meta_desc:
                    info['description'] = meta_desc.get('content')
                og_image = soup.find('meta', {'property': 'og:image'})
                if og_image:
                    info['thumbnail'] = og_image.get('content')
        except:
            pass
            
        return info

# Example usage
def main():
    parser = StreamParser()
    
    # Parse M3U
    with open('playlist.m3u', 'r') as f:
        channels = parser.parse_playlist('playlist.m3u')
    
    # Parse YouTube
    url = 'https://youtube.com/playlist?list=...'
    info = parser.get_stream_info(url)

if __name__ == '__main__':
    main()
