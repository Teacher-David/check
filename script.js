let videoAttendance, videoRegister, canvasAttendance, canvasRegister, loading;
let btnCapture, inputName, inputNumber, registerStatus, attendanceStatus, logList, userTableBody;
let navAttendance, navRegister, navUserList, navMonthStatus, navDataMgmt;
let sectionAttendance, sectionRegister, sectionUserList, sectionMonthStatus, sectionDataMgmt;

document.addEventListener('DOMContentLoaded', () => {
    videoAttendance = document.getElementById('attendance-video');
    videoRegister = document.getElementById('register-video');
    canvasAttendance = document.getElementById('attendance-canvas');
    canvasRegister = document.getElementById('register-canvas');
    loading = document.getElementById('loading');

    btnCapture = document.getElementById('btn-capture');
    inputName = document.getElementById('user-name');
    inputNumber = document.getElementById('user-number');
    registerStatus = document.getElementById('register-status');
    attendanceStatus = document.getElementById('attendance-status');
    logList = document.getElementById('log-list');
    userTableBody = document.getElementById('user-table-body');

    navAttendance = document.getElementById('nav-attendance');
    navRegister = document.getElementById('nav-register');
    navUserList = document.getElementById('nav-user-list');
    navMonthStatus = document.getElementById('nav-month-status');
    navDataMgmt = document.getElementById('nav-data-mgmt');

    sectionAttendance = document.getElementById('attendance-section');
    sectionRegister = document.getElementById('register-section');
    sectionUserList = document.getElementById('user-list-section');
    sectionMonthStatus = document.getElementById('month-status-section');
    sectionDataMgmt = document.getElementById('data-mgmt-section');

    // Check for missing elements
    if (!inputNumber) console.error('Element #user-number not found!');
    if (!inputName) console.error('Element #user-name not found!');

    // Initialize Event Listeners
    initEventListeners();
});

