/**
 * Image handling functionality for upload, display, and deletion
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
 * Handle file selection and display preview
 * @param {Event} event - The file input change event
 * @param {string} day - Day of the week
 */
function handleFileSelect(event, day) {
    const files = event.target.files;
    const imageContainer = document.getElementById(`${day}-images`);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        reader.onload = function(e) {
            const imageData = e.target.result;
            const fileName = file.name;

            // Create image preview with delete button
            const previewDiv = document.createElement('div');
            previewDiv.className = 'image-item mb-2 flex items-center';
            previewDiv.innerHTML = `
                <span class="image-filename mr-2">${fileName}</span>
                <button class="delete-image-btn ml-2 text-red-500 hover:text-red-700"
                        onclick="deleteImage(event, this)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <input type="hidden" class="image-data" value="${imageData}">
            `;

            imageContainer.appendChild(previewDiv);
            imageContainer.classList.remove('hidden');
        };

        reader.readAsDataURL(file);
    }
}

/**
 * Delete an image from the container
 * @param {Event} event - The click event
 * @param {HTMLElement} button - The delete button element
 */
function deleteImage(event, button) {
    event.preventDefault();
    event.stopPropagation();

    if (confirm("정말로 이 이미지를 삭제하시겠습니까?")) {
        const imageItem = button.closest('.image-item');
        const imageContainer = imageItem.parentNode;

        // Remove the image item
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
 * 지연 로딩: 이미지 ID로 실제 이미지 데이터를 불러와 팝업으로 표시
 * @param {string} day - 요일
 * @param {number} index - 이미지 인덱스
 * @param {string} fileName - 파일 이름
 */
function loadAndShowImage(day, index, fileName) {
    // 로딩 표시
    showLoadingIndicator(`"${fileName}" 로딩 중...`);

    // 캐시된 이미지 데이터 확인
    if (currentWeekImages && currentWeekImages[day] && currentWeekImages[day][index]) {
        const imgData = currentWeekImages[day][index].data;

        if (imgData) {
            // 로딩 인디케이터 닫기
            closeLoadingIndicator();

            // 이미지 팝업 표시
            showImagePopup(fileName, imgData);
            return;
        }
    }

    // 현재 연도, 월, 주차를 기준으로 데이터 키 생성
    const dataKey = `${currentYear}-${currentMonth+1}-${currentWeek}`;

    // Firebase에서 해당 이미지 데이터만 불러오기
    db.ref(`weeks/${dataKey}/images/${day}/${index}`).once("value", snapshot => {
        const imageData = snapshot.val();

        // 로딩 인디케이터 닫기
        closeLoadingIndicator();

        if (imageData && imageData.data) {
            // 이미지 데이터를 캐시에 저장
            if (!currentWeekImages[day]) {
                currentWeekImages[day] = [];
            }

            if (!currentWeekImages[day][index]) {
                currentWeekImages[day][index] = {};
            }

            currentWeekImages[day][index].data = imageData.data;

            // 이미지 팝업 표시
            showImagePopup(fileName, imageData.data);
        } else {
            // 해당 주차에서 데이터를 찾지 못한 경우 기본 스케줄에서 시도
            db.ref(`schedule/images/${day}/${index}`).once("value", snapshot => {
                const defaultImageData = snapshot.val();

                if (defaultImageData && defaultImageData.data) {
                    // 캐시에 저장
                    if (!currentWeekImages[day]) {
                        currentWeekImages[day] = [];
                    }

                    if (!currentWeekImages[day][index]) {
                        currentWeekImages[day][index] = {};
                    }

                    currentWeekImages[day][index].data = defaultImageData.data;

                    // 이미지 팝업 표시
                    showImagePopup(fileName, defaultImageData.data);
                } else {
                    // 이미지를 찾지 못한 경우
                    alert(`이미지 데이터를 불러올 수 없습니다: ${fileName}`);
                }
            });
        }
    });
}

/**
 * Show a popup with the full image
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
