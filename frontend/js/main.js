'use strict';
const CONFIG = {
  apiBase:      'http://localhost:5000',
  maxFileMB:    20,
  allowedExts:  ['.pdf', '.docx', '.zip'],
};

const state = {
  file: null,
};

let $form, $statusMsg,
    $studentName, $studentId, $studentEmail,
    $dropZone, $fileInput,
    $fileChip, $chipIcon, $chipName, $chipSize,
    $submitBtn, $btnSpinner, $btnText,
    $deadlineValue;

document.addEventListener('DOMContentLoaded', () => {
  resolveRefs();
  fetchDeadline();
  initDropZone();
  initValidationListeners();
  $form.addEventListener('submit', handleSubmit);
});

function resolveRefs() {
  $form          = document.getElementById('uploadForm');
  $statusMsg     = document.getElementById('statusMsg');
  $studentName   = document.getElementById('studentName');
  $studentId     = document.getElementById('studentId');
  $studentEmail  = document.getElementById('studentEmail');
  $dropZone      = document.getElementById('dropZone');
  $fileInput     = document.getElementById('fileInput');
  $fileChip      = document.getElementById('fileChip');
  $chipIcon      = document.getElementById('chipIcon');
  $chipName      = document.getElementById('chipName');
  $chipSize      = document.getElementById('chipSize');
  $submitBtn     = document.getElementById('submitBtn');
  $btnSpinner    = $submitBtn.querySelector('.btn-spinner');
  $btnText       = $submitBtn.querySelector('.btn-text');
  $deadlineValue = document.getElementById('deadlineValue');
}

async function fetchDeadline() {
  if (!$deadlineValue) return;

  try {
    const res  = await fetch(`${CONFIG.apiBase}/deadline`);
    const data = await res.json();
    const dt   = new Date(data.deadline);

    $deadlineValue.textContent = dt.toLocaleDateString('en-US', {
      month:  'short',
      day:    'numeric',
      year:   'numeric',
    }) + ' · ' + dt.toLocaleTimeString('en-US', {
      hour:   '2-digit',
      minute: '2-digit',
    });
  } catch {
    if ($deadlineValue) $deadlineValue.textContent = 'See course syllabus';
  }
}

function initDropZone() {
  $dropZone.addEventListener('click', (e) => {
    if (e.target !== $fileInput) $fileInput.click();
  });

  $dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    $dropZone.classList.add('drag-over');
  });

  ['dragleave', 'dragend'].forEach((evt) => {
    $dropZone.addEventListener(evt, () => $dropZone.classList.remove('drag-over'));
  });

  $dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    $dropZone.classList.remove('drag-over');
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) attachFile(droppedFile);
  });

  $fileInput.addEventListener('change', () => {
    if ($fileInput.files?.[0]) attachFile($fileInput.files[0]);
  });
}

const FILE_ICONS = { pdf: '📕', docx: '📘', zip: '🗜️' };

function attachFile(file) {
  const ext = getExt(file.name);

  if (!CONFIG.allowedExts.includes(ext)) {
    showStatus(`File type "${ext}" is not accepted. Use PDF, DOCX or ZIP.`, 'error');
    return;
  }

  if (file.size > CONFIG.maxFileMB * 1024 * 1024) {
    showStatus(`File exceeds the ${CONFIG.maxFileMB} MB limit.`, 'error');
    return;
  }

  state.file = file;
  clearFieldError('fileErr');

  $chipIcon.textContent = FILE_ICONS[ext.slice(1)] ?? '📄';
  $chipName.textContent = file.name;
  $chipSize.textContent = formatBytes(file.size);

  $dropZone.style.display = 'none';
  $fileChip.classList.add('visible');
}

function removeFile() {
  state.file         = null;
  $fileInput.value   = '';
  $dropZone.style.display = 'block';
  $fileChip.classList.remove('visible');
}

window.removeFile = removeFile;

const VALIDATORS = {
  studentName:  (v) => v.trim().length >= 2            || 'Please enter your full name.',
  studentId:    (v) => /^[A-Za-z0-9]{4,15}$/.test(v.trim()) || 'Enter a valid student ID (4–15 chars).',
  studentEmail: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Enter a valid email address.',
};

function initValidationListeners() {
  Object.keys(VALIDATORS).forEach((fieldId) => {
    const el = document.getElementById(fieldId);
    if (!el) return;
    el.addEventListener('input', () => validateField(fieldId));
    el.addEventListener('blur',  () => validateField(fieldId));
  });
}

function validateField(fieldId) {
  const el      = document.getElementById(fieldId);
  const errId   = fieldId + 'Err';
  const value   = el?.value ?? '';
  const result  = VALIDATORS[fieldId]?.(value);

  if (result === true) {
    el?.classList.remove('has-error');
    clearFieldError(errId);
    return true;
  } else {
    el?.classList.add('has-error');
    showFieldError(errId, result);
    return false;
  }
}

function validateAll() {
  const fieldResults = Object.keys(VALIDATORS).map(validateField);
  const fileOk = !!state.file;

  if (!fileOk) showFieldError('fileErr', 'Please attach a file.');
  else         clearFieldError('fileErr');

  return fieldResults.every(Boolean) && fileOk;
}

async function handleSubmit(e) {
  e.preventDefault();
  clearStatus();

  if (!validateAll()) return;

  setLoading(true);

  const formData = new FormData();
  formData.append('student_name',  $studentName.value.trim());
  formData.append('student_id',    $studentId.value.trim());
  formData.append('student_email', $studentEmail.value.trim());
  formData.append('file',          state.file);

  try {
    const res = await fetch(`${CONFIG.apiBase}/upload`, {
      method: 'POST',
      body:   formData,
    });

    if (!res.ok) throw new Error(`Server responded with ${res.status}`);

    const data = await res.json();
    handleSuccess(data);

  } catch (err) {
    console.error('[EduPortal] Upload failed:', err);
    showStatus(
      'Could not reach the server. Make sure Flask is running on port 5000.',
      'error'
    );
  } finally {
    setLoading(false);
  }
}

function handleSuccess(data) {
  if (data.on_time) {
    showStatus(
      '✓ Submitted on time — your file has been routed to the grading folder via NiFi.',
      'success'
    );
  } else {
    showStatus(
      '⚠ Received, but you missed the deadline. A warning email has been sent to your instructor.',
      'late'
    );
  }
  removeFile();
  $fileInput.value = '';
}

function setLoading(isLoading) {
  $submitBtn.disabled = isLoading;
  $submitBtn.classList.toggle('is-loading', isLoading);
  $btnText.textContent = isLoading ? 'Submitting…' : 'Submit Assignment';
}

function showStatus(message, type) {
  $statusMsg.textContent = message;
  $statusMsg.className   = `status-msg ${type}`;
  $statusMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearStatus() {
  $statusMsg.textContent = '';
  $statusMsg.className   = 'status-msg';
}

function showFieldError(errId, message) {
  const el = document.getElementById(errId);
  if (!el) return;
  el.textContent = message || el.textContent;
  el.classList.add('visible');
}

function clearFieldError(errId) {
  const el = document.getElementById(errId);
  if (!el) return;
  el.classList.remove('visible');
}

function getExt(filename) {
  return '.' + filename.split('.').pop().toLowerCase();
}

function formatBytes(bytes) {
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1_048_576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}