function initEventListeners() {
    // Navigation Logic
    navAttendance.addEventListener('click', () => {
        switchSection('attendance-section');
    });

    navRegister.addEventListener('click', () => {
        switchSection('register-section');
    });

    navUserList.addEventListener('click', () => {
        switchSection('user-list-section');
        stopVideo(videoAttendance);
        stopVideo(videoRegister);
        renderUserList();
    });

    if (navMonthStatus) {
        navMonthStatus.addEventListener('click', () => {
            switchSection('month-status-section');
            stopVideo(videoAttendance);
            stopVideo(videoRegister);
            renderMonthStatus();
        });
    }

    if (navDataMgmt) {
        navDataMgmt.addEventListener('click', () => {
            switchSection('data-mgmt-section');
            stopVideo(videoAttendance);
            stopVideo(videoRegister);
        });
    }

    // Registration Tab Switching
    const tabCapture = document.getElementById('tab-capture');
    const tabUpload = document.getElementById('tab-upload');
    const captureMode = document.getElementById('register-capture-mode');
    const uploadMode = document.getElementById('register-upload-mode');

    if (tabCapture && tabUpload) {
        tabCapture.addEventListener('click', () => {
            tabCapture.classList.add('active');
            tabUpload.classList.remove('active');
            captureMode.classList.add('active');
            uploadMode.classList.remove('active');
            startVideo(videoRegister);
        });

        tabUpload.addEventListener('click', () => {
            tabUpload.classList.add('active');
            tabCapture.classList.remove('active');
            uploadMode.classList.add('active');
            captureMode.classList.remove('active');
            stopVideo(videoRegister);
        });
    }

    // Photo Upload Logic
    const uploadContainer = document.querySelector('.upload-preview-container');
    const uploadInput = document.getElementById('upload-input');
    const uploadPreview = document.getElementById('upload-preview');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const btnUploadRegister = document.getElementById('btn-upload-register');
    const uploadStatus = document.getElementById('upload-status');

    if (uploadContainer && uploadInput) {
        uploadContainer.addEventListener('click', () => {
            uploadInput.click();
        });

        uploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    uploadPreview.src = event.target.result;
                    uploadPreview.style.display = 'block';
                    uploadPlaceholder.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (btnUploadRegister) {
        btnUploadRegister.addEventListener('click', async () => {
            const uploadUserNumber = document.getElementById('upload-user-number');
            const uploadUserName = document.getElementById('upload-user-name');

            if (!uploadUserNumber.value || !uploadUserName.value) {
                uploadStatus.innerText = '이름과 번호를 모두 입력해주세요.';
                uploadStatus.style.color = 'red';
                return;
            }

            if (!uploadPreview.src || uploadPreview.style.display === 'none') {
                uploadStatus.innerText = '사진을 먼저 선택해주세요.';
                uploadStatus.style.color = 'red';
                return;
            }

            // Check for duplicate number
            const users = JSON.parse(localStorage.getItem('faceCheckUsers')) || [];
            const existingUser = users.find(u => u.number === uploadUserNumber.value);
            if (existingUser) {
                uploadStatus.innerText = `이미 등록된 번호입니다 (${existingUser.name}).`;
                uploadStatus.style.color = 'red';
                return;
            }

            btnUploadRegister.innerText = '등록 중...';
            btnUploadRegister.disabled = true;
            uploadStatus.innerText = '얼굴 인식 중...';
            uploadStatus.style.color = 'blue';

            try {
                // Create image element for face detection
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = uploadPreview.src;

                await new Promise((resolve) => {
                    img.onload = resolve;
                });

                const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detections) {
                    const descriptor = detections.descriptor;

                    // Check for duplicate face
                    if (labeledFaceDescriptors.length > 0) {
                        const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.3);
                        const bestMatch = faceMatcher.findBestMatch(descriptor);

                        if (bestMatch.label !== 'unknown') {
                            uploadStatus.innerText = `이미 등록된 얼굴입니다 (${bestMatch.label})`;
                            uploadStatus.style.color = 'red';
                            btnUploadRegister.innerText = '사진으로 등록';
                            btnUploadRegister.disabled = false;
                            return;
                        }
                    }

                    const user = {
                        number: uploadUserNumber.value,
                        name: uploadUserName.value,
                        descriptor: Array.from(descriptor),
                        date: new Date().toISOString().split('T')[0]
                    };

                    saveUser(user);

                    uploadStatus.innerText = `${user.name} 등록 완료!`;
                    uploadStatus.style.color = 'green';
                    uploadUserNumber.value = '';
                    uploadUserName.value = '';
                    uploadPreview.src = '';
                    uploadPreview.style.display = 'none';
                    uploadPlaceholder.style.display = 'flex';
                    uploadInput.value = '';
                } else {
                    uploadStatus.innerText = '얼굴을 찾을 수 없습니다. 다른 사진을 선택해주세요.';
                    uploadStatus.style.color = 'red';
                }
            } catch (err) {
                console.error(err);
                uploadStatus.innerText = '오류가 발생했습니다.';
                uploadStatus.style.color = 'red';
            }

            btnUploadRegister.innerText = '사진으로 등록';
            btnUploadRegister.disabled = false;
        });
    }

    // Registration Logic - Multi-step (Front, Left, Right)
    btnCapture.addEventListener('click', async () => {
        if (!inputName || !inputNumber) {
            console.error('Inputs not initialized');
            return;
        }
        if (!inputName.value || !inputNumber.value) {
            registerStatus.innerText = '이름과 번호를 모두 입력해주세요.';
            registerStatus.style.color = 'red';
            return;
        }

        // 1. Check for duplicates BEFORE face detection
        const users = JSON.parse(localStorage.getItem('faceCheckUsers')) || [];
        const existingUser = users.find(u => u.number === inputNumber.value);
        if (existingUser) {
            registerStatus.innerText = `이미 등록된 번호입니다 (${existingUser.name}).`;
            registerStatus.style.color = 'red';
            inputNumber.focus();
            return;
        }

        // 2. UI Loading State
        const originalBtnText = btnCapture.innerText;
        btnCapture.innerText = '등록 중...';
        btnCapture.disabled = true;
        btnCapture.style.backgroundColor = '#95a5a6';

        const steps = [
            { name: '정면', instruction: '📷 정면을 바라봐주세요...', direction: 'front' },
            { name: '좌측', instruction: '👈 고개를 왼쪽으로 살짝 돌려주세요...', direction: 'left' },
            { name: '우측', instruction: '👉 고개를 오른쪽으로 살짝 돌려주세요...', direction: 'right' }
        ];

        const descriptors = [];
        let registrationCancelled = false;

        // Function to detect head direction using landmarks
        function getHeadDirection(landmarks) {
            const nose = landmarks.getNose();
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();

            // Get center points
            const noseX = nose.reduce((sum, p) => sum + p.x, 0) / nose.length;
            const leftEyeX = leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length;
            const rightEyeX = rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length;

            // Calculate eye center
            const eyeCenterX = (leftEyeX + rightEyeX) / 2;
            const eyeDistance = Math.abs(rightEyeX - leftEyeX);

            // Calculate nose offset from eye center (as ratio of eye distance)
            const noseOffset = (noseX - eyeCenterX) / eyeDistance;

            // Thresholds for direction detection
            if (noseOffset < -0.15) {
                return 'left';  // Nose is left of center → person looking left
            } else if (noseOffset > 0.15) {
                return 'right'; // Nose is right of center → person looking right
            } else {
                return 'front';
            }
        }

        try {
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                registerStatus.innerText = `[${i + 1}/3] ${step.instruction}`;
                registerStatus.style.color = 'blue';

                // Wait for face detection with correct direction
                let detected = false;
                let attempts = 0;
                const maxAttempts = 100; // 10 seconds max per step

                while (!detected && attempts < maxAttempts) {
                    const detections = await faceapi.detectSingleFace(videoRegister, new faceapi.TinyFaceDetectorOptions())
                        .withFaceLandmarks()
                        .withFaceDescriptor();

                    if (detections) {
                        const currentDirection = getHeadDirection(detections.landmarks);

                        // Check if direction matches expected
                        if (currentDirection === step.direction) {
                            // Check for duplicate face on first detection only
                            if (i === 0 && labeledFaceDescriptors.length > 0) {
                                const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.3);
                                const bestMatch = faceMatcher.findBestMatch(detections.descriptor);

                                if (bestMatch.label !== 'unknown') {
                                    registerStatus.innerText = `이미 등록된 사용자입니다: ${bestMatch.label}`;
                                    registerStatus.style.color = 'red';
                                    registrationCancelled = true;
                                    break;
                                }
                            }

                            descriptors.push(detections.descriptor);
                            registerStatus.innerText = `✅ ${step.name} 촬영 완료!`;
                            registerStatus.style.color = 'green';
                            detected = true;

                            // Brief pause before next step
                            if (i < steps.length - 1) {
                                await new Promise(resolve => setTimeout(resolve, 800));
                            }
                        } else {
                            // Face detected but wrong direction
                            attempts++;
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                    } else {
                        attempts++;
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }

                if (registrationCancelled) break;

                if (!detected) {
                    registerStatus.innerText = `${step.name}을 인식하지 못했습니다. 다시 시도해주세요.`;
                    registerStatus.style.color = 'red';
                    return;
                }
            }

            if (!registrationCancelled && descriptors.length === 3) {
                const userData = {
                    name: inputName.value,
                    number: inputNumber.value,
                    date: new Date().toLocaleDateString(),
                    descriptors: descriptors.map(d => Array.from(d)) // Store all 3
                };

                saveUser(userData);
                registerStatus.innerText = `🎉 등록 완료: ${userData.number}번 ${userData.name}`;
                registerStatus.style.color = 'green';
                inputName.value = '';
                inputNumber.value = '';

                loadLabeledImages();
            }
        } catch (error) {
            console.error(error);
            registerStatus.innerText = '오류가 발생했습니다. 다시 시도해주세요.';
            registerStatus.style.color = 'red';
        } finally {
            btnCapture.innerText = originalBtnText;
            btnCapture.disabled = false;
            btnCapture.style.backgroundColor = '';
        }
    });

    // Load Models
    Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models'),
        faceapi.nets.ssdMobilenetv1.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models')
    ]).then(startApp);

    // Attendance Logic with Multi-frame Confirmation
    const recognitionBuffer = new Map(); // Track consecutive recognitions per person
    const REQUIRED_FRAMES = 5; // Number of consecutive frames needed for confirmation
    const BUFFER_TIMEOUT = 2000; // Reset buffer after 2 seconds of no detection

    videoAttendance.addEventListener('play', () => {
        const canvas = canvasAttendance;
        const displaySize = { width: videoAttendance.width || 640, height: videoAttendance.height || 480 };
        faceapi.matchDimensions(canvas, displaySize);

        setInterval(async () => {
            if (!isModelLoaded || labeledFaceDescriptors.length === 0 || sectionAttendance.style.display === 'none') return;

            const detections = await faceapi.detectAllFaces(videoAttendance, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();

            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

            const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.45);

            const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor));
            const currentTime = Date.now();
            const detectedLabels = new Set();

            results.forEach((result, i) => {
                const box = resizedDetections[i].detection.box;
                // Mirror box for drawing (since video is CSS mirrored)
                const mirroredBox = {
                    x: displaySize.width - box.x - box.width,
                    y: box.y,
                    width: box.width,
                    height: box.height
                };

                const ctx = canvas.getContext('2d');
                const isRecognized = result.label !== 'unknown';

                // Multi-frame tracking
                let frameCount = 0;
                let isConfirmed = false;

                if (isRecognized) {
                    detectedLabels.add(result.label);

                    // Update recognition buffer
                    if (recognitionBuffer.has(result.label)) {
                        const data = recognitionBuffer.get(result.label);
                        data.count++;
                        data.lastSeen = currentTime;
                        frameCount = data.count;
                    } else {
                        recognitionBuffer.set(result.label, { count: 1, lastSeen: currentTime });
                        frameCount = 1;
                    }

                    isConfirmed = frameCount >= REQUIRED_FRAMES;

                    // Only mark attendance after multi-frame confirmation
                    if (isConfirmed) {
                        markAttendance(result.label);
                    }
                }

                // Visual feedback based on confirmation status
                let boxColor, displayLabel;
                if (!isRecognized) {
                    boxColor = '#FF6347'; // Red for unknown
                    displayLabel = result.toString();
                } else if (isConfirmed) {
                    boxColor = '#32CD32'; // Green for confirmed
                    displayLabel = `✓ ${result.label}`;
                } else {
                    boxColor = '#FFA500'; // Orange for pending confirmation
                    displayLabel = `${result.label} (${frameCount}/${REQUIRED_FRAMES})`;
                }

                // Draw box
                ctx.strokeStyle = boxColor;
                ctx.lineWidth = 2;
                ctx.strokeRect(mirroredBox.x, mirroredBox.y, mirroredBox.width, mirroredBox.height);

                // Draw label background
                ctx.font = '16px sans-serif';
                const textWidth = ctx.measureText(displayLabel).width;
                const textHeight = 20;
                const textX = mirroredBox.x;
                const textY = mirroredBox.y - textHeight;

                ctx.fillStyle = boxColor;
                ctx.fillRect(textX, textY, textWidth + 8, textHeight);

                // Draw text (flip back to normal since canvas is CSS mirrored)
                ctx.save();
                ctx.scale(-1, 1);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(displayLabel, -(textX + textWidth + 4), textY + 15);
                ctx.restore();
            });

            // Clean up old entries from buffer (reset if not seen recently)
            for (const [label, data] of recognitionBuffer.entries()) {
                if (!detectedLabels.has(label) && currentTime - data.lastSeen > BUFFER_TIMEOUT) {
                    recognitionBuffer.delete(label);
                }
            }
        }, 100);
    });

    // Add event listener for month navigation
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');

    if (prevMonthBtn && nextMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentMonthDate.setMonth(currentMonthDate.getMonth() - 1);
            renderMonthStatus();
        });

        nextMonthBtn.addEventListener('click', () => {
            currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
            renderMonthStatus();
        });
    }

    // Data Management Logic
    const btnExportData = document.getElementById('btn-export-data');
    const btnImportData = document.getElementById('btn-import-data');
    const fileImportData = document.getElementById('file-import-data');

    if (btnExportData) {
        btnExportData.addEventListener('click', exportData);
    }

    if (btnImportData && fileImportData) {
        btnImportData.addEventListener('click', () => {
            fileImportData.click();
        });

        fileImportData.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                importData(file);
            }
            // Reset input so same file can be selected again if needed
            e.target.value = '';
        });
    }
}

