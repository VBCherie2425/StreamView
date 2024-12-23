from flask import Flask, request, jsonify, render_template, send_from_directory
import os
import json
from playlist_parser import StreamParser
from urllib.parse import urlparse

app = Flask(__name__)
parser = StreamParser()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/api/parse_playlist', methods=['POST'])
def parse_playlist():
    try:
        if 'file' in request.files:
            file = request.files['file']
            temp_path = os.path.join('uploads', file.filename)
            os.makedirs('uploads', exist_ok=True)
            file.save(temp_path)
            channels = parser.parse_playlist(temp_path)
            os.remove(temp_path)
        else:
            return jsonify({'error': 'No file provided'}), 400

        return jsonify({'channels': channels})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stream_info', methods=['POST'])
def stream_info():
    try:
        url = request.json.get('url')
        if not url:
            return jsonify({'error': 'No URL provided'}), 400

        info = parser.get_stream_info(url)
        return jsonify(info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/channels')
def get_channels():
    with open('static/data/channels.json', 'r') as f:
        data = json.load(f)
    return jsonify(data['live_tv'])

@app.route('/api/media')
def get_media():
    with open('static/data/channels.json', 'r') as f:
        data = json.load(f)
    return jsonify(data['media'])

@app.route('/api/guide')
def get_guide():
    with open('static/data/channels.json', 'r') as f:
        data = json.load(f)
    return jsonify(data['guide'])

@app.route('/api/streams', methods=['POST', 'DELETE'])
def manage_streams():
    with open('static/data/channels.json', 'r') as f:
        data = json.load(f)
    
    if request.method == 'POST':
        new_stream = request.json
        data['live_tv'].append({
            'name': new_stream['name'],
            'url': new_stream['url'],
            'category': new_stream['category'],
            'logo': new_stream.get('logo', '')
        })
    elif request.method == 'DELETE':
        stream_name = request.args.get('name')
        data['live_tv'] = [s for s in data['live_tv'] if s['name'] != stream_name]
    
    with open('static/data/channels.json', 'w') as f:
        json.dump(data, f, indent=4)
    
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
