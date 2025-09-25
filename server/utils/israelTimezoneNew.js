// Test working timezone functions for Israel
function isIsraelDST(date) {
  const month = date.getMonth();
  return month >= 3 && month <= 8; // April-September = summer
}

function getIsraelTimezoneOffset(date) {
  return isIsraelDST(date) ? 3 : 2;
}

function utcToIsraelTime(utcDate) {
  const offset = getIsraelTimezoneOffset(utcDate);
  return new Date(utcDate.getTime() + (offset * 60 * 60 * 1000));
}

function israelTimeToUtc(israelDate) {
  const offset = getIsraelTimezoneOffset(israelDate);
  return new Date(israelDate.getTime() - (offset * 60 * 60 * 1000));
}

function logTimezoneInfo(label, utcTime) {
  const israelTime = utcToIsraelTime(utcTime);
  const offset = getIsraelTimezoneOffset(utcTime);
  const isDST = isIsraelDST(utcTime);
  
  console.log(`🕐 ${label}: UTC=${utcTime.toISOString()}, Israel=${israelTime.toLocaleString('he-IL')}, Offset=UTC+${offset}, Season=${isDST ? 'Summer' : 'Winter'}`);
}

module.exports = {
  isIsraelDST,
  getIsraelTimezoneOffset,
  utcToIsraelTime,
  israelTimeToUtc,
  logTimezoneInfo
};