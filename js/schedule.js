/**
 * Schedule data management functionality
 * Refactored to use Firebase Storage for images
 */

// Temporary storage for schedule data
let tempScheduleData = null;
let currentWeekImages = {}; // 현재 주차의 이미지 메타데이터 캐시

/**
 * Save the current schedule to Firebase
 */
function saveSchedule() {
    if (!isEditor) return;
    const schedule = {};
    const images = {};

    // Save text content
    document.querySelectorAll(".day-box").forEach(box => {
        schedule[box.id] = box.innerHTML;
    });

    // Save image metadata for each day
    days.forEach(day => {
        const dayImages = [];
        const imageContainer = document.getElementById(`${day}-images`);

        imageContainer.querySelectorAll('.image-item').forEach(item => {
            const fileName = item.querySelector('.image-filename').textContent;
            const imageURL = item.querySelector('.image-url')?.value || '';
            const storagePath = item.querySelector('.storage-path')?.value || '';

            // Firebase Storage를 사용하는 경우
            if (imageURL && storagePath) {
                dayImages.push({
                    fileName: fileName,
                    url: imageURL,
                    storagePath: storagePath
                });
            }
            // 레거시 지원: 기존 base64 방식 이미지가 있는 경우
            else {
                const imageData = item.querySelector('.image-data')?.value;
                if (imageData) {
                    dayImages.push({
                        fileName: fileName,
                        data: imageData
                    });
                }
            }
        });

        images[day] = dayImages;
    });

    const month = document.getElementById("month").innerText;
    const week = document.getElementById("week").innerText;
    const dateRange = document.getElementById("date-range").innerText;
    const lastUpdated = new Date().toLocaleString();

    // 현재 연도, 월, 주차를 기준으로 데이터 키 생성
    const dataKey = `${currentYear}-${currentMonth+1}-${currentWeek}`;

    // 주차별 데이터 저장
    db.ref(`weeks/${dataKey}`).set({
        schedule,
        images,
        month,
        week,
        dateRange,
        year: currentYear,
        lastUpdated
    }, (error) => {
        if (error) {
            console.error("저장 오류:", error);
            alert("일정 저장 실패: " + error.message);
        } else {
            // 현재 상태를 "last" 데이터로도 복사 (항상 최신 상태를 쉽게 불러올 수 있도록)
            db.ref("schedule").set({
                schedule,
                images,
                month,
                week,
                dateRange,
                year: currentYear,
                lastUpdated
            }, (error) => {
                if (error) {
                    console.error("최신 일정 업데이트 실패:", error);
                } else {
                    console.log("일정 및 이미지 메타데이터 저장 완료");
                }
            });

            document.getElementById("lastUpdated").innerText = `Last Updated: ${lastUpdated}`;
            alert("일정이 성공적으로 저장되었습니다.");

            // Refresh the page to enter view mode
            location.reload();
        }
    });
}

/**
 * Save the current schedule data temporarily
 */
function saveTempScheduleData() {
    if (!isEditor) return;

    tempScheduleData = {
        schedule: {},
        images: {}
    };

    // 텍스트 콘텐츠 저장
    document.querySelectorAll(".day-box").forEach(box => {
        tempScheduleData.schedule[box.id] = box.innerHTML;
    });

    // 이미지 메타데이터 저장
    days.forEach(day => {
        const dayImages = [];
        const imageContainer = document.getElementById(`${day}-images`);

        imageContainer.querySelectorAll('.image-item').forEach(item => {
            const fileName = item.querySelector('.image-filename').textContent;
            const imageURL = item.querySelector('.image-url')?.value;
            const storagePath = item.querySelector('.storage-path')?.value;

            // Firebase Storage를 사용하는 경우
            if (imageURL && storagePath) {
                dayImages.push({
                    fileName: fileName,
                    url: imageURL,
                    storagePath: storagePath
                });
            }
            // 레거시 지원: 기존 base64 방식 이미지가 있는 경우
            else {
                const imageData = item.querySelector('.image-data')?.value;
                if (imageData) {
                    dayImages.push({
                        fileName: fileName,
                        data: imageData
                    });
                }
            }
        });

        tempScheduleData.images[day] = dayImages;
    });
}

/**
 * Load the initial schedule data
 */