let labeledFaceDescriptors = [];
let isModelLoaded = false;
let attendanceGrid;

function switchSection(sectionId) {
    // Stop video if leaving register section
    if (sectionId !== 'register-section') {
        stopVideo(videoRegister);
    }

    // Stop video if leaving attendance section
    if (sectionId !== 'attendance-section') {
        stopVideo(videoAttendance);
    }

    // Hide all sections
    sectionAttendance.classList.remove('active-section');
    sectionRegister.classList.remove('active-section');
    sectionUserList.classList.remove('active-section');
    sectionMonthStatus.classList.remove('active-section');
    if (sectionDataMgmt) sectionDataMgmt.classList.remove('active-section');

    // Deactivate all nav buttons
    navAttendance.classList.remove('active');
    navRegister.classList.remove('active');
    navUserList.classList.remove('active');
    navMonthStatus.classList.remove('active');
    if (navDataMgmt) navDataMgmt.classList.remove('active');

    // Show selected section
    if (sectionId === 'attendance-section') {
        sectionAttendance.classList.add('active-section');
        navAttendance.classList.add('active');
        startVideo(videoAttendance);
        renderAttendanceGrid();
    } else if (sectionId === 'register-section') {
        sectionRegister.classList.add('active-section');
        navRegister.classList.add('active');
        startVideo(videoRegister);
    } else if (sectionId === 'user-list-section') {
        sectionUserList.classList.add('active-section');
        navUserList.classList.add('active');
        renderUserList();
    } else if (sectionId === 'month-status-section') {
        sectionMonthStatus.classList.add('active-section');
        navMonthStatus.classList.add('active');
        renderMonthStatus();
    } else if (sectionId === 'data-mgmt-section') {
        if (sectionDataMgmt) sectionDataMgmt.classList.add('active-section');
        if (navDataMgmt) navDataMgmt.classList.add('active');
    }
}

