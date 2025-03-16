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

    // 저장된 데이터 확인
    db.ref("schedule").once("value", snapshot => {
        const data = snapshot.val();
        if (data) {
            console.log("저장된 데이터 로드:", data);
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
                        console.log(`1. 저장된 날짜 범위 사용: ${data.dateRange}`);
                    } else {
                        // 파싱 실패 시 현재 날짜 기준으로 초기화
                        initializeCurrentDate();
                    }
                } else {
                    // 파싱 실패 시 현재 날짜 기준으로 초기화
                    initializeCurrentDate();
                }
            } else {
                // 날짜 범위가 없으면 현재 날짜 기준으로 초기화
                initializeCurrentDate();
            }

            // 마지막 업데이트 정보 표시
            document.getElementById("lastUpdated").innerText = `Last Updated: ${data.lastUpdated}`;

            // 일정 데이터 표시
            displayScheduleData(data);

            // 각 요일별 날짜 표시 업데이트 (시작일 기준)
            updateDayDates(currentStartDate);
        } else {
            console.log("저장된 데이터 없음, 현재 날짜 기준으로 초기화");
            // 데이터가 없는 경우 현재 날짜 기준으로 초기화
            initializeCurrentDate();

            // 각 요일별 날짜 표시 업데이트 (시작일 기준)
            updateDayDates(currentStartDate);
        }

        // 최종 UI 상태 확인
        const finalMonth = document.getElementById("month").innerText;
        const finalWeek = document.getElementById("week").innerText;
        const finalDateRange = document.getElementById("date-range").innerText;
        console.log(`최종 UI 상태: ${finalMonth} ${finalWeek}주차, 날짜: ${finalDateRange}`);
    });
};
