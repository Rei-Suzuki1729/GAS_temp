/**
 * GAS Web アプリ で POST method での request を受け取った場合に call される
 * see: https://developers.google.com/apps-script/guides/web
 * 専ら Slack の interaction payloads を受け取るために使用する
 * see: https://api.slack.com/messaging/interactivity
 */
function doPost(e) {
  const postData = e.postData
  if (postData.type !== 'application/x-www-form-urlencoded') {
    throw new Error('Bad Request');
  }

  const request = JSON.parse(e.parameter.payload)
  switch (request.type) {
    case 'block_actions':
      // see: https://api.slack.com/reference/interaction-payloads/block-actions
      Logger.log('block_actions');
      handleSlackBlockActions_(request);
      return nullResponse_();
      break;
    default:
      Logger.log(`Unknown type: ${request.type}`);
      throw new Error('Bad Request');
  }
}

/**
 * Slack の interaction payloads のうち、 block_actions の場合の処理を行う
 * @param {object} request - interaction payloads の request payload
 */
function handleSlackBlockActions_(request) {
  const responseUrl = request.response_url;

  const actionIds = request.actions.map(action => action.action_id);
  actionIds.forEach(actionId => {
    switch (actionId) {
      // 出勤ボタンを押したとき
      case 'attendance':
        recordAttendance();
        notifySuccess_(responseUrl);
        break;
      default:
        Logger.log(`Unknown actionID: ${actionId}`);
        throw new Error('Bad Request');
    }
  });
}

/**
 * responseUrl に検知結果を投稿する
 * @param {string} responseUrl - Slack の interaction payloads の message response を行うための response_url
 */
function notifySuccess_(responseUrl) {
  const body = {
    text: 'ボタンの押下を検知しました.',
  }

  postSlackInteractionPayloadsResponse_(responseUrl, body)
}

/**
 * Interaction payloads の message response を行う
 */
function postSlackInteractionPayloadsResponse_(response_url, body) {
  const options = {
    method: 'post',
    contentType: 'application/json; charset=utf-8',
    payload: JSON.stringify(body)
  };
  Logger.log(options);

  response = UrlFetchApp.fetch(response_url, options);
  responseBody = JSON.parse(response.getContentText());
  if (!responseBody.ok) {
    Logger.log(response);
    throw new Error('Error occured.');
  }

  Logger.log(responseBody);
  return responseBody;
}

/**
 * 空 response を返す
 * @return {TextOutput}
 */
function nullResponse_() {
  const textOutput = ContentService.createTextOutput();
  return textOutput;
}

/**
 * sample message を Slack App と User の DM channel に投稿する
 */
function postSampleSlackDM() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const slackUserId = scriptProperties.getProperty('slackDMUserId');

  blocks = [blockOfAttendanceInput]
  postSlackMessage_(slackUserId, blocks);
}

/**
 * Slack Message を投稿する
 * @param {string} channelId - 投稿する channel の ID
 * @param {object[]} blocks - 投稿する Message の blocks
 * @return {string} Posted message's ts
 */
function postSlackMessage_(channelId, blocks) {
  const requestBody = {
    channel: channelId,
    blocks: blocks
  };

  const responseBody = postSlackApi_('chat.postMessage', requestBody);
  return responseBody.ts
}

/**
 * POST method を使用する Slack API を call する
 * @param {string} api - 呼び出す API 名
 * @param {object} requestBody
 * @return {object} Response body
 */
function postSlackApi_(api, requestBody) {
  const baseUrl = 'https://slack.com/api';
  const requestUrl = [baseUrl, api].join('/');

  const scriptProperties = PropertiesService.getScriptProperties();
  const slackToken = scriptProperties.getProperty('slackBotUserOAuthToken');

  const options = {
    method: 'post',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Authorization: `Bearer ${slackToken}`
    },
    payload: JSON.stringify(requestBody)
  };
  Logger.log(options);

  response = UrlFetchApp.fetch(requestUrl, options);
  responseBody = JSON.parse(response.getContentText());
  if (!responseBody.ok) {
    Logger.log(response);
    throw new Error('Error occured.');
  }

  Logger.log(responseBody);
  return responseBody;
}

/**
 * 出勤ボタンの block
 */
const blockOfAttendanceInput = {
			"type": "actions",
			"elements": [
				{
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "出勤"
					},
					"action_id": "attendance"
				}
			]
		}


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

