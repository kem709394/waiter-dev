var findIndex = function (array, field, value) {
  return array.findIndex(item => {
    return item[field] == value
  })
}

var getItem = function (array, field, value) {
  let temp = array.filter(item=>{
    return item[field] == value
  })
  if (temp.length>0){
    return temp[0]
  }
  return null
}

var objCopy = function (data) {
  return JSON.parse(JSON.stringify(data));
}

var toArray = function (string) {
  return string.trim().split(/\s+/)
}

var getDistance = function(lat1, lng1, lat2, lng2) {
  var radLat1 = lat1 * Math.PI / 180.0;
  var radLat2 = lat2 * Math.PI / 180.0;
  var a = radLat1 - radLat2;
  var b = lng1 * Math.PI / 180.0 - lng2 * Math.PI / 180.0;
  var s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
  s = s * 6378.137;// EARTH_RADIUS;
  return Math.round(s * 1000);
}

module.exports = {
  findIndex: findIndex,
  getItem: getItem,
  objCopy: objCopy,
  toArray: toArray,
  getDistance: getDistance
}