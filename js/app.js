/**
 * Main application initialization and global variables
 */

// Global variables
const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
let currentYear;
let currentMonth;
let currentWeek;
let currentStartDate;

/**
 * Initialize the application when the page loads
 */
window.onload = function() {
    // 파일 업로드 이벤트 리스너 설정
    days.forEach(day => {
        const fileInput = document.getElementById(`${day}-file`);
        fileInput.addEventListener('change', function(e) {
            handleFileSelect(e, day);
        });
    });

    // 먼저 현재 날짜를 기준으로 주차 정보 계산
    const today = new Date();
    const currentDateInfo = calculateCurrentWeekInfo(today);

    // 저장된 데이터 확인
    db.ref("schedule").once("value", snapshot => {
        const data = snapshot.val();

        if (data) {
            console.log("저장된 데이터 로드:", data);

            // 저장된 데이터의 주차 정보 파싱
            const savedYear = data.year || new Date().getFullYear();
            const savedMonth = getMonthNumber(data.month);
            const savedWeek = parseInt(data.week);

            let startDate;
            if (data.dateRange) {
                // 날짜 범위 파싱하여 시작일 계산
                const dateRangeParts = data.dateRange.split(' ~ ');
                if (dateRangeParts.length === 2) {
                    const startDateParts = dateRangeParts[0].split('.');
                    if (startDateParts.length === 2) {
                        const month = parseInt(startDateParts[0]) - 1; // 0-based month
                        const day = parseInt(startDateParts[1]);
                        startDate = new Date(savedYear, month, day);
                    }
                }
            }

            // 오늘 날짜가 저장된 주차에 포함되는지 확인
            const isCurrentWeek = isDateInWeek(today, startDate);

            if (isCurrentWeek) {
                // 저장된 주차가 현재 주차이면 저장된 데이터 사용
                currentYear = savedYear;
                currentMonth = savedMonth;
                currentWeek = savedWeek;
                currentStartDate = startDate;

                // UI 업데이트
                document.getElementById("month").innerText = data.month;
                document.getElementById("week").innerText = data.week;
                document.getElementById("date-range").innerText = data.dateRange;
                document.getElementById("lastUpdated").innerText = `Last Updated: ${data.lastUpdated}`;

                // 일정 데이터 표시
                displayScheduleData(data);
            } else {
                // 현재 날짜가 저장된 주차에 포함되지 않으면 현재 날짜 기준으로 초기화
                currentYear = currentDateInfo.year;
                currentMonth = currentDateInfo.month;
                currentWeek = currentDateInfo.week;
                currentStartDate = currentDateInfo.startDate;

                // UI 업데이트
                document.getElementById("month").innerText = getMonthName(currentMonth);
                document.getElementById("week").innerText = currentWeek;
                updateDateRange();

                // 해당 주차의 데이터 불러오기
                loadWeekData();
            }
        } else {
            console.log("저장된 데이터 없음, 현재 날짜 기준으로 초기화");
            // 데이터가 없는 경우 현재 날짜 기준으로 초기화
            currentYear = currentDateInfo.year;
            currentMonth = currentDateInfo.month;
            currentWeek = currentDateInfo.week;
            currentStartDate = currentDateInfo.startDate;

            // UI 업데이트
            document.getElementById("month").innerText = getMonthName(currentMonth);
            document.getElementById("week").innerText = currentWeek;
            updateDateRange();

            // 비어있는 일정으로 초기화
            clearScheduleData();
        }

        // 각 요일별 날짜 표시 업데이트
        updateDayDates(currentStartDate);

        // 최종 UI 상태 확인
        const finalMonth = document.getElementById("month").innerText;
        const finalWeek = document.getElementById("week").innerText;
        const finalDateRange = document.getElementById("date-range").innerText;
        console.log(`최종 UI 상태: ${finalMonth} ${finalWeek}주차, 날짜: ${finalDateRange}`);
    });
};

/**
 * 특정 날짜가 시작일로부터 7일 이내에 포함되는지 확인
 * @param {Date} date - 확인할 날짜
 * @param {Date} weekStartDate - 주의 시작일
 * @returns {boolean} - 포함 여부
 */
function isDateInWeek(date, weekStartDate) {
    if (!weekStartDate) return false;

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);

    return date >= weekStartDate && date <= weekEndDate;
}

/**
 * 현재 날짜를 기준으로 주차 정보 계산
 * @param {Date} today - 현재 날짜
 * @returns {Object} - 주차 정보
 */
function calculateCurrentWeekInfo(today) {
    // 현재 날짜의 주 시작일(월요일) 계산
    const startDate = new Date(today);
    const dayOfWeek = today.getDay(); // 0은 일요일, 1은 월요일...
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 주의 시작일(월요일)까지의 차이
    startDate.setDate(today.getDate() + diff);

    // 주의 중간 지점(수요일)을 기준으로 월 결정
    const midWeek = new Date(startDate);
    midWeek.setDate(startDate.getDate() + 2); // 월요일 + 2 = 수요일

    const year = midWeek.getFullYear();
    const month = midWeek.getMonth();

    // 해당 월의 첫째 날
    const firstDayOfMonth = new Date(year, month, 1);

    // 월의 첫째 날이 속한 주의 월요일 찾기
    const firstDayDayOfWeek = firstDayOfMonth.getDay();
    const daysToSubtract = firstDayDayOfWeek === 0 ? 6 : firstDayDayOfWeek - 1;
    const firstMondayOfMonth = new Date(firstDayOfMonth);
    firstMondayOfMonth.setDate(firstDayOfMonth.getDate() - daysToSubtract);

    // 주차 계산
    let week;

    // 첫 주가 이번 달에 속하는지 확인
    let firstWeekBelongsToMonth = false;
    if (firstMondayOfMonth.getMonth() !== month) {
        // 첫 주의 Working Day가 현재 달에 속하는지 확인
        for (let i = 0; i < 5; i++) {
            const day = new Date(firstMondayOfMonth);
            day.setDate(firstMondayOfMonth.getDate() + i);
            if (day.getMonth() === month && day.getFullYear() === year) {
                firstWeekBelongsToMonth = true;
                break;
            }
        }
    } else {
        firstWeekBelongsToMonth = true;
    }

    if (firstWeekBelongsToMonth) {
        // 첫 주가 이번 달에 속하면, 그 주부터 주차 계산
        const weeksFromStart = Math.floor((startDate - firstMondayOfMonth) / (7 * 24 * 60 * 60 * 1000));
        week = weeksFromStart + 1;
    } else {
        // 첫 주가 이전 달에 속하면, 다음 주부터 1주차로 계산
        const secondMondayOfMonth = new Date(firstMondayOfMonth);
        secondMondayOfMonth.setDate(firstMondayOfMonth.getDate() + 7);
        const weeksFromStart = Math.floor((startDate - secondMondayOfMonth) / (7 * 24 * 60 * 60 * 1000));
        week = weeksFromStart + 1;
    }

    // 주차가 0이나 음수로 계산되는 경우 방지
    if (week < 1) {
        week = 1;
    }

    return {
        year: year,
        month: month,
        week: week,
        startDate: startDate
    };
}