function loadSchedule() {
    db.ref("schedule").once("value", snapshot => {
        const data = snapshot.val();
        if (data) {
            // 저장된 연도값이 있으면 불러오기, 없으면 현재 연도 사용
            currentYear = data.year || new Date().getFullYear();

            // 월과 주차 정보 설정
            document.getElementById("month").innerText = data.month;
            document.getElementById("week").innerText = data.week;

            // 월과 주차 정보를 숫자로 변환
            currentMonth = getMonthNumber(data.month);
            currentWeek = parseInt(data.week);

            // 날짜 범위가 저장되어 있으면 파싱하여 사용
            if (data.dateRange) {
                // 날짜 범위 파싱하여 시작일 계산
                const dateRangeParts = data.dateRange.split(' ~ ');
                if (dateRangeParts.length === 2) {
                    const startDateParts = dateRangeParts[0].split('.');
                    if (startDateParts.length === 2) {
                        const month = parseInt(startDateParts[0]) - 1; // 0-based month
                        const day = parseInt(startDateParts[1]);

                        // 시작일 설정
                        currentStartDate = new Date(currentYear, month, day);

                        // 날짜 범위 표시
                        document.getElementById("date-range").innerText = data.dateRange;
                    } else {
                        // 파싱 실패 시 계산
                        recalculateStartDate();
                        updateDateRange();
                    }
                } else {
                    // 파싱 실패 시 계산
                    recalculateStartDate();
                    updateDateRange();
                }
            } else {
                // 날짜 범위가 없으면 계산
                recalculateStartDate();
                updateDateRange();
            }

            document.getElementById("lastUpdated").innerText = `Last Updated: ${data.lastUpdated}`;

            // 일정 데이터 표시 (이미지 메타데이터만 포함)
            displayScheduleData(data, true);
        } else {
            // 데이터가 없는 경우 현재 날짜 기준으로 초기화
            initializeCurrentDate();
        }
    });
}

/**
 * Load data for the current week
 */
function loadWeekData() {
    // 이미지 메타데이터 캐시 초기화
    currentWeekImages = {};

    // 현재 연도, 월, 주차를 기준으로 데이터 키 생성
    const dataKey = `${currentYear}-${currentMonth+1}-${currentWeek}`;

    // Firebase에서 해당 주차에 해당하는 데이터 불러오기
    db.ref(`weeks/${dataKey}`).once("value", snapshot => {
        const weekData = snapshot.val();

        // 해당 주차의 데이터가 있으면 사용
        if (weekData) {
            // 이미지 메타데이터 캐시 설정
            if (weekData.images) {
                currentWeekImages = weekData.images;
            }

            displayScheduleData(weekData, true);

            // 각 요일별 날짜 표시 업데이트
            updateDayDates(currentStartDate);
            return;
        }

        // 주차별 데이터가 없으면 기본 schedule 데이터 확인
        db.ref("schedule").once("value", snapshot => {
            const defaultData = snapshot.val();

            // 기본 데이터도 없으면 초기화
            if (!defaultData) {
                clearScheduleData();
                // 각 요일별 날짜 표시 업데이트
                updateDayDates(currentStartDate);
                return;
            }

            // 기본 데이터의 연도, 월, 주차가 현재와 일치하는지 확인
            const savedYear = defaultData.year || currentYear;
            const savedMonth = getMonthNumber(defaultData.month);
            const savedWeek = parseInt(defaultData.week);

            if (savedYear === currentYear && savedMonth === currentMonth && savedWeek === currentWeek) {
                // 이미지 메타데이터 캐시 설정
                if (defaultData.images) {
                    currentWeekImages = defaultData.images;
                }

                displayScheduleData(defaultData, true);
            } else {
                // 일치하지 않으면 데이터 초기화
                clearScheduleData();
            }

            // 각 요일별 날짜 표시 업데이트
            updateDayDates(currentStartDate);
        });
    });
}

/**
 * Display schedule data in the UI
 * @param {Object} data - The schedule data to display
 * @param {boolean} loadMetadataOnly - Whether to load only image metadata (default: false)
 */
