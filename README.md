# weatherInfoToSlackOnGAS
openweathermapから翌日の雨情報をGASでslackに通知するアプリ  
<br>
![image](https://user-images.githubusercontent.com/97940779/166614603-aea3d31f-aa45-4b7b-b8b8-306c8453d54e.png)  
<br>
<b>詳しい説明はこちらから<b>  
https://qr.ae/pvYn5g
<br>
# Installation
1. GoogleAppsScriptに保存し､Webアプリとしてデプロイします｡  URLは控えておいてください｡
2. フォルダ"weatherBot"をGoogleDriveに保存します｡
4. フォルダ"weatherBot"内のSeetings.jsonを編集します｡<br>
<br><br>
# settings.jsonの書き方
### "specifiedHour"
予報時間を指定します｡  
<br>
例)朝9時から夜21時間の雨予報が知りたい  
"startHour"に"9", "endHour"に"21"と入力  
※24時間表記  

### ”openWeatherMapopen"
"token"にopenWeatherMapのアクセストークンを入力  
"cityList"には欲しい地域を入力  
<br>
表記は
- zip=郵便番号
- lat=緯度&ion=経度
- id=都市ID
- q=都市名
に対応しています｡  
観測地点は[ここから](https://openweathermap.org/weathermap?basemap=map&cities=true&layer=none&lat=43.0117&lon=141.3762&zoom=10)入手できます｡  
都市IDは[ここから](http://bulk.openweathermap.org/sample/)入手できます｡  

### "slack"
"token"にslackのAPIトークンを入力､"channelId"にポストしたいチャンネルの名前かIDを入力  

### "spreadsheet"
天気情報を入力したいGoogleスプレッドシートのIDを入力
