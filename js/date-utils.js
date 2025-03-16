/**
 * Date utility functions for handling calendar dates and week calculations
 */

// Month name conversion utilities
function getMonthName(monthNumber) {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    return months[monthNumber];
}

function getMonthNumber(monthName) {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    return months.indexOf(monthName);
}

// Calculate week number based on current date
function calculateWeekNumber() {
    // 현재 시작일(월요일)과 종료일(일요일)
    const weekStart = new Date(currentStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    console.log(`calculateWeekNumber - 기준일: ${weekStart.toLocaleDateString()}`);

    // Working Day(월~금) 검사
    const workingDays = [];
    for (let i = 0; i < 5; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        workingDays.push(day);
    }

    // Working Day 중에 1일이 있는지 확인 (새로운 달의 시작)
    let newMonthStart = false;
    for (const day of workingDays) {
        if (day.getDate() === 1) {
            const newMonth = day.getMonth();
            const newYear = day.getFullYear();

            console.log(`새로운 달 시작 감지: ${newYear}년 ${newMonth+1}월 1일`);
            currentMonth = newMonth;
            currentYear = newYear;
            currentWeek = 1;
            newMonthStart = true;
            break;
        }
    }

    // 새로운 달이 시작되지 않는 경우 - 기본 달 및 주차 계산
    if (!newMonthStart) {
        // 주의 중간 지점(수요일)을 기준으로 월 결정
        const midWeek = new Date(weekStart);
        midWeek.setDate(weekStart.getDate() + 2); // 월요일 + 2 = 수요일

        const midWeekMonth = midWeek.getMonth();
        const midWeekYear = midWeek.getFullYear();

        console.log(`중간 지점(수요일) 기준: ${midWeekYear}년 ${midWeekMonth+1}월 ${midWeek.getDate()}일`);
        currentMonth = midWeekMonth;
        currentYear = midWeekYear;

        // 해당 월의 첫째 날
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);

        // 월의 첫째 날이 속한 주의 월요일 찾기
        const firstMondayOfMonth = new Date(firstDayOfMonth);
        const dayOfWeek = firstDayOfMonth.getDay(); // 0=일, 1=월, ..., 6=토
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        firstMondayOfMonth.setDate(firstDayOfMonth.getDate() - daysToSubtract);

        // 첫째 날이 월~금 사이에 있는지 확인
        let firstWeekBelongsToMonth = false;
        if (firstMondayOfMonth.getMonth() !== currentMonth) {
            // 첫 주의 Working Day가 현재 달에 속하는지 확인
            for (let i = 0; i < 5; i++) {
                const day = new Date(firstMondayOfMonth);
                day.setDate(firstMondayOfMonth.getDate() + i);
                if (day.getMonth() === currentMonth && day.getFullYear() === currentYear) {
                    firstWeekBelongsToMonth = true;
                    break;
                }
            }
        } else {
            firstWeekBelongsToMonth = true;
        }

        console.log(`첫 주의 월요일: ${firstMondayOfMonth.toLocaleDateString()}, 현재 달에 속함: ${firstWeekBelongsToMonth}`);

        // 주차 계산
        let weeksFromStart;
        if (firstWeekBelongsToMonth) {
            // 첫 주가 이번 달에 속하면, 그 주부터 주차 계산
            weeksFromStart = Math.floor((weekStart - firstMondayOfMonth) / (7 * 24 * 60 * 60 * 1000));
            currentWeek = weeksFromStart + 1;
        } else {
            // 첫 주가 이전 달에 속하면, 다음 주부터 1주차로 계산
            const secondMondayOfMonth = new Date(firstMondayOfMonth);
            secondMondayOfMonth.setDate(firstMondayOfMonth.getDate() + 7);
            weeksFromStart = Math.floor((weekStart - secondMondayOfMonth) / (7 * 24 * 60 * 60 * 1000));
            currentWeek = weeksFromStart + 1;
        }

        // 주차가 0이나 음수로 계산되는 경우 방지
        if (currentWeek < 1) {
            currentWeek = 1;
        }

        console.log(`계산된 주차: ${currentWeek}주차`);
    }
}

// Update the date range display
function updateDateRange() {
    // 주의 시작일(월요일)
    const startDate = new Date(currentStartDate);

    // 주의 종료일(일요일) = 시작일 + 6일
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    // 날짜 포맷팅 (예: 3.10 ~ 3.16)
    const startStr = `${startDate.getMonth() + 1}.${startDate.getDate()}`;
    const endStr = `${endDate.getMonth() + 1}.${endDate.getDate()}`;
    const dateRangeStr = `${startStr} ~ ${endStr}`;

    // 화면에 표시
    document.getElementById("date-range").innerText = dateRangeStr;
}

// Initialize current date values
function initializeCurrentDate() {
    console.log("현재 날짜 기준으로 초기화 시작");
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth(); // 0-11

    // 현재 주의 시작일 계산 (월요일)
    currentStartDate = new Date(now);
    const dayOfWeek = now.getDay(); // 0은 일요일, 1은 월요일...
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 주의 시작일(월요일)까지의 차이
    currentStartDate.setDate(now.getDate() + diff);
    console.log(`2. 현재 시작일 계산: ${currentStartDate.toLocaleDateString()}`);

    // 주차 계산
    calculateWeekNumber();
    console.log(`3. 주차 계산 완료: ${getMonthName(currentMonth)} ${currentWeek}주차`);

    // 날짜 범위 계산
    updateDateRange();
    console.log(`4. 날짜 범위 계산: ${document.getElementById("date-range").innerText}`);

    // UI 업데이트
    document.getElementById("month").innerText = getMonthName(currentMonth);
    document.getElementById("week").innerText = currentWeek;
    console.log(`5. UI 업데이트 완료: ${getMonthName(currentMonth)} ${currentWeek}주차, 날짜: ${document.getElementById("date-range").innerText}`);
}

// Recalculate start date based on current month and week
function recalculateStartDate() {
    // 해당 월의 첫 번째 날
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);

    // 월의 첫째 날이 속한 주의 월요일 찾기
    const firstDayDayOfWeek = firstDayOfMonth.getDay();
    const diff = firstDayDayOfWeek === 0 ? -6 : 1 - firstDayDayOfWeek; // 월요일까지의 차이

    // 첫 주의 월요일 계산
    const firstMondayOfMonth = new Date(firstDayOfMonth);
    firstMondayOfMonth.setDate(firstDayOfMonth.getDate() + diff);

    // 현재 주차에 해당하는 월요일 계산
    currentStartDate = new Date(firstMondayOfMonth);
    currentStartDate.setDate(firstMondayOfMonth.getDate() + (currentWeek - 1) * 7);
}

// Update month and week information
function updateMonthAndWeek() {
    // 자연스러운 주차 계산 함수 호출
    calculateWeekNumber();
}

// Update UI elements with current date and week info
function updateUI() {
    // 월 이름 업데이트
    document.getElementById("month").innerText = getMonthName(currentMonth);

    // 주차 업데이트
    document.getElementById("week").innerText = currentWeek;

    // 날짜 범위 재확인 (주차와 월이 변경될 수 있으므로)
    updateDateRange();

    // 디버깅 로그
    console.log(`UI 업데이트: ${getMonthName(currentMonth)} ${currentWeek}주차, 날짜: ${document.getElementById("date-range").innerText}`);
}
