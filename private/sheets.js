var SHEET_NAME = "Sheet1";
         
var SCRIPT_PROP = PropertiesService.getScriptProperties();

function doGet(e){
  return handleResponse(e);
}
 
function handleResponse(e) {
  var lock = LockService.getPublicLock();
  lock.waitLock(30000);
   
  try {
    var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
    var sheet = doc.getSheetByName(SHEET_NAME);
    var twoDArray = [];
    var res = decodeURIComponent(e.parameter.data).split('\n');
    
    for (var i = 0; i < res.length; i++) {
      twoDArray.push(res[i].split(','));
    }
    
    sheet.clearContents();
    
    var arr = [];
    var c = [];
    for (var i = 0; i < twoDArray.length - 1; i++) {
      c = [];
      for (var j = 0; j < twoDArray[0].length; j++){
        c.push(twoDArray[i][j]);
      }
      arr.push(c);
    }
 
    sheet.getRange(1, 1, i, j).setValues(arr);

    return ContentService
          .createTextOutput(JSON.stringify({"result":"success"}))
          .setMimeType(ContentService.MimeType.JSON);
  } catch(f){
    
    return ContentService
          .createTextOutput(JSON.stringify({"result":"error", "error": f + JSON.stringify(decodeURIComponent(e.parameter.data).split('\n'))}))
          .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function setup() {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    SCRIPT_PROP.setProperty("key", doc.getId());
    Logger.log(doc.getId());
}
