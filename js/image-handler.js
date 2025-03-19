/**
 * Image handling functionality for upload, display, and deletion
 * Refactored to use Firebase Storage instead of database for image storage
 */

// 이미지 로딩 상태 표시를 위한 변수
let loadingPopup = null;

/**
 * Trigger file upload for a specific day
 * @param {string} day - Day of the week
 */
function handleFileUpload(day) {
    const fileInput = document.getElementById(`${day}-file`);
    fileInput.click();
}

/**
 * Handle file selection and upload to Firebase Storage
 * @param {Event} event - The file input change event
 * @param {string} day - Day of the week
 */
function handleFileSelect(event, day) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    showLoadingIndicator("이미지 업로드 중...");

    const imageContainer = document.getElementById(`${day}-images`);
    const uploadPromises = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name;
        const fileSize = file.size;

        // 파일 크기 제한 (10MB)
        if (fileSize > 10 * 1024 * 1024) {
            alert(`파일 "${fileName}"이(가) 너무 큽니다. 10MB 미만의 파일만 업로드할 수 있습니다.`);
            continue;
        }

        // Firebase Storage에 업로드
        const uploadPromise = uploadImageToStorage(file, day)
            .then(downloadURL => {
                // Create image preview with metadata
                const previewDiv = document.createElement('div');
                previewDiv.className = 'image-item mb-2 flex items-center';
                previewDiv.innerHTML = `
                    <span class="image-filename cursor-pointer text-blue-500 underline"
                          onclick="showImagePopupFromURL('${fileName}', '${downloadURL}')">${fileName}</span>
                    <button class="delete-image-btn ml-2 text-red-500 hover:text-red-700"
                            onclick="deleteImage(event, this)">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <input type="hidden" class="image-url" value="${downloadURL}">
                    <input type="hidden" class="storage-path" value="${day}/${fileName}">
                `;

                imageContainer.appendChild(previewDiv);
                imageContainer.classList.remove('hidden');
                return downloadURL;
            })
            .catch(error => {
                console.error("Image upload failed:", error);
                alert(`이미지 업로드 실패: ${error.message}`);
            });

        uploadPromises.push(uploadPromise);
    }

    // 모든 업로드가 완료되면 로딩 인디케이터를 닫음
    Promise.all(uploadPromises.filter(p => p))
        .then(() => closeLoadingIndicator())
        .catch(error => {
            console.error("Some uploads failed:", error);
            closeLoadingIndicator();
        });
}

/**
 * Upload an image file to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} day - Day of the week for organizing storage
 * @returns {Promise<string>} - Promise resolving to the download URL
 */
function uploadImageToStorage(file, day) {
    return new Promise((resolve, reject) => {
        try {
            // 현재 연도, 월, 주차를 기준으로 저장 경로 생성
            const dataKey = `${currentYear}-${currentMonth+1}-${currentWeek}`;
            const storagePath = `images/${dataKey}/${day}/${file.name}`;

            // Firebase Storage에 업로드
            const storageRef = storage.ref(storagePath);
            const uploadTask = storageRef.put(file);

            uploadTask.on('state_changed',
                // 진행 상태 업데이트
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`Upload progress: ${progress.toFixed(2)}%`);
                },
                // 오류 처리
                (error) => {
                    console.error("Upload failed:", error);
                    reject(error);
                },
                // 완료 처리
                () => {
                    // 업로드 완료 후 다운로드 URL 가져오기
                    uploadTask.snapshot.ref.getDownloadURL()
                        .then(downloadURL => {
                            resolve(downloadURL);
                        })
                        .catch(error => {
                            console.error("Failed to get download URL:", error);
                            reject(error);
                        });
                }
            );
        } catch (error) {
            console.error("Error in uploadImageToStorage:", error);
            reject(error);
        }
    });
}

/**
 * Delete an image from the container and Firebase Storage
 * @param {Event} event - The click event
 * @param {HTMLElement} button - The delete button element
 */
function deleteImage(event, button) {
    event.preventDefault();
    event.stopPropagation();

    if (confirm("정말로 이 이미지를 삭제하시겠습니까?")) {
        const imageItem = button.closest('.image-item');
        const imageContainer = imageItem.parentNode;

        // Firebase Storage에서도 삭제
        const storagePath = imageItem.querySelector('.storage-path')?.value;
        if (storagePath) {
            const storageRef = storage.ref(storagePath);

            storageRef.delete()
                .then(() => {
                    console.log(`Successfully deleted image from storage: ${storagePath}`);
                })
                .catch(error => {
                    console.error(`Failed to delete image from storage: ${error.message}`);
                    // UI에서는 계속 삭제 진행
                });
        }

        // Remove the image item from UI
        imageContainer.removeChild(imageItem);

        // If no more images, hide the container
        if (imageContainer.children.length === 0) {
            imageContainer.classList.add('hidden');
        }
    }
}

