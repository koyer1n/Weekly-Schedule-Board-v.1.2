/**
 * Navigation functionality for moving between weeks
 */

/**
 * Navigate to the previous week
 */
function goToPreviousWeek() {
    if (isEditor) {
        // 편집 모드에서는 변경 사항 확인
        if (confirm("변경 사항이 저장되지 않을 수 있습니다. 계속하시겠습니까?")) {
            saveTempScheduleData(); // 임시 저장
        } else {
            return;
        }
    }

    // 현재 시작일에서 7일 빼기
    currentStartDate.setDate(currentStartDate.getDate() - 7);

    // 날짜 범위 먼저 업데이트 (currentStartDate 기준)
    updateDateRange();

    // 월과 주차 업데이트
    updateMonthAndWeek();

    // UI 업데이트
    updateUI();

    // 해당 주차의 데이터 불러오기
    loadWeekData();
}

/**
 * Navigate to the next week
 */
function goToNextWeek() {
    if (isEditor) {
        // 편집 모드에서는 변경 사항 확인
        if (confirm("변경 사항이 저장되지 않을 수 있습니다. 계속하시겠습니까?")) {
            saveTempScheduleData(); // 임시 저장
        } else {
            return;
        }
    }

    // 현재 시작일에서 7일 더하기
    currentStartDate.setDate(currentStartDate.getDate() + 7);

    // 날짜 범위 먼저 업데이트 (currentStartDate 기준)
    updateDateRange();

    // 월과 주차 업데이트
    updateMonthAndWeek();

    // UI 업데이트
    updateUI();

    // 해당 주차의 데이터 불러오기
    loadWeekData();
}
