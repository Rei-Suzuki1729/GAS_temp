const columnNumber = new Map([
  ['日付', 3],
  ['開始時刻', 4],
  ['終了時刻', 5]
]);

/**
 * 実行した日時を勤務開始として記録する
 */
function recordAttendance() {
  // 記録するシートの特定
  const sheet = SpreadsheetApp.getActive().getSheetByName('作業時間記録');

  // 日付が記録されている最新のセルを特定
  const topCellOfDate = sheet.getRange(1, columnNumber.get('日付'));
  Logger.log(`topCellOfDate: ${topCellOfDate.getA1Notation()}`);
  const lastCellOfDate = topCellOfDate.getNextDataCell(SpreadsheetApp.Direction.DOWN);
  Logger.log(`lastCellOfDate: ${lastCellOfDate.getA1Notation()}`);

  // 1行下の(空の)日付セルと開始時刻セルを特定
  const newCellOfDate = lastCellOfDate.offset(1, 0);
  Logger.log(`newCellOfDate: ${newCellOfDate.getA1Notation()}`);
  const newCellOfAttendanceTime = newCellOfDate.offset(0, columnNumber.get('開始時刻') - columnNumber.get('日付'));
  Logger.log(`newCellOfAttendanceTime: ${newCellOfAttendanceTime.getA1Notation()}`);
  
  // 現在時刻から日付セルと開始時刻セルに記録する文字列を生成
  const date = new Date();
  // ex. `'2021/10/1'`
  const dateString = `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()+1}`;
  Logger.log(`dateString: ${dateString}`);
  // ex. `'10:30'`
  const timeString = `${date.getHours()}:${date.getMinutes()}`;
  Logger.log(`timeString: ${timeString}`);

  // 日付セルと開始時刻セルに書き込む
  newCellOfDate.setValue(dateString);
  newCellOfAttendanceTime.setValue(timeString);
}

/**
 * 開始時刻が記録されている最新行に対して、
 * 実行した日時を勤務終了として記録する
 */
function recordLeaving() {
  // 記録するシートの特定
  const sheet = SpreadsheetApp.getActive().getSheetByName('作業時間記録');

  // 開始時刻が記録されている最新のセルを特定
  const topCellOfAttendanceTime = sheet.getRange(1, columnNumber.get('開始時刻'));
  Logger.log(`topCellOfAttendanceTime: ${topCellOfAttendanceTime.getA1Notation()}`);
  const lastCellOfAttendanceTime = topCellOfAttendanceTime.getNextDataCell(SpreadsheetApp.Direction.DOWN);
  Logger.log(`lastCellOfAttendanceTime: ${lastCellOfAttendanceTime.getA1Notation()}`);

  // 終了時刻セルを特定
  const newCellOfLeavingTime = lastCellOfAttendanceTime.offset(0, columnNumber.get('終了時刻') - columnNumber.get('開始時刻'));
  Logger.log(`newCellOfLeavingTime: ${newCellOfLeavingTime.getA1Notation()}`);
  
  // 現在時刻から終了時刻セルに記録する文字列を生成
  const date = new Date();
  // ex. `'10:30'`
  const timeString = `${date.getHours()}:${date.getMinutes()}`;
  Logger.log(`timeString: ${timeString}`);

  // 日付セルと開始時刻セルに書き込む
  newCellOfLeavingTime.setValue(timeString);
}