// Load Models
// Load Models



async function startApp() {
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');

    if (prevMonthBtn && nextMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentMonthDate.setMonth(currentMonthDate.getMonth() - 1);
            renderMonthStatus();
        });

        nextMonthBtn.addEventListener('click', () => {
            currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
            renderMonthStatus();
        });
    }

    isModelLoaded = true;
    loading.style.display = 'none';
    loadLabeledImages();
    renderAttendanceGrid(); // Initial render
    startVideo(videoAttendance);
}

function startVideo(videoElement) {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => {
            videoElement.srcObject = stream;
        })
        .catch(err => {
            console.error(err);
            let msg = '카메라 접근 권한이 필요합니다.';
            if (err.name === 'NotAllowedError') {
                msg = '카메라 접근이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.';
            } else if (err.name === 'NotFoundError') {
                msg = '카메라를 찾을 수 없습니다.';
            }

            alert(msg);

            // Optional: Update status text if available
            if (videoElement.id === 'attendance-video' && attendanceStatus) {
                attendanceStatus.innerText = msg;
                attendanceStatus.style.color = 'red';
            } else if (videoElement.id === 'register-video' && registerStatus) {
                registerStatus.innerText = msg;
                registerStatus.style.color = 'red';
            }
        });
}

function stopVideo(videoElement) {
    const stream = videoElement.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
    }
}

function saveUser(user) {
    let users = JSON.parse(localStorage.getItem('faceCheckUsers')) || [];
    users.push(user);
    users.sort((a, b) => parseInt(a.number) - parseInt(b.number));
    localStorage.setItem('faceCheckUsers', JSON.stringify(users));

    // Update in-memory descriptors (support both old 'descriptor' and new 'descriptors' format)
    const descriptorArrays = user.descriptors
        ? user.descriptors.map(d => new Float32Array(d))
        : [new Float32Array(Object.values(user.descriptor))];

    const newDescriptor = new faceapi.LabeledFaceDescriptors(
        `${user.number}. ${user.name}`,
        descriptorArrays
    );
    labeledFaceDescriptors.push(newDescriptor);

    renderAttendanceGrid(); // Update grid when new user is added
}

function loadLabeledImages() {
    const users = JSON.parse(localStorage.getItem('faceCheckUsers')) || [];
    labeledFaceDescriptors = users.map(user => {
        // Support both old 'descriptor' and new 'descriptors' format
        const descriptorArrays = user.descriptors
            ? user.descriptors.map(d => new Float32Array(d))
            : [new Float32Array(user.descriptor)];

        return new faceapi.LabeledFaceDescriptors(
            `${user.number}. ${user.name}`,
            descriptorArrays
        );
    });
}