function displayScheduleData(data, loadMetadataOnly = false) {
    // 일정 데이터 불러오기
    if (data.schedule) {
        for (const [key, value] of Object.entries(data.schedule)) {
            document.getElementById(key).innerHTML = value;
        }
    }

    // Always clear and hide all image containers first
    days.forEach(day => {
        const imageContainer = document.getElementById(`${day}-images`);
        imageContainer.innerHTML = '';
        imageContainer.classList.add('hidden');
    });

    // 이미지 데이터 불러오기 (only if there's image data)
    if (data.images) {
        days.forEach(day => {
            const imageContainer = document.getElementById(`${day}-images`);

            if (data.images[day] && data.images[day].length > 0) {
                imageContainer.classList.remove('hidden');

                data.images[day].forEach((img, index) => {
                    const imageItem = document.createElement('div');
                    imageItem.className = 'image-item mb-2 flex items-center';

                    // URL 기반 이미지 (Firebase Storage)
                    if (img.url && img.storagePath) {
                        if (loadMetadataOnly) {
                            // 이미지 ID 생성 (고유 식별자)
                            imageItem.innerHTML = `
                                <span class="image-filename cursor-pointer text-blue-500 underline"
                                      onclick="showImagePopupFromURL('${img.fileName}', '${img.url}')">${img.fileName}</span>
                                <input type="hidden" class="image-url" value="${img.url}">
                                <input type="hidden" class="storage-path" value="${img.storagePath}">
                            `;
                        } else {
                            // 편집 모드에서는 삭제 버튼 추가
                            imageItem.innerHTML = `
                                <span class="image-filename cursor-pointer text-blue-500 underline"
                                      onclick="showImagePopupFromURL('${img.fileName}', '${img.url}')">${img.fileName}</span>
                                <input type="hidden" class="image-url" value="${img.url}">
                                <input type="hidden" class="storage-path" value="${img.storagePath}">
                            `;
                        }
                    }
                    // 레거시 지원: base64 데이터 (기존 이미지)
                    else if (img.data) {
                        if (loadMetadataOnly) {
                            imageItem.innerHTML = `
                                <span class="image-filename cursor-pointer text-blue-500 underline"
                                      onclick="loadAndShowImage('${day}', ${index}, '${img.fileName}')">${img.fileName}</span>
                            `;
                        } else {
                            imageItem.innerHTML = `
                                <span class="image-filename cursor-pointer text-blue-500 underline"
                                      onclick="showImagePopup('${img.fileName}', '${img.data}')">${img.fileName}</span>
                                <input type="hidden" class="image-data" value="${img.data}">
                            `;
                        }
                    }

                    imageContainer.appendChild(imageItem);
                });
            }
        });
    }

    // 마지막 업데이트 정보
    if (data.lastUpdated) {
        document.getElementById("lastUpdated").innerText = `Last Updated: ${data.lastUpdated}`;
    }

    // 에디터 모드일 경우 이미지 삭제 버튼 추가
    if (isEditor) {
        days.forEach(day => {
            const imageContainer = document.getElementById(`${day}-images`);
            const imageItems = imageContainer.querySelectorAll('.image-item');

            imageItems.forEach(item => {
                // 삭제 버튼이 없으면 추가
                if (!item.querySelector('.delete-image-btn')) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'delete-image-btn ml-2 text-red-500 hover:text-red-700';
                    deleteBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    `;
                    deleteBtn.onclick = function(e) { deleteImage(e, this); };
                    item.appendChild(deleteBtn);
                }
            });
        });
    }
}

/**
 * Clear all schedule data
 */
function clearScheduleData() {
    // 모든 날짜 박스 비우기
    days.forEach(day => {
        document.getElementById(day).innerHTML = "";

        // 이미지 컨테이너 비우고 숨기기
        const imageContainer = document.getElementById(`${day}-images`);
        imageContainer.innerHTML = '';
        imageContainer.classList.add('hidden');
    });
}

/**
 * 레거시 이미지 데이터를 Storage로 마이그레이션
 * 기존 Base64 인코딩된 이미지를 Firebase Storage로 이동
 */
function migrateImagesToStorage() {
    if (!confirm("기존 이미지를 Firebase Storage로 마이그레이션하시겠습니까? 이 작업은 시간이 걸릴 수 있습니다.")) {
        return;
    }

    showLoadingIndicator("기존 이미지 마이그레이션 중... (0%)");

    // 디버깅을 위한 상태 변수
    let totalImages = 0;
    let processedImages = 0;
    let successfulMigrations = 0;
    let failedMigrations = 0;

    // 모든 주차 데이터 불러오기
    db.ref("weeks").once("value")
        .then(snapshot => {
            const weeksData = snapshot.val() || {};
            const weekKeys = Object.keys(weeksData);

            if (weekKeys.length === 0) {
                closeLoadingIndicator();
                alert("마이그레이션할 데이터가 없습니다.");
                return;
            }

            console.log(`마이그레이션 시작: ${weekKeys.length}개 주차 데이터 발견`);

            // 모든 이미지 개수 계산
            weekKeys.forEach(weekKey => {
                const weekData = weeksData[weekKey];
                if (!weekData.images) return;

                Object.keys(weekData.images).forEach(day => {
                    const dayImages = weekData.images[day];
                    if (!dayImages || !Array.isArray(dayImages)) return;

                    dayImages.forEach(img => {
                        if (img.data && !img.url) {
                            totalImages++;
                        }
                    });
                });
            });

            console.log(`총 ${totalImages}개 이미지 마이그레이션 필요`);

            if (totalImages === 0) {
                closeLoadingIndicator();
                alert("마이그레이션할 이미지가 없습니다.");
                return;
            }

            // 각 주차별 순차적으로 처리
            const processWeek = async (weekIndex) => {
                if (weekIndex >= weekKeys.length) {
                    // 모든 주차 처리 완료
                    console.log("마이그레이션 완료 결과:");
                    console.log(`- 총 이미지: ${totalImages}`);
                    console.log(`- 성공: ${successfulMigrations}`);
                    console.log(`- 실패: ${failedMigrations}`);

                    closeLoadingIndicator();

                    if (failedMigrations > 0) {
                        alert(`마이그레이션 완료: 총 ${totalImages}개 중 ${successfulMigrations}개 성공, ${failedMigrations}개 실패. 자세한 내용은 콘솔을 확인하세요.`);
                    } else {
                        alert(`마이그레이션 완료: 총 ${totalImages}개 이미지가 성공적으로 처리되었습니다.`);
                    }

                    // 페이지 새로고침
                    location.reload();
                    return;
                }

                const weekKey = weekKeys[weekIndex];
                const weekData = weeksData[weekKey];

                if (!weekData.images) {
                    // 이미지가 없는 주차는 건너뛰기
                    return processWeek(weekIndex + 1);
                }

                console.log(`${weekKey} 주차 처리 중...`);

                // 해당 주차의 모든 요일 처리
                const days = Object.keys(weekData.images);

                for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
                    const day = days[dayIndex];
                    const dayImages = weekData.images[day];

                    if (!dayImages || !Array.isArray(dayImages)) continue;

                    // 각 이미지 처리
                    for (let imgIndex = 0; imgIndex < dayImages.length; imgIndex++) {
                        const img = dayImages[imgIndex];

                        // base64 데이터가 있고 URL이 없는 경우만 마이그레이션
                        if (img.data && !img.url) {
                            try {
                                await processSingleImage(img.data, weekKey, day, img.fileName, imgIndex);
                                successfulMigrations++;
                            } catch (error) {
                                console.error(`[오류] ${weekKey}/${day}/${img.fileName} 마이그레이션 실패:`, error);
                                failedMigrations++;
                            }

                            processedImages++;
                            const percentComplete = Math.round((processedImages / totalImages) * 100);
                            showLoadingIndicator(`기존 이미지 마이그레이션 중... (${percentComplete}%)`);
                        }
                    }
                }

                // 다음 주차 처리
                return processWeek(weekIndex + 1);
            };

            // 마이그레이션 시작
            processWeek(0);
        })
        .catch(error => {
            console.error("주차 데이터 로드 실패:", error);
            closeLoadingIndicator();
            alert(`마이그레이션 실패: ${error.message}`);
        });
}

/**
 * 단일 이미지를 스토리지로 마이그레이션
 * @param {string} base64Data - Base64 인코딩된 이미지 데이터
 * @param {string} weekKey - 주차 키 (ex: "2025-3-1")
 * @param {string} day - 요일
 * @param {string} fileName - 파일 이름
 * @param {number} index - 이미지 인덱스
 * @returns {Promise} - 마이그레이션 작업 Promise
 */
function processSingleImage(base64Data, weekKey, day, fileName, index) {
    return new Promise((resolve, reject) => {
        try {
            console.log(`이미지 처리 중: ${weekKey}/${day}/${fileName}`);

            // 유효한 Base64 데이터인지 확인
            if (!base64Data || typeof base64Data !== 'string') {
                reject(new Error("유효하지 않은 이미지 데이터"));
                return;
            }

            // Base64 데이터에서 헤더와 콘텐츠 분리
            let base64Content;
            let mimeType;

            if (base64Data.startsWith('data:')) {
                // 데이터 URL 형식 (예: "data:image/jpeg;base64,/9j/4AAQ...")
                const parts = base64Data.split(',');
                if (parts.length !== 2) {
                    reject(new Error("잘못된 Base64 데이터 형식"));
                    return;
                }

                mimeType = parts[0].split(':')[1].split(';')[0];
                base64Content = parts[1];
            } else {
                // 순수 Base64 문자열인 경우 MIME 타입을 추측 (기본: JPEG)
                base64Content = base64Data;
                mimeType = 'image/jpeg';
            }

            // Base64를 Blob으로 변환
            const byteString = atob(base64Content);
            const arrayBuffer = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(arrayBuffer);

            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }

            // 파일명이 없는 경우 기본 파일명 생성
            const safeFileName = fileName || `image-${day}-${index}.jpg`;

            // 확장자 지정
            let finalFileName = safeFileName;
            if (!finalFileName.includes('.')) {
                const ext = mimeType.split('/')[1] || 'jpg';
                finalFileName = `${finalFileName}.${ext}`;
            }

            const blob = new Blob([arrayBuffer], { type: mimeType });

            // Firebase Storage에 업로드
            const storagePath = `images/${weekKey}/${day}/${finalFileName}`;
            const storageRef = storage.ref(storagePath);

            storageRef.put(blob)
                .then(snapshot => {
                    console.log(`스토리지 업로드 성공: ${storagePath}`);
                    return snapshot.ref.getDownloadURL();
                })
                .then(downloadURL => {
                    console.log(`다운로드 URL 획득: ${downloadURL}`);

                    // Realtime Database 업데이트 - URL 추가
                    return db.ref(`weeks/${weekKey}/images/${day}/${index}`).update({
                        url: downloadURL,
                        storagePath: storagePath
                    });
                })
                .then(() => {
                    console.log(`데이터베이스 업데이트 성공: ${weekKey}/${day}/${index}`);

                    // 성공적으로 처리 완료
                    resolve({
                        weekKey,
                        day,
                        index,
                        fileName: finalFileName
                    });
                })
                .catch(error => {
                    console.error(`스토리지 업로드 또는 DB 업데이트 실패: ${error.message}`);
                    reject(error);
                });
        } catch (error) {
            console.error(`이미지 처리 중 예외 발생: ${error.message}`);
            reject(error);
        }
    });
}

/**
 * Base64 인코딩된 이미지를 Firebase Storage로 마이그레이션
 * @param {string} base64Data - Base64 인코딩된 이미지 데이터
 * @param {string} weekKey - 주차 키 (ex: "2025-3-1")
 * @param {string} day - 요일
 * @param {string} fileName - 파일 이름
 * @param {number} index - 이미지 인덱스
 * @returns {Promise} - 마이그레이션 작업 Promise
 */
function migrateBase64ImageToStorage(base64Data, weekKey, day, fileName, index) {
    return new Promise((resolve, reject) => {
        try {
            // Base64 데이터에서 헤더 제거 (예: "data:image/jpeg;base64,")
            const base64Content = base64Data.split(',')[1];
            if (!base64Content) {
                reject(new Error("Invalid base64 data"));
                return;
            }

            // Base64를 Blob으로 변환
            const byteString = atob(base64Content);
            const mimeString = base64Data.split(',')[0].split(':')[1].split(';')[0];
            const arrayBuffer = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(arrayBuffer);

            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }

            const blob = new Blob([arrayBuffer], { type: mimeString });

            // Firebase Storage에 업로드
            const storagePath = `images/${weekKey}/${day}/${fileName}`;
            const storageRef = storage.ref(storagePath);

            storageRef.put(blob)
                .then(snapshot => snapshot.ref.getDownloadURL())
                .then(downloadURL => {
                    // Realtime Database 업데이트 - URL 추가 및 기존 데이터 삭제
                    db.ref(`weeks/${weekKey}/images/${day}/${index}`).update({
                        url: downloadURL,
                        storagePath: storagePath,
                        data: null // 기존 base64 데이터 제거
                    })
                        .then(() => {
                            resolve({
                                weekKey,
                                day,
                                index,
                                url: downloadURL,
                                storagePath
                            });
                        })
                        .catch(error => {
                            reject(error);
                        });
                })
                .catch(error => {
                    reject(error);
                });
        } catch (error) {
            reject(error);
        }
    });
}
