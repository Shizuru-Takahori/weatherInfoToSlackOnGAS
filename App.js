function GetWeather() {
  const settingsJson = ReadJson('settings.json');
  const accessToken = settingsJson["openWeatherMap"]["token"];

  const url = 'http://api.openweathermap.org/data/2.5/forecast?';
  const cityList = settingsJson["openWeatherMap"]["cityList"];

  const sheetId = settingsJson["spreadsheet"]["weather"];
  
  //cntはユニット数.１ユニット３時間.24h=8unit
  //今の時刻から0時までの時間+24時間でユニット数を求める
  const today = Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm:ss');
  const hour = Utilities.formatDate(new Date(), 'JST', 'HH');
  const diff = Math.ceil((24 - hour)/3);
  //欲しい時間帯を指定
  const startHour = Math.floor(settingsJson["specifiedHour"]["startHour"]/3)
  const endHour = Math.floor((24 - (settingsJson["specifiedHour"]["endHour"]))/3)

  Logger.log('starthour: %s, endHour: %s', startHour, endHour)

  //欲しいユニット数を入力
  const cnt = diff + 8;

  //cityListの数だけ繰り返し
    for(let i = 0; i<cityList.length; i++){
    
    const city = cityList[i];

    const request = url + city + '&units=metric&lang=ja&cnt=' + cnt + '&APPID=' + accessToken;
    console.log(request)

    const responseJson = JSON.parse(UrlFetchApp.fetch(request).getContentText());

    //配列に格納
    header = ['update','date','rain','feels like','description'];
    
    info = [];
    rainInfo = [];

    //最大雨量用の配列
    maxRain = Array.from(header);

    //headerの'rain'を0に設定
    maxRain.splice(2, 1, 0);

    const name = responseJson['city']['name'];

    //受け取った気象情報から配列に格納
    for(let k = diff + startHour; k<(cnt - endHour); k++){

      infoTemp = [];
      rainTemp = [];
      infoTemp[0] = today;
      infoTemp[1] = UnixTime(responseJson['list'][k]['dt']);      
      infoTemp[3] = responseJson['list'][k]['main']['feels_like'];
      infoTemp[4] = responseJson['list'][k]['weather'][0]['description'];

      rainTemp = responseJson['list'][k]['weather'][0]['description'];

      //rainは雨が降るときにしか存在しない
      try{
        //雨の時間だけの配列
        infoTemp[2] = responseJson['list'][k]['rain']['3h'] ;
        rainInfo.push(infoTemp);

        //最大雨量の判定
        if(infoTemp[2] > maxRain[2]){
          maxRain = infoTemp;
        }
      }catch(e){
        infoTemp[2] = 0;
      }

      info.push(infoTemp);
    }

    //スプシに書き込み
    WriteSpreadSheet(sheetId, name, header, info)

    //雨の処理
    if(rainInfo.length > 0){
      console.log('%sは雨', name)
      //グラフの処理
      const chartImg = SetChart(sheetId, name, info);

      //slackの処理
      const slackToken = settingsJson["slack"]["token"];
      const channelId = settingsJson["slack"]["channelId"];
      const message = RainMessage(name, maxRain);      
      PostSlack(slackToken, channelId, message, chartImg)
      //test7(slackToken, channelId, message)
    }
    
  }

}


//Jsonを読み込む関数
//参考 https://qiita.com/msnaru/items/512157e7b98a999c53a5, https://auto-worker.com/blog/?p=3760
function ReadJson(fileName){ 
  //jsonの入っているフォルダを探す
  const folderName = 'weatherBot';
  const folderId = DriveApp.getFoldersByName(folderName).next().getId();

  const file = DriveApp.getFolderById(folderId).getFilesByName(fileName).next();
  const jsonData = file.getBlob().getDataAsString('utf8');
  const json = JSON.parse(jsonData);

  return json;
}


//unixtimeをJstに変換する関数
function UnixTime(unixTime){
  const date = new Date(unixTime * 1000);
  const jstTime = Utilities.formatDate(date, "JST", "yyyy/MM/dd HH:mm:ss");

  return jstTime
}