function renderUserList() {
    const users = JSON.parse(localStorage.getItem('faceCheckUsers')) || [];
    userTableBody.innerHTML = '';

    if (users.length === 0) {
        userTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">등록된 사용자가 없습니다.</td></tr>';
        return;
    }

    users.forEach((user, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.number}</td>
            <td>${user.name}</td>
            <td>${user.date || '-'}</td>
            <td>
                <button class="btn-reset-face" onclick="openFaceResetModal(${index})">얼굴재설정</button>
                <button class="btn-edit-info" onclick="openEditInfoModal(${index})">정보수정</button>
                <button class="btn-delete" onclick="deleteUser(${index})">삭제</button>
            </td>
        `;
        userTableBody.appendChild(tr);
    });
}

let pendingDeleteUserIndex = null;

window.deleteUser = function (index) {
    const users = JSON.parse(localStorage.getItem('faceCheckUsers')) || [];
    const user = users[index];
    if (!user) return;

    pendingDeleteUserIndex = index;

    // Show modal
    const modal = document.getElementById('delete-user-modal');
    const targetName = document.getElementById('delete-user-target-name');
    const input = document.getElementById('delete-user-confirm-input');
    const confirmBtn = document.getElementById('btn-confirm-delete-user');

    targetName.innerText = user.name;
    input.value = '';
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';
    confirmBtn.style.cursor = 'not-allowed';
    modal.style.display = 'flex';
};

window.closeDeleteUserModal = function () {
    const modal = document.getElementById('delete-user-modal');
    modal.style.display = 'none';
    pendingDeleteUserIndex = null;
};

// Individual delete input validation
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('delete-user-confirm-input');
    const confirmBtn = document.getElementById('btn-confirm-delete-user');

    if (input && confirmBtn) {
        input.addEventListener('input', () => {
            const targetName = document.getElementById('delete-user-target-name').innerText;
            if (input.value === targetName) {
                confirmBtn.disabled = false;
                confirmBtn.style.opacity = '1';
                confirmBtn.style.cursor = 'pointer';
            } else {
                confirmBtn.disabled = true;
                confirmBtn.style.opacity = '0.5';
                confirmBtn.style.cursor = 'not-allowed';
            }
        });

        confirmBtn.addEventListener('click', () => {
            if (pendingDeleteUserIndex === null) return;

            let users = JSON.parse(localStorage.getItem('faceCheckUsers')) || [];
            const user = users[pendingDeleteUserIndex];
            if (!user) return;

            const userKey = `${user.number}. ${user.name}`;

            // 1. Remove user from users list
            users.splice(pendingDeleteUserIndex, 1);
            localStorage.setItem('faceCheckUsers', JSON.stringify(users));

            // 2. Remove all attendance history for this user
            let history = JSON.parse(localStorage.getItem('faceCheckHistory')) || {};
            for (const date in history) {
                if (history[date][userKey]) {
                    delete history[date][userKey];
                }
                // Clean up empty dates
                if (Object.keys(history[date]).length === 0) {
                    delete history[date];
                }
            }
            localStorage.setItem('faceCheckHistory', JSON.stringify(history));

            // 3. Update in-memory data
            labeledFaceDescriptors = labeledFaceDescriptors.filter(desc => desc.label !== userKey);

            // 4. Re-render
            renderUserList();
            renderAttendanceGrid();
            renderMonthStatus();

            closeDeleteUserModal();
            alert(`${user.name} 학생의 모든 데이터가 삭제되었습니다.`);
        });
    }
});

// Face Reset Modal Logic
let pendingResetUserIndex = null;
let resetVideoStream = null;

window.openFaceResetModal = function (index) {
    const users = JSON.parse(localStorage.getItem('faceCheckUsers')) || [];
    const user = users[index];
    if (!user) return;

    pendingResetUserIndex = index;

    const modal = document.getElementById('face-reset-modal');
    const userInfo = document.getElementById('face-reset-user-info');
    const resetStatus = document.getElementById('reset-status');

    userInfo.innerText = `${user.number}번 ${user.name}`;
    resetStatus.innerText = '';

    // Reset to capture mode by default
    document.getElementById('reset-tab-capture').classList.add('active');
    document.getElementById('reset-tab-upload').classList.remove('active');
    document.getElementById('reset-capture-mode').classList.add('active');
    document.getElementById('reset-upload-mode').classList.remove('active');

    // Clear upload preview
    const uploadPreview = document.getElementById('reset-upload-preview');
    const uploadPlaceholder = document.getElementById('reset-upload-placeholder');
    uploadPreview.style.display = 'none';
    uploadPlaceholder.style.display = 'flex';

    modal.style.display = 'flex';

    // Start camera
    startResetCamera();
};

window.closeFaceResetModal = function () {
    const modal = document.getElementById('face-reset-modal');
    modal.style.display = 'none';
    pendingResetUserIndex = null;
    stopResetCamera();
};

function startResetCamera() {
    const video = document.getElementById('reset-video');
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => {
            resetVideoStream = stream;
            video.srcObject = stream;
        })
        .catch(err => {
            console.error(err);
            document.getElementById('reset-status').innerText = '카메라를 사용할 수 없습니다.';
            document.getElementById('reset-status').style.color = 'red';
        });
}

function stopResetCamera() {
    if (resetVideoStream) {
        resetVideoStream.getTracks().forEach(track => track.stop());
        resetVideoStream = null;
    }
}

// Reset Tab Switching
document.addEventListener('DOMContentLoaded', () => {
    const tabCapture = document.getElementById('reset-tab-capture');
    const tabUpload = document.getElementById('reset-tab-upload');
    const captureMode = document.getElementById('reset-capture-mode');
    const uploadMode = document.getElementById('reset-upload-mode');

    if (tabCapture && tabUpload) {
        tabCapture.addEventListener('click', () => {
            tabCapture.classList.add('active');
            tabUpload.classList.remove('active');
            captureMode.classList.add('active');
            uploadMode.classList.remove('active');
            startResetCamera();
        });

        tabUpload.addEventListener('click', () => {
            tabUpload.classList.add('active');
            tabCapture.classList.remove('active');
            uploadMode.classList.add('active');
            captureMode.classList.remove('active');
            stopResetCamera();
        });
    }

    // Reset Upload Logic
    const uploadContainer = document.querySelector('#reset-upload-mode .upload-preview-container');
    const uploadInput = document.getElementById('reset-upload-input');
    const uploadPreview = document.getElementById('reset-upload-preview');
    const uploadPlaceholder = document.getElementById('reset-upload-placeholder');

    if (uploadContainer && uploadInput) {
        uploadContainer.addEventListener('click', () => {
            uploadInput.click();
        });

        uploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    uploadPreview.src = event.target.result;
                    uploadPreview.style.display = 'block';
                    uploadPlaceholder.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Capture Reset Button - Multi-step (Front, Left, Right)
    const btnResetCapture = document.getElementById('btn-reset-capture');
    if (btnResetCapture) {
        btnResetCapture.addEventListener('click', async () => {
            if (pendingResetUserIndex === null) return;

            const video = document.getElementById('reset-video');
            const resetStatus = document.getElementById('reset-status');

            btnResetCapture.disabled = true;
            btnResetCapture.innerText = '촬영 중...';

            const steps = [
                { name: '정면', instruction: '📷 정면을 바라봐주세요...', direction: 'front' },
                { name: '좌측', instruction: '👉 고개를 오른쪽으로 살짝 돌려주세요...', direction: 'left' },
                { name: '우측', instruction: '👈 고개를 왼쪽으로 살짝 돌려주세요...', direction: 'right' }
            ];

            const descriptors = [];

            // Function to detect head direction using landmarks
            function getHeadDirection(landmarks) {
                const nose = landmarks.getNose();
                const leftEye = landmarks.getLeftEye();
                const rightEye = landmarks.getRightEye();

                const noseX = nose.reduce((sum, p) => sum + p.x, 0) / nose.length;
                const leftEyeX = leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length;
                const rightEyeX = rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length;

                const eyeCenterX = (leftEyeX + rightEyeX) / 2;
                const eyeDistance = Math.abs(rightEyeX - leftEyeX);
                const noseOffset = (noseX - eyeCenterX) / eyeDistance;

                if (noseOffset < -0.15) return 'left';
                else if (noseOffset > 0.15) return 'right';
                else return 'front';
            }

            try {
                for (let i = 0; i < steps.length; i++) {
                    const step = steps[i];
                    resetStatus.innerText = `[${i + 1}/3] ${step.instruction}`;
                    resetStatus.style.color = 'blue';

                    let detected = false;
                    let attempts = 0;
                    const maxAttempts = 100;

                    while (!detected && attempts < maxAttempts) {
                        const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                            .withFaceLandmarks()
                            .withFaceDescriptor();

                        if (detections) {
                            const currentDirection = getHeadDirection(detections.landmarks);

                            if (currentDirection === step.direction) {
                                descriptors.push(detections.descriptor);
                                resetStatus.innerText = `✅ ${step.name} 촬영 완료!`;
                                resetStatus.style.color = 'green';
                                detected = true;

                                if (i < steps.length - 1) {
                                    await new Promise(resolve => setTimeout(resolve, 800));
                                }
                            } else {
                                attempts++;
                                await new Promise(resolve => setTimeout(resolve, 100));
                            }
                        } else {
                            attempts++;
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                    }

                    if (!detected) {
                        resetStatus.innerText = `${step.name}을 인식하지 못했습니다. 다시 시도해주세요.`;
                        resetStatus.style.color = 'red';
                        btnResetCapture.disabled = false;
                        btnResetCapture.innerText = '촬영하여 재설정';
                        return;
                    }
                }

                if (descriptors.length === 3) {
                    updateUserFaceMultiple(pendingResetUserIndex, descriptors);
                    resetStatus.innerText = '🎉 얼굴 재설정 완료!';
                    resetStatus.style.color = 'green';
                    setTimeout(() => closeFaceResetModal(), 1000);
                }
            } catch (err) {
                console.error(err);
                resetStatus.innerText = '오류가 발생했습니다.';
                resetStatus.style.color = 'red';
            } finally {
                btnResetCapture.disabled = false;
                btnResetCapture.innerText = '촬영하여 재설정';
            }
        });
    }

    // Upload Reset Button
    const btnResetUpload = document.getElementById('btn-reset-upload');
    if (btnResetUpload) {
        btnResetUpload.addEventListener('click', async () => {
            if (pendingResetUserIndex === null) return;

            const uploadPreview = document.getElementById('reset-upload-preview');
            const resetStatus = document.getElementById('reset-status');

            if (!uploadPreview.src || uploadPreview.style.display === 'none') {
                resetStatus.innerText = '사진을 먼저 선택해주세요.';
                resetStatus.style.color = 'red';
                return;
            }

            resetStatus.innerText = '얼굴 인식 중...';
            resetStatus.style.color = 'blue';

            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = uploadPreview.src;

                await new Promise((resolve) => {
                    img.onload = resolve;
                });

                const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detections) {
                    updateUserFace(pendingResetUserIndex, detections.descriptor);
                    resetStatus.innerText = '얼굴 재설정 완료!';
                    resetStatus.style.color = 'green';
                    setTimeout(() => closeFaceResetModal(), 1000);
                } else {
                    resetStatus.innerText = '얼굴을 인식할 수 없습니다.';
                    resetStatus.style.color = 'red';
                }
            } catch (err) {
                console.error(err);
                resetStatus.innerText = '오류가 발생했습니다.';
                resetStatus.style.color = 'red';
            }
        });
    }
});

function updateUserFace(index, newDescriptor) {
    let users = JSON.parse(localStorage.getItem('faceCheckUsers')) || [];
    const user = users[index];
    if (!user) return;

    const userKey = `${user.number}. ${user.name}`;

    // Update descriptor in localStorage (use new format, single descriptor as array)
    users[index].descriptors = [Array.from(newDescriptor)];
    delete users[index].descriptor; // Remove old format if exists
    users[index].date = new Date().toISOString().split('T')[0];
    localStorage.setItem('faceCheckUsers', JSON.stringify(users));

    // Update in-memory descriptor
    const descriptorIndex = labeledFaceDescriptors.findIndex(desc => desc.label === userKey);
    if (descriptorIndex !== -1) {
        labeledFaceDescriptors[descriptorIndex] = new faceapi.LabeledFaceDescriptors(
            userKey,
            [new Float32Array(newDescriptor)]
        );
    }

    renderUserList();
}

// Update user face with multiple descriptors (3-step capture)
function updateUserFaceMultiple(index, newDescriptors) {
    let users = JSON.parse(localStorage.getItem('faceCheckUsers')) || [];
    const user = users[index];
    if (!user) return;

    const userKey = `${user.number}. ${user.name}`;

    // Update descriptors in localStorage
    users[index].descriptors = newDescriptors.map(d => Array.from(d));
    delete users[index].descriptor; // Remove old format if exists
    users[index].date = new Date().toISOString().split('T')[0];
    localStorage.setItem('faceCheckUsers', JSON.stringify(users));

    // Update in-memory descriptor
    const descriptorIndex = labeledFaceDescriptors.findIndex(desc => desc.label === userKey);
    if (descriptorIndex !== -1) {
        labeledFaceDescriptors[descriptorIndex] = new faceapi.LabeledFaceDescriptors(
            userKey,
            newDescriptors.map(d => new Float32Array(d))
        );
    }

    renderUserList();
}

// Info Edit Modal Logic
let pendingEditUserIndex = null;

window.openEditInfoModal = function (index) {
    const users = JSON.parse(localStorage.getItem('faceCheckUsers')) || [];
    const user = users[index];
    if (!user) return;

    pendingEditUserIndex = index;

    const modal = document.getElementById('edit-info-modal');
    const userInfo = document.getElementById('edit-info-user-info');
    const numberInput = document.getElementById('edit-user-number');
    const nameInput = document.getElementById('edit-user-name');
    const statusEl = document.getElementById('edit-info-status');

    userInfo.innerText = `현재: ${user.number}번 ${user.name}`;
    numberInput.value = user.number;
    nameInput.value = user.name;
    statusEl.innerText = '';

    modal.style.display = 'flex';
};

window.closeEditInfoModal = function () {
    const modal = document.getElementById('edit-info-modal');
    modal.style.display = 'none';
    pendingEditUserIndex = null;
};

// Info Edit Save Button
document.addEventListener('DOMContentLoaded', () => {
    const btnSaveInfo = document.getElementById('btn-save-info');

    if (btnSaveInfo) {
        btnSaveInfo.addEventListener('click', () => {
            if (pendingEditUserIndex === null) return;

            const numberInput = document.getElementById('edit-user-number');
            const nameInput = document.getElementById('edit-user-name');
            const statusEl = document.getElementById('edit-info-status');

            const newNumber = numberInput.value.trim();
            const newName = nameInput.value.trim();

            if (!newNumber || !newName) {
                statusEl.innerText = '번호와 이름을 모두 입력해주세요.';
                statusEl.style.color = 'red';
                return;
            }

            let users = JSON.parse(localStorage.getItem('faceCheckUsers')) || [];
            const currentUser = users[pendingEditUserIndex];
            if (!currentUser) return;

            const oldKey = `${currentUser.number}. ${currentUser.name}`;
            const newKey = `${newNumber}. ${newName}`;

            // Check for duplicate number (except current user)
            const duplicateNumber = users.find((u, i) => i !== pendingEditUserIndex && u.number === newNumber);
            if (duplicateNumber) {
                statusEl.innerText = `이미 사용 중인 번호입니다 (${duplicateNumber.name}).`;
                statusEl.style.color = 'red';
                return;
            }

            // Update user info
            users[pendingEditUserIndex].number = newNumber;
            users[pendingEditUserIndex].name = newName;
            users.sort((a, b) => parseInt(a.number) - parseInt(b.number));
            localStorage.setItem('faceCheckUsers', JSON.stringify(users));

            // Update attendance history keys
            if (oldKey !== newKey) {
                let history = JSON.parse(localStorage.getItem('faceCheckHistory')) || {};
                for (const date in history) {
                    if (history[date][oldKey]) {
                        history[date][newKey] = history[date][oldKey];
                        delete history[date][oldKey];
                    }
                }
                localStorage.setItem('faceCheckHistory', JSON.stringify(history));

                // Update in-memory descriptor label
                const descriptorIndex = labeledFaceDescriptors.findIndex(desc => desc.label === oldKey);
                if (descriptorIndex !== -1) {
                    const oldDescriptor = labeledFaceDescriptors[descriptorIndex];
                    labeledFaceDescriptors[descriptorIndex] = new faceapi.LabeledFaceDescriptors(
                        newKey,
                        oldDescriptor.descriptors
                    );
                }
            }

            renderUserList();
            renderAttendanceGrid();
            renderMonthStatus();

            closeEditInfoModal();
            alert(`${newName} 학생 정보가 수정되었습니다.`);
        });
    }
});

// Attendance Grid Logic
function renderAttendanceGrid() {
    const grid = document.getElementById('attendance-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const users = JSON.parse(localStorage.getItem('faceCheckUsers')) || [];

    // Read from HISTORY using today's date
    const history = JSON.parse(localStorage.getItem('faceCheckHistory')) || {};
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
    const todayAttendance = history[today] || {};

    if (users.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #7f8c8d;">등록된 학생이 없습니다.</p>';
        return;
    }

    users.forEach(user => {
        const key = `${user.number}. ${user.name}`;
        const record = todayAttendance[key]; // Can be string (legacy) or object {time, status}

        let status = 'none';
        let timeDisplay = '-';

        if (record) {
            if (typeof record === 'string') {
                status = 'present'; // Legacy support
                timeDisplay = record;
            } else {
                status = record.status;
                timeDisplay = record.time;
            }
        }

        const div = document.createElement('div');
        div.className = `grid-item ${status !== 'none' ? status : ''}`;
        div.id = `grid-item-${user.number}`; // Unique ID for easy update
        div.onclick = () => openStatusModal(user.number, user.name); // Add click handler

        div.innerHTML = `
            <div class="name">${user.number} ${user.name}</div>
            <div class="time">${timeDisplay}</div>
        `;
        grid.appendChild(div);
    });
}

function markAttendance(label) {
    let history = JSON.parse(localStorage.getItem('faceCheckHistory')) || {};
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

    if (!history[today]) {
        history[today] = {};
    }

    // If already present today, DO NOT update time
    if (history[today][label]) {
        return;
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString();

    // 9 AM Lateness Rule
    const nineAM = new Date();
    nineAM.setHours(9, 0, 0, 0);

    const status = now > nineAM ? 'late' : 'present';

    history[today][label] = {
        time: timeString,
        status: status
    };

    localStorage.setItem('faceCheckHistory', JSON.stringify(history));

    renderAttendanceGrid(); // Re-render to show correct color

    attendanceStatus.innerText = `${label}님 ${status === 'late' ? '지각' : '출석'} 처리되었습니다!`;
    attendanceStatus.style.color = status === 'late' ? '#f1c40f' : 'green';
}

let currentMonthDate = new Date();

// Monthly Status Logic
function renderMonthStatus() {
    const tableHead = document.getElementById('month-table-head');
    const tableBody = document.getElementById('month-table-body');
    const monthTitle = document.getElementById('month-title');
    const currentMonthDisplay = document.getElementById('current-month-display');

    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth(); // 0-indexed

    const monthString = `${year}년 ${month + 1}월`;
    monthTitle.innerText = `${monthString} 출석 현황`;
    if (currentMonthDisplay) {
        currentMonthDisplay.innerText = monthString;
    }

    // 1. Generate Header (Days)
    const lastDay = new Date(year, month + 1, 0).getDate();
    let headerHTML = '<tr><th>이름</th>';
    for (let i = 1; i <= lastDay; i++) {
        headerHTML += `<th>${i}</th>`;
    }
    headerHTML += '</tr>';
    tableHead.innerHTML = headerHTML;

    // 2. Generate Body (Users)
    const users = JSON.parse(localStorage.getItem('faceCheckUsers')) || [];
    const history = JSON.parse(localStorage.getItem('faceCheckHistory')) || {};

    tableBody.innerHTML = '';

    if (users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${lastDay + 1}" style="text-align:center;">등록된 학생이 없습니다.</td></tr>`;
        return;
    }

    users.forEach(user => {
        const key = `${user.number}. ${user.name}`;
        let rowHTML = `<tr><td>${user.number} ${user.name}</td>`;

        for (let i = 1; i <= lastDay; i++) {
            // Construct date string YYYY-MM-DD (padded)
            const dayStr = i.toString().padStart(2, '0');
            const monthStr = (month + 1).toString().padStart(2, '0');
            const dateKey = `${year}-${monthStr}-${dayStr}`;

            const record = history[dateKey] && history[dateKey][key];

            let cellContent = '';
            if (record) {
                // Handle legacy string format or new object format
                const status = (typeof record === 'string') ? 'present' : record.status;
                const time = (typeof record === 'string') ? record : record.time;

                let color = 'var(--success-color)'; // Default Green
                if (status === 'late') color = 'var(--warning-color)';
                else if (status === 'early') color = 'var(--info-color)';
                else if (status === 'absent') color = 'var(--error-color)';

                cellContent = `<span class="check-mark" style="color: ${color}" data-time="${time}">✔</span>`;
            }

            rowHTML += `<td>${cellContent}</td>`;
        }
        rowHTML += '</tr>';
        tableBody.innerHTML += rowHTML;
    });
}

