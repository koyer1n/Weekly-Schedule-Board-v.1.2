/**
 * Schedule data management functionality
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

    // Save images for each day
    days.forEach(day => {
        const dayImages = [];
        const imageContainer = document.getElementById(`${day}-images`);

        imageContainer.querySelectorAll('.image-item').forEach(item => {
            const fileName = item.querySelector('.image-filename').textContent;
            const imageData = item.querySelector('.image-data').value;

            dayImages.push({
                fileName: fileName,
                data: imageData
            });
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
            alert("Failed to save schedule.");
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
                    console.error("Failed to update last schedule:", error);
                }
            });

            document.getElementById("lastUpdated").innerText = `Last Updated: ${lastUpdated}`;
            alert("Schedule saved successfully.");

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

    // 이미지 저장
    days.forEach(day => {
        const dayImages = [];
        const imageContainer = document.getElementById(`${day}-images`);

        imageContainer.querySelectorAll('.image-item').forEach(item => {
            const fileName = item.querySelector('.image-filename').textContent;
            const imageData = item.querySelector('.image-data').value;

            dayImages.push({
                fileName: fileName,
                data: imageData
            });
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
            return;
        }

        // 주차별 데이터가 없으면 기본 schedule 데이터 확인
        db.ref("schedule").once("value", snapshot => {
            const defaultData = snapshot.val();

            // 기본 데이터도 없으면 초기화
            if (!defaultData) {
                clearScheduleData();
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

    // 이미지 데이터 불러오기
    if (data.images) {
        days.forEach(day => {
            const imageContainer = document.getElementById(`${day}-images`);
            imageContainer.innerHTML = '';

            if (data.images[day] && data.images[day].length > 0) {
                imageContainer.classList.remove('hidden');

                data.images[day].forEach((img, index) => {
                    const imageItem = document.createElement('div');
                    imageItem.className = 'image-item mb-2';

                    // 성능 개선: 이미지 메타데이터만 표시하고, 클릭 시 실제 데이터 로드
                    if (loadMetadataOnly) {
                        // 이미지 ID 생성 (고유 식별자)
                        const imageId = `${day}-img-${index}`;

                        // In view mode, show clickable filenames for lazy loading
                        imageItem.innerHTML = `
                            <span class="image-filename cursor-pointer text-blue-500 underline"
                                  onclick="loadAndShowImage('${day}', ${index}, '${img.fileName}')">${img.fileName}</span>
                        `;
                    } else {
                        // 편집 모드 등에서는 이전 방식 유지 (이미지 데이터 포함)
                        imageItem.innerHTML = `
                            <span class="image-filename cursor-pointer text-blue-500 underline"
                                  onclick="showImagePopup('${img.fileName}', '${img.data}')">${img.fileName}</span>
                            <input type="hidden" class="image-data" value="${img.data}">
                        `;
                    }

                    imageContainer.appendChild(imageItem);
                });
            } else {
                imageContainer.classList.add('hidden');
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
