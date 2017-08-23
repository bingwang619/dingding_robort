// 这里其实可以增加更多的域名，比如 youtube.com 、weibo.com之类的，毕竟能刷的又不止知乎。
var track_sites = ["zhihu.com", "moegirl.org"]

// 时间按东八区的时间来算，主要是为了在每天零点清空数据用的。
var GMT = +8
var MINUTE_PER_DAY = 1440

// 每刷几分钟就给出提醒，这里是每 5 分钟就提醒一次。
var TIMEPACE = 5 * 60

//发送钉钉机器人的链接
var NOTIFY_URL = "https://oapi.dingtalk.com/robot/send?access_token="
    + "c6d5a2936381dfc29394f3c336bea5fad962d90ffd31809exxxxxxxxxxxxx"
var MOBILE_NUMBER = "176xxxxx619"

initLocalStorage();

function initLocalStorage(){
    //初始化 localStorage
    localStorage.clear();
    localStorage["is_idle"] = "false";
    localStorage["last_site"] = "null";
    localStorage["last_time"] = timeNow();
    localStorage["total_elapsed_time"] = 0;
    localStorage["next_alarm_time"] = TIMEPACE;
    //以每个域名为 key 的每个域名访问了多少时间
    //虽然逻辑上并不需要用这个字典，但将来可以扩展成特定的网站每天或者每周给予特定的访问时长。
    for (var i in track_sites){
        localStorage[track_sites[i]] = JSON.stringify({"elapsed_time": 0});
    }
}

function timeNow(){
    // 返回当前时间戳
    return Math.round(Date.now()/1000) + GMT * 3600;
}

function minLeftMidnight(){
    // 距离 0 点还剩下多少分钟，每日清空定时任务 init 时要用
    return MINUTE_PER_DAY - Math.round(timeNow()/60) % MINUTE_PER_DAY
}

function notifyDingding(msg){
    // 发送 msg 到钉钉提醒
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
    // 拼接 msg，弹窗并请求钉钉
    let elapsed_time = parseInt(localStorage["next_alarm_time"]) / 60
    msg = "今天你已经刷了" + elapsed_time + "分钟知乎了。" 
    console.log(msg);
    alert(msg);
    notifyDingding(msg);
    localStorage["next_alarm_time"] = parseInt(localStorage["next_alarm_time"]) + TIMEPACE;
}

function updateLocalStorageTime(){
    // 更新 localStorage 里的访问时间
    var domain = localStorage["last_site"];
    var site_log = JSON.parse(localStorage[domain]);
    timedelta = timeNow() - parseInt(localStorage["last_time"]);
    site_log["elapsed_time"] = parseInt(site_log["elapsed_time"]) + timedelta;
    console.log(domain, "elapsed_time: ", site_log["elapsed_time"]);
    localStorage[domain] = JSON.stringify(site_log);
    localStorage["total_elapsed_time"] = parseInt(localStorage["total_elapsed_time"]) + timedelta;
    if(parseInt(localStorage["total_elapsed_time"]) > parseInt(localStorage["next_alarm_time"])){
        fireNotification();
    }
    localStorage["last_time"] = timeNow();
}

function isElapsedTime(domain){
    // 判断刚刚过去的时间段是不是在刷知乎
    if(localStorage["last_site"] == "null" && domain != "null"){
        localStorage["last_site"] = domain;
        localStorage["last_time"] = timeNow();
    }else if(localStorage["last_site"] != "null"){
        updateLocalStorageTime();
        localStorage["last_site"] = domain;
    }
}

function classifyDomin(domain){
    // 检查域名是不是在黑名单里面
    var in_list = false;
    for (var i in track_sites){
        if(domain.match(track_sites[i])){
            addTimeDelta(track_sites[i]);
            in_list = true;
            break
        }
    }
    // 不在黑名单里面的域名作为 null 处理
    if(in_list == false){
        addTimeDelta("null");
    }
}

function getCurrentTabDomin(){
    // 获取当前活跃 tab 的域名
    chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs){
        if (tabs.length == 1){
            var url = new URL(tabs[0].url);
            var domain = url.hostname;
            classifyDomin(domain);
        } else if (tabs.length == 0){
            addTimeDelta("null");
        } else {
            console.log("奇怪，找到不止一个 tabs active?");
            console.log(tabs);
        }
    })
}

chrome.tabs.onUpdated.addListener(getCurrentTabDomin)
chrome.tabs.onActivated.addListener(getCurrentTabDomin)
chrome.windows.onFocusChanged.addListener(getCurrentTabDomin)
chrome.idle.onStateChanged.addListener(function(idleState){
    if (idleState == "active"){
        // is_idle 状态记录是为了下面每分钟定时 check 事件，如果 idle 了，就不再 check
        localStorage["is_idle"] = false;
        getCurrentTabDomin();
    }else{
        localStorage["is_idle"] = true;
        addTimeDelta("null");
    }
})

chrome.alarms.create("mignight_clear",
        {delayInMinutes: minLeftMidnight(), periodInMinutes: MINUTE_PER_DAY});
// 每天零点清空 localStorage
chrome.alarms.create("minute_check", {periodInMinutes: 1})
// 每分钟检查一下正在浏览的网站，超时发送提醒
chrome.alarms.onAlarm.addListener(function(alarm){
    if (alarm.name == "mignight_clear"){
        console.log("clear localStorage");
        initLocalStorage();
    }else if (alarm.name == "minute_check"){
        if(localStorage["is_idle"] == true){
            console.log("minute_check");
            getCurrentTabDomin();
        }
    }
})