// Modal Logic
let selectedUserForModal = null;

window.openStatusModal = function (number, name) {
    selectedUserForModal = { number, name };
    document.getElementById('modal-user-name').innerText = `${number} ${name}`;
    document.getElementById('status-modal').style.display = 'flex';
};

window.closeStatusModal = function () {
    document.getElementById('status-modal').style.display = 'none';
    selectedUserForModal = null;
};

window.updateStatus = function (newStatus) {
    if (!selectedUserForModal) return;

    const { number, name } = selectedUserForModal;
    const key = `${number}. ${name}`;
    const today = new Date().toLocaleDateString('en-CA');

    let history = JSON.parse(localStorage.getItem('faceCheckHistory')) || {};
    if (!history[today]) history[today] = {};

    const now = new Date();
    const timeString = now.toLocaleTimeString();

    // Preserve existing time if available, otherwise use current time
    let existingRecord = history[today][key];
    let time = timeString;

    if (existingRecord) {
        time = (typeof existingRecord === 'string') ? existingRecord : existingRecord.time;
    }

    history[today][key] = {
        time: time,
        status: newStatus
    };

    localStorage.setItem('faceCheckHistory', JSON.stringify(history));

    renderAttendanceGrid();
    renderMonthStatus(); // Also update monthly view if open
    closeStatusModal();
};