//シートに書き込む関数
function WriteSpreadSheet(sheetId, sheetName, sheetHeader, dataArray){

  const spreadsheet = SpreadsheetApp.openById(sheetId);
  
  //指定シート名のシートがあるか確認し無ければ作成
  try{
    
    //loggerでシート名が表示できなければcatch(e),getSheetByNameはsheetNameが無くとも動く
    sheet = spreadsheet.getSheetByName(sheetName);
    Logger.log(sheet.getSheetName());

  }catch(e){
    //シートを作成
    sheet = spreadsheet.insertSheet();
    sheet.setName(sheetName);
    console.log('%sのシート作成', sheetName)

    //ヘッダーを作成
    sheet.getRange(1, 1, 1, 5).setValues([sheetHeader]);

    //日付の表示形式を変更
    sheet.getRange('A:B').setNumberFormat('MM/dd HH:mm')

  }

  //シート全体の最終行を取得
  const lastRow = sheet.getLastRow();

  //書き込み
  sheet.getRange(lastRow + 1, 1, dataArray.length, dataArray[0].length).setValues(dataArray)
}


//slackに通知する関数
function PostSlack(token, channelId, message, chartImg){

  const url = 'https://slack.com/api/files.upload';

    const payload = {
      'token': token,
      'channels': channelId,
      'file': chartImg,
      'initial_comment': message,
      'filename': 'chartImg.png'
    };
    
    const parameters = {
      'method'  : 'post',
      'payload' : payload
    };
    
    Logger.log(JSON.parse(UrlFetchApp.fetch(url, parameters)));

}

//slackのメッセージを作成する関数
function RainMessage(name, maxRain){
  //メッセージを作成
  const endRainTime = new Date(maxRain[1]).getHours();

  const timeSeparate = {
    3: "未明",
    6: "明け方",
    9: "朝",
    12:	"昼前",
    15:	"昼過ぎ",
    18:	"夕方",
    21:	"夜のはじめ頃",
    0:	"夜遅く"
  }

  for(let key in timeSeparate){
    if(key == endRainTime){
      rainTime = timeSeparate[key] +(endRainTime - 3) + '時から' + endRainTime + 'にかけて最も雨が強く､';
      break
    }
  }

  message =(
  '明日の' + name + 'は' +maxRain[4] + 'の予報です｡\n\n' + 
  rainTime + '１時間あたり' + Math.round((maxRain[2]/3)*100)/100 + 'mmの雨が降る予想です｡\n\n' +
  '予想体感気温は' + maxRain[2] + '℃です｡'
  )
  
  return message
}


//グラフを作る関数
function SetChart(sheetId, sheetName, info){

  const spreadsheet = SpreadsheetApp.openById(sheetId);
  const sheet = spreadsheet.getSheetByName(sheetName);

  //グラフをリセット
  const oldCharts = sheet.getCharts();
  for (let i in oldCharts) {
  sheet.removeChart(oldCharts[i]);
  }

  //infoからrangeを作成
  const startRow = sheet.getLastRow() - info.length + 1;
  const range = sheet.getRange(startRow, 2, info.length, 3)

  //グラフの作成
  const chart=sheet.newChart()
    .addRange(range)
    .setPosition(2,8,0,0)
    .setOption('width',800)   
    .setOption('title','降水量(3h,mm)と体感温度')

    .asComboChart()
    .setOption('seriesType', 'line')

    .setOption ('vAxes.0.viewWindow.min', 0)//最小値と最大値の設定
    .setOption ('vAxes.0.viewWindow.max', 21.0)

    .setOption("series", {1: {targetAxisIndex: 1}})//第2系列は右のY軸を使用
    .setOption ('vAxes.1.viewWindow.min', 0)
    .setOption ('vAxes.1.viewWindow.max', 30)
    .setOption('vAxis.format', 'short')
    .build()
  sheet.insertChart(chart);

  //画像の作成
  const charts = sheet.getCharts();
  //const chartImg = charts[0].getBlob().getAs('image/png').setName("chartImg.png");

  const chartImg = chart.getBlob().getAs('image/png');
  return chartImg

}