/**
 * 로딩 인디케이터 표시
 * @param {string} message - 표시할 메시지
 */
function showLoadingIndicator(message = "이미지 로딩 중...") {
    // 이미 로딩 팝업이 있으면 제거
    if (loadingPopup) {
        closeLoadingIndicator();
    }

    loadingPopup = document.createElement('div');
    loadingPopup.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50';
    loadingPopup.id = 'loading-popup';

    loadingPopup.innerHTML = `
        <div class="bg-white p-6 rounded-lg flex flex-col items-center">
            <div class="loading-spinner mb-3"></div>
            <p class="text-lg">${message}</p>
        </div>
    `;

    document.body.appendChild(loadingPopup);
}

/**
 * 로딩 인디케이터 닫기
 */
function closeLoadingIndicator() {
    if (loadingPopup) {
        document.body.removeChild(loadingPopup);
        loadingPopup = null;
    }
}

/**
 * 이미지 URL을 이용해 저장된 이미지 표시
 * @param {string} day - 요일
 * @param {number} index - 이미지 인덱스
 * @param {string} fileName - 파일 이름
 */
function loadAndShowImage(day, index, fileName) {
    // 로딩 표시
    showLoadingIndicator(`"${fileName}" 로딩 중...`);

    // 현재 연도, 월, 주차를 기준으로 데이터 키 생성
    const dataKey = `${currentYear}-${currentMonth+1}-${currentWeek}`;

    // Firebase에서 해당 이미지 URL 불러오기
    db.ref(`weeks/${dataKey}/images/${day}/${index}`).once("value", snapshot => {
        const imageData = snapshot.val();

        if (imageData) {
            // 로딩 인디케이터 닫기
            closeLoadingIndicator();

            // URL이 있으면 URL로 표시 (Storage 방식)
            if (imageData.url) {
                showImagePopupFromURL(fileName, imageData.url);
            }
            // Base64 데이터가 있으면 Base64로 표시 (기존 방식)
            else if (imageData.data) {
                showImagePopup(fileName, imageData.data);
            } else {
                alert(`이미지 데이터를 불러올 수 없습니다: ${fileName}`);
            }
        } else {
            // 해당 주차에서 URL을 찾지 못한 경우 기본 스케줄에서 시도
            db.ref(`schedule/images/${day}/${index}`).once("value", snapshot => {
                const defaultImageData = snapshot.val();
                closeLoadingIndicator();

                if (defaultImageData) {
                    if (defaultImageData.url) {
                        showImagePopupFromURL(fileName, defaultImageData.url);
                    } else if (defaultImageData.data) {
                        showImagePopup(fileName, defaultImageData.data);
                    } else {
                        alert(`이미지 데이터를 불러올 수 없습니다: ${fileName}`);
                    }
                } else {
                    alert(`이미지 데이터를 불러올 수 없습니다: ${fileName}`);
                }
            });
        }
    }).catch(error => {
        console.error("Error loading image:", error);
        closeLoadingIndicator();
        alert(`이미지 로딩 중 오류 발생: ${error.message}`);
    });
}

/**
 * Show a popup with the image from URL
 * @param {string} fileName - Name of the image file
 * @param {string} imageURL - URL of the image
 */
function showImagePopupFromURL(fileName, imageURL) {
    const popup = document.createElement('div');
    popup.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50';
    popup.id = 'image-popup';
    popup.onclick = closeImagePopup;

    popup.innerHTML = `
        <div class="bg-white p-4 rounded-lg max-w-4xl max-h-screen overflow-auto">
            <h3 class="text-xl font-bold mb-2">${fileName}</h3>
            <img src="${imageURL}" alt="${fileName}" class="max-w-full">
        </div>
    `;

    document.body.appendChild(popup);
}

/**
 * 레거시 지원: base64 데이터로 팝업 표시 (기존 이미지 지원용)
 * @param {string} fileName - Name of the image file
 * @param {string} imageData - Base64 encoded image data
 */
function showImagePopup(fileName, imageData) {
    const popup = document.createElement('div');
    popup.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50';
    popup.id = 'image-popup';
    popup.onclick = closeImagePopup;

    popup.innerHTML = `
        <div class="bg-white p-4 rounded-lg max-w-4xl max-h-screen overflow-auto">
            <h3 class="text-xl font-bold mb-2">${fileName}</h3>
            <img src="${imageData}" alt="${fileName}" class="max-w-full">
        </div>
    `;

    document.body.appendChild(popup);
}

/**
 * Close the image popup
 */
function closeImagePopup() {
    const popup = document.getElementById('image-popup');
    if (popup) {
        document.body.removeChild(popup);
    }
}