// Tooltip Logic
let tooltipTimeout;
let tooltipElement;

document.body.addEventListener('mouseover', (e) => {
    if (e.target.classList.contains('check-mark')) {
        const time = e.target.getAttribute('data-time');
        if (time) {
            tooltipTimeout = setTimeout(() => {
                showTooltip(e.target, time);
            }, 800); // 0.8s delay
        }
    }
});

document.body.addEventListener('mouseout', (e) => {
    if (e.target.classList.contains('check-mark')) {
        clearTimeout(tooltipTimeout);
        hideTooltip();
    }
});

function showTooltip(target, text) {
    // Remove existing tooltip if any
    if (tooltipElement) tooltipElement.remove();

    tooltipElement = document.createElement('div');
    tooltipElement.className = 'custom-tooltip';
    tooltipElement.innerText = text;
    document.body.appendChild(tooltipElement);

    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();

    // Position above the target
    let top = rect.top - tooltipRect.height - 8;
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

    // Keep within viewport
    if (top < 0) top = rect.bottom + 8; // Flip to bottom if not enough space top
    if (left < 0) left = 5;
    if (left + tooltipRect.width > window.innerWidth) left = window.innerWidth - tooltipRect.width - 5;

    tooltipElement.style.top = `${top}px`;
    tooltipElement.style.left = `${left}px`;

    // Trigger reflow for transition
    void tooltipElement.offsetWidth;
    tooltipElement.style.opacity = '1';
}

