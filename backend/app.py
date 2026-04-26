from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime
from config import DEADLINE

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = r"D:\8 Sem\software achitecture\assignment-monitor\nifi-data\submissions"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def home():
    return "Flask server is running!"

@app.route('/upload', methods=['POST'])
def upload_file():
    student_name = request.form.get('student_name', 'Unknown')
    student_id   = request.form.get('student_id',   'Unknown')
    file         = request.files.get('file')

    if not file or file.filename == '':
        return jsonify({'error': 'No file uploaded'}), 400

    now        = datetime.now()
    deadline   = datetime.strptime(DEADLINE, "%Y-%m-%d %H:%M:%S")
    is_on_time = now <= deadline

    status_tag = "ONTIME" if is_on_time else "LATE"

    # Get only the filename, strip any folder path inside it
    original_name = file.filename.replace('\\', '/').split('/')[-1]

    # Remove all special characters that break file paths
    safe_name = original_name.replace(' ', '_').replace('/', '_').replace('\\', '_').replace('(', '').replace(')', '')

    filename  = f"{status_tag}_{student_id}_{student_name}_{safe_name}"
    save_path = os.path.join(UPLOAD_FOLDER, filename)

    file.save(save_path)

    print(f"Saved: {filename} | On time: {is_on_time} | Time: {now}")

    return jsonify({
        'message':   'File received successfully',
        'filename':  filename,
        'on_time':   is_on_time,
        'submitted': str(now),
        'deadline':  DEADLINE
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)