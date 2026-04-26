document.getElementById('uploadForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const name    = document.getElementById('studentName').value;
  const id      = document.getElementById('studentId').value;
  const file    = document.getElementById('fileInput').files[0];
  const msg     = document.getElementById('statusMsg');

  // Reset status
  msg.className = '';
  msg.textContent = 'Uploading...';
  msg.style.display = 'block';

  try {
    const formData = new FormData();
    formData.append('student_name', name);
    formData.append('student_id',   id);
    formData.append('file',         file);

    const response = await fetch('http://localhost:5000/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.on_time) {
      msg.className   = 'success';
      msg.textContent = '✓ Submitted on time! Your file has been sent to grading.';
    } else {
      msg.className   = 'late';
      msg.textContent = '⚠ File received but you are LATE. A warning email has been sent.';
    }

  } catch (err) {
    msg.className   = 'error';
    msg.textContent = 'Could not connect to server. Make sure Flask is running.';
  }
});