function hideTooltip() {
    if (tooltipElement) {
        tooltipElement.style.opacity = '0';
        setTimeout(() => {
            if (tooltipElement) tooltipElement.remove();
            tooltipElement = null;
        }, 200);
    }
}

// Bulk Delete Logic
const btnDeleteAll = document.getElementById('btn-delete-all');
const deleteAllModal = document.getElementById('delete-all-modal');
const deleteConfirmInput = document.getElementById('delete-confirm-input');
const btnConfirmDeleteAll = document.getElementById('btn-confirm-delete-all');

if (btnDeleteAll) {
    btnDeleteAll.addEventListener('click', () => {
        deleteAllModal.style.display = 'flex';
        deleteConfirmInput.value = '';
        btnConfirmDeleteAll.disabled = true;
        btnConfirmDeleteAll.style.opacity = '0.5';
        btnConfirmDeleteAll.style.cursor = 'not-allowed';
    });
}

if (deleteConfirmInput) {
    deleteConfirmInput.addEventListener('input', (e) => {
        if (e.target.value === '완전삭제') {
            btnConfirmDeleteAll.disabled = false;
            btnConfirmDeleteAll.style.opacity = '1';
            btnConfirmDeleteAll.style.cursor = 'pointer';
        } else {
            btnConfirmDeleteAll.disabled = true;
            btnConfirmDeleteAll.style.opacity = '0.5';
            btnConfirmDeleteAll.style.cursor = 'not-allowed';
        }
    });
}

if (btnConfirmDeleteAll) {
    btnConfirmDeleteAll.addEventListener('click', () => {
        // 1. Clear ALL localStorage data for this domain (complete wipe)
        localStorage.clear();

        // 2. Clear in-memory data
        labeledFaceDescriptors = [];

        closeDeleteAllModal();
        alert('모든 데이터가 완전히 삭제되었습니다.\n페이지를 새로고침합니다.');

        // 3. Force Reload to clear all memory states
        location.reload();
    });
}

window.closeDeleteAllModal = function () {
    deleteAllModal.style.display = 'none';
};

function exportData() {
    const users = localStorage.getItem('faceCheckUsers');
    const history = localStorage.getItem('faceCheckHistory');

    const data = {
        users: JSON.parse(users || '[]'),
        history: JSON.parse(history || '{}'),
        exportedAt: new Date().toISOString()
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.download = `face_check_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (data.users && data.history) {
                if (confirm(`학생 ${data.users.length}명과 출석 기록을 불러오시겠습니까?\n기존 데이터는 덮어씌워집니다.`)) {
                    localStorage.setItem('faceCheckUsers', JSON.stringify(data.users));
                    localStorage.setItem('faceCheckHistory', JSON.stringify(data.history));
                    alert('데이터 복원이 완료되었습니다.');
                    // Refresh current view if needed, or just let user navigate
                    renderUserList();
                    renderAttendanceGrid();
                    renderMonthStatus();
                }
            } else {
                alert('올바르지 않은 데이터 파일입니다.');
            }
        } catch (err) {
            console.error(err);
            alert('파일을 읽는 중 오류가 발생했습니다.');
        }
    };
    reader.readAsText(file);
}
