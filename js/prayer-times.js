/* Tasneem Prayer Times — offline astronomical calculator */
(function (global) {
  'use strict';
  var D2R=Math.PI/180,R2D=180/Math.PI;
  var METHODS={
    egyptian:{name:'الهيئة المصرية',fajr:19.5,isha:17.5},
    muslimWorld:{name:'رابطة العالم الإسلامي',fajr:18,isha:17},
    ummAlQura:{name:'أم القرى',fajr:18.5,isha:90},
    isna:{name:'ISNA',fajr:18,isha:17},
    karachi:{name:'كراتشي',fajr:18,isha:18},
    kuwait:{name:'الكويت',fajr:18,isha:17.5},
    qatar:{name:'قطر',fajr:18,isha:90},
    dubai:{name:'دبي',fajr:18.2,isha:18.2}
  };
  function sin(x){return Math.sin(x*D2R)} function cos(x){return Math.cos(x*D2R)} function tan(x){return Math.tan(x*D2R)}
  function acos(x){return Math.acos(Math.max(-1,Math.min(1,x)))*R2D}
  function dayOfYear(d){var y=d.getFullYear(),start=new Date(y,0,0);return Math.floor((d-start)/86400000)}
  function jdDay(d){return dayOfYear(d)}
  function solar(d,lat,lng,angle,afternoonFactor,afterNoon){
    var n=jdDay(d), g=2*Math.PI/365*(n-1);
    var eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
    var dec=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
    var tz=-d.getTimezoneOffset()/60;
    var noon=720-4*lng-eq+tz*60;
    var ha;
    if(afterNoon && afternoonFactor){
      var alt=Math.atan(1/(afternoonFactor+tan(Math.abs(lat*D2R-dec)*R2D)))*R2D;
      ha=acos((sin(alt)-sin(lat)*Math.sin(dec))/(cos(lat)*Math.cos(dec)));
    } else {
      ha=acos((sin(angle)-sin(lat)*Math.sin(dec))/(cos(lat)*Math.cos(dec)));
    }
    if (angle === 0 && !afternoonFactor) return (function(){var base0=new Date(d.getFullYear(),d.getMonth(),d.getDate()); base0.setMinutes(noon,0,0); return base0;})();
    var minutes=noon+(afterNoon?4*ha:-4*ha);
    var base=new Date(d.getFullYear(),d.getMonth(),d.getDate());
    base.setMinutes(minutes,0,0); return base;
  }
  function calculate(o){
    o=o||{}; var d=o.date?new Date(o.date):new Date(), lat=+o.lat,lng=+o.lng;
    var m=METHODS[o.method]||METHODS.egyptian, adjust=o.adjust||{};
    var fajr=solar(d,lat,lng,-m.fajr), sunrise=solar(d,lat,lng,-0.833), sunset=solar(d,lat,lng,-0.833,null,true);
    var noon=solar(d,lat,lng,0,null,true); var asrFactor=o.asr==='hanafi'?2:1;
    var asr=solar(d,lat,lng,0,asrFactor,true); var isha;
    if(m.isha>=89) isha=new Date(sunset.getTime()+90*60000); else isha=solar(d,lat,lng,-m.isha,null,true);
    var out={fajr:fajr,sunrise:sunrise,dhuhr:noon,asr:asr,maghrib:sunset,isha:isha};
    Object.keys(out).forEach(function(k){out[k]=new Date(out[k].getTime()+((adjust[k]||0))*60000);});
    return out;
  }
  function qiblaBearing(lat,lng){
    var la=lat*D2R, lo=lng*D2R, ka=21.422487*D2R, ko=39.826206*D2R;
    return (Math.atan2(Math.sin(ko-lo),Math.cos(la)*Math.tan(ka)-Math.sin(la)*Math.cos(ko-lo))*R2D+360)%360;
  }
  function qiblaDistanceKm(lat,lng){
    var la1=lat*D2R,lo1=lng*D2R,la2=21.422487*D2R,lo2=39.826206*D2R;
    var a=Math.sin((la2-la1)/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin((lo2-lo1)/2)**2;
    return Math.round(6371.0088*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
  }
  global.PrayerTimes={METHODS:METHODS,calculate:calculate,qiblaBearing:qiblaBearing,qiblaDistanceKm:qiblaDistanceKm};
})(window);
