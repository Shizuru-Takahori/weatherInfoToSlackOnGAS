//Api用の関数
function doGet(e) {
  GetWeather()
  const result = JSON.stringify({status: "sucess"});
  return ContentService.createTextOutput(result);

}
