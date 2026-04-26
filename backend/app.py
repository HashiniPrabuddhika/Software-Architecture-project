from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import re
from datetime import datetime
from config import DEADLINE

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER  = r"D:\8 Sem\software achitecture\assignment-monitor\nifi-data\submissions"
GRADING_FOLDER = r"D:\8 Sem\software achitecture\assignment-monitor\nifi-data\grading"
LATE_FOLDER    = r"D:\8 Sem\software achitecture\assignment-monitor\nifi-data\late_submissions"

os.makedirs(UPLOAD_FOLDER,  exist_ok=True)
os.makedirs(GRADING_FOLDER, exist_ok=True)
os.makedirs(LATE_FOLDER,    exist_ok=True)

@app.route('/')
def home():
    return "Flask server is running!"

@app.route('/upload', methods=['POST'])
def upload_file():
    student_name = request.form.get('student_name', 'Unknown').replace('/', '_').replace('\\', '_')
    student_id   = request.form.get('student_id',   'Unknown').replace('/', '_').replace('\\', '_')
    file         = request.files.get('file')

    if not file or file.filename == '':
        return jsonify({'error': 'No file uploaded'}), 400

    now        = datetime.now()
    deadline   = datetime.strptime(DEADLINE, "%Y-%m-%d %H:%M:%S")
    is_on_time = now <= deadline
    status_tag = "ONTIME" if is_on_time else "LATE"

    raw_name = file.filename
    raw_name = raw_name.replace('\\', '/')
    raw_name = raw_name.split('/')[-1]  

    safe_name = re.sub(r'[^\w\.\-]', '_', raw_name)

    filename  = f"{status_tag}_{student_id}_{student_name}_{safe_name}"
    save_path = os.path.join(UPLOAD_FOLDER, filename)

    print(f"DEBUG raw filename from browser: {file.filename}")
    print(f"DEBUG safe filename: {filename}")
    print(f"DEBUG save path: {save_path}")

    file.save(save_path)

    print(f"SUCCESS: Saved {filename} | On time: {is_on_time}")

    return jsonify({
        'message':   'File received successfully',
        'filename':  filename,
        'on_time':   is_on_time,
        'submitted': str(now),
        'deadline':  DEADLINE
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)