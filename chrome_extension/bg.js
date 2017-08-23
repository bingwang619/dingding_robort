var track_sites = ["zhihu.com"]
var GMT = +8
var MINUTE_PER_DAY = 1440
var TIMEPACE = 5 * 60
var NOTIFY_URL = "https://oapi.dingtalk.com/robot/send?access_token="
    + "c6d5a2936381dfc29394f3c336bea5fad962d90ffd31809exxxxxxxxxxxxx"
var MOBILE_NUMBER = "176xxxxx619"

initLocalStorage();

function initLocalStorage(){
    localStorage.clear();
    localStorage["is_idle"] = "false";
    localStorage["last_site"] = "null";
    localStorage["last_time"] = timeNow();
    localStorage["total_elapsed_time"] = 0;
    localStorage["min_threshood"] = TIMEPACE;
    for (var i in track_sites){
        localStorage[track_sites[i]] = JSON.stringify({"elapsed_time": 0});
    }
}

function timeNow(){
    return Math.round(Date.now()/1000) + GMT * 3600;
}

function minLeftMidnight(){
    return MINUTE_PER_DAY - Math.round(timeNow()/60) % MINUTE_PER_DAY
}

function notifyDingding(msg){
    $.ajax({
        type: "POST",
        beforeSend: function(request) {
            request.setRequestHeader("Content-Type",
                "application/json; charset=utf-8");
        },
        url: NOTIFY_URL,
        data: JSON.stringify({
            "msgtype": "text",
            "text": {
                "content": msg
            },
            "at": {
                "atMobiles": [MOBILE_NUMBER]
            }
        }),
        success: function(return_msg){
            console.log(return_msg);
        }
    });
}

function fireNotification(){
    let elapsed_time = parseInt(localStorage["min_threshood"]) / 60
    msg = "今天你已经刷了" + elapsed_time + "分钟知乎了。" 
    console.log(msg);
    alert(msg);
    notifyDingding(msg);
    localStorage["min_threshood"] = parseInt(localStorage["min_threshood"]) + TIMEPACE;
}

function updateLocalStorageTime(){
    var domain = localStorage["last_site"];
    var site_log = JSON.parse(localStorage[domain]);
    timedelta = timeNow() - parseInt(localStorage["last_time"]);
    site_log["elapsed_time"] = parseInt(site_log["elapsed_time"]) + timedelta;
    console.log(domain, "elapsed_time: ", site_log["elapsed_time"]);
    localStorage[domain] = JSON.stringify(site_log);
    localStorage["total_elapsed_time"] = parseInt(localStorage["total_elapsed_time"]) + timedelta;
    if(parseInt(localStorage["total_elapsed_time"]) > parseInt(localStorage["min_threshood"])){
        fireNotification();
    }
    localStorage["last_time"] = timeNow();
}

function addTimeDelta(domain){
    var timedelta = 1;
    if(localStorage["last_site"] == "null" && domain != "null"){
        localStorage["last_site"] = domain;
        localStorage["last_time"] = timeNow();
    }else if(localStorage["last_site"] != "null"){
        updateLocalStorageTime();
        localStorage["last_site"] = domain;
    }
}

function updateDomin(domain){
    var in_list = false;
    for (var i in track_sites){
        if(domain.match(track_sites[i])){
            addTimeDelta(track_sites[i]);
            in_list = true;
            break
        }
    }
    if(in_list == false){
        addTimeDelta("null");
    }
}

function checkCurrentTab(){
    chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs){
        if (tabs.length == 1){
            var url = new URL(tabs[0].url);
            var domain = url.hostname;
            updateDomin(domain);
        }
    })
}

chrome.tabs.onUpdated.addListener(checkCurrentTab)
chrome.tabs.onActivated.addListener(checkCurrentTab)
chrome.windows.onFocusChanged.addListener(function(windowId){
    if (windowId == chrome.windows.WINDOW_ID_NONE){
        updateDomin("null");
    } else {
        checkCurrentTab();
    }
})
chrome.idle.onStateChanged.addListener(function(idleState){
    if (idleState == "active"){
        localStorage["is_idle"] = false;
        checkCurrentTab();
    }else{
        localStorage["is_idle"] = true;
        updateDomin("null");
    }
})

chrome.alarms.create("mignight_clear",
        {delayInMinutes: minLeftMidnight(), periodInMinutes: MINUTE_PER_DAY});
chrome.alarms.create("minute_check", {periodInMinutes: 1})
chrome.alarms.onAlarm.addListener(function(alarm){
    if (alarm.name == "mignight_clear"){
        console.log("clear localStorage");
        initLocalStorage();
    }else if (alarm.name == "minute_check"){
        console.log("minute_check");
        checkCurrentTab();
        //console.log(localStorage["total_elapsed_time"]);
    }
})
