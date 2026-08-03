// Code.gs - Google Apps Script للتعداد السكاني لقرية ذي الجمال
// يرجى لصق هذا الكود في Google Apps Script المرتبط بجدول جوجل الخاص بك، ثم نشره كـ Web App مع إمكانية الوصول للجميع "Anyone".

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetFamilies = getOrCreateSheet(ss, "الأسر");
    const sheetDependents = getOrCreateSheet(ss, "التابعين");
    
    const families = getSheetData(sheetFamilies);
    const dependents = getSheetData(sheetDependents);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      families: families,
      dependents: dependents
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (data.action === "sync") {
      const sheetFamilies = getOrCreateSheet(ss, "الأسر");
      const sheetDependents = getOrCreateSheet(ss, "التابعين");
      
      setSheetData(sheetFamilies, data.families, "families");
      setSheetData(sheetDependents, data.dependents, "dependents");
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "تمت المزامنة وحفظ البيانات بنجاح في جدول جوجل"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "الإجراء المطلوب غير معروف"
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === "الأسر") {
      sheet.appendRow(["م", "رب الأسرة", "المحلة", "عدد الأفراد", "رقم الجوال", "الإقامة", "مكان الإقامة", "الجنس", "اللقب", "الحالة الاجتماعية", "تاريخ الميلاد", "تاريخ الوفاة", "تاريخ الزواج", "كود الأسرة"]);
    } else if (name === "التابعين") {
      sheet.appendRow(["م", "الاسم", "اللقب", "صلة القرابة", "رقم الهاتف للفرد", "الرقم الوطني", "الإقامة", "تاريخ الميلاد", "الحالة الاجتماعية", "كود الأسرة"]);
    }
  }
  return sheet;
}

function getSheetData(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const lastCol = sheet.getLastColumn();
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  return values.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      let val = row[index];
      if (val instanceof Date) {
        val = val.toISOString().split("T")[0];
      }
      obj[header] = val;
    });
    return obj;
  });
}

function setSheetData(sheet, data, type) {
  sheet.clear();
  let headers = [];
  if (type === "families") {
    headers = ["م", "رب الأسرة", "المحلة", "عدد الأفراد", "رقم الجوال", "الإقامة", "مكان الإقامة", "الجنس", "اللقب", "الحالة الاجتماعية", "تاريخ الميلاد", "تاريخ الوفاة", "تاريخ الزواج", "كود الأسرة"];
  } else {
    headers = ["م", "الاسم", "اللقب", "صلة القرابة", "رقم الهاتف للفرد", "الرقم الوطني", "الإقامة", "تاريخ الميلاد", "الحالة الاجتماعية", "كود الأسرة"];
  }
  sheet.appendRow(headers);
  if (data && data.length > 0) {
    const rows = data.map(item => {
      return headers.map(h => item[h] !== undefined ? item[h] : "");
    });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}
