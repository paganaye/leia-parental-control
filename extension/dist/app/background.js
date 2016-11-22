//TODO: <a href="https://icons8.com/web-app/5770/Sad">Sad icon</a> by Icons8
//============================================================================
var BackgroundApplication = (function () {
    function BackgroundApplication() {
    }
    BackgroundApplication.prototype.run = function () {
        var _this = this;
        app.defaultSettings = {
            active: true,
            dailyMaximum: 60,
            defaultAccess: Access.AllowedButTimed,
            defaultInstantReporting: false,
            defaultGranularity: HistoricGranularity.IndividualPage
        };
        app.settings = Object.create(app.defaultSettings);
        this.startupTime = new Date().toString();
        this.optionManager = new OptionManager();
        this.optionManager.init(function () {
            _this.siteManager = new SiteManager();
            _this.tabsMonitor = new TabsMonitor();
            _this.iconManager = new IconManager();
            _this.databaseManager = new DatabaseManager();
            _this.databaseManager.init(function () {
                _this.tabsMonitor.init();
            });
        });
    };
    return BackgroundApplication;
}());
var IconManager = (function () {
    function IconManager() {
        this.badgeTickOnIcon = "images/happy-96.png";
        this.badgeTickOffIcon = "images/happySM-96.png";
        this.badgeTickOnTime = 250;
        this.badgeTickOffTime = 750;
        this.badgeDefaultIcon = "images/Parent Guardian-96.png";
        this.badgeTickCount = 0;
    }
    IconManager.prototype.badgeTick = function () {
        if (app.counting) {
            this.badgeTickCount++;
            if (this.badgeTickCount & 1) {
                chrome.browserAction.setIcon({ path: this.badgeTickOnIcon });
                setTimeout(this.badgeTick, this.badgeTickOnTime);
            }
            else {
                chrome.browserAction.setIcon({ path: this.badgeTickOffIcon });
                setTimeout(this.badgeTick, this.badgeTickOffTime);
            }
        }
        else
            chrome.browserAction.setIcon({ path: this.badgeDefaultIcon });
    };
    return IconManager;
}());
var DatabaseManager = (function () {
    function DatabaseManager() {
        this.afterLoginCalled = false;
        this.todaysTotal = 0;
        // Initialize Firebase
        this.config = {
            apiKey: "AIzaSyC6iHEeS4kQ0eIZ0cNo7jPWCuGS-3gtAy4",
            authDomain: "leiaparentalcontrol.firebaseapp.com",
            databaseURL: "https://leiaparentalcontrol.firebaseio.com",
            storageBucket: "",
            messagingSenderId: "737945013874"
        };
        this.nbMonthMax = 100;
        this.nbDayMax = 100;
        this.LOCAL_MILLENIUM_DAY = new Date(2000, 0, 1).getTime();
    }
    DatabaseManager.prototype.rand6 = function () {
        return Math.floor(Math.random() * Math.pow(36, 6)).toString(36);
    };
    DatabaseManager.prototype.rand18 = function () {
        return this.rand6() + this.rand6() + this.rand6();
    };
    DatabaseManager.prototype.init = function (callback) {
        var _this = this;
        this.afterLoginCallback = callback;
        "Signed in firebase";
        firebase.initializeApp(this.config);
        // Listening for auth state changes.
        firebase.auth().onAuthStateChanged(function (user) {
            if (user) {
                app.dbUid = user.uid;
                console.log("Signed in firebase", user);
                _this.afterSignin();
            }
            else {
                if (app.options.accountId == null || app.options.accountId.length == 0) {
                    app.options.accountId = _this.rand18();
                    app.options.authKey = _this.rand18();
                    app.optionManager.save();
                    _this.signUp();
                }
                else {
                    _this.signIn();
                }
            }
        });
    };
    DatabaseManager.prototype.signUp = function () {
        var email = "tmp" + app.options.accountId + "@ganaye.com";
        var password = app.options.authKey;
        firebase.auth().createUserWithEmailAndPassword(email, password).catch(function (err) {
            // Handle Errors here.
            if (err) {
                alert("An error occured while signing up.");
            }
            else {
                console.log("userCreated");
            }
        });
    };
    DatabaseManager.prototype.signIn = function () {
        var _this = this;
        var email = "tmp" + app.options.accountId + "@ganaye.com";
        var password = app.options.authKey;
        firebase.auth().signInWithEmailAndPassword(email, password).catch(function (err) {
            // Handle Errors here.
            if (err) {
                if (err.code == "auth/user-not-found") {
                    // this is strange but perhaps the databae was cleared
                    _this.signUp();
                }
                else if (err.code == "auth/user-disabled") {
                    alert("Account disabled.");
                }
                else {
                    alert("Unexpected login error: " + err);
                }
            }
            else {
                console.log("User signed in", email);
            }
        });
    };
    DatabaseManager.prototype.afterSignin = function () {
        var _this = this;
        app.tabsMonitor.checkAllTabs({ refreshTab: true });
        this.get(["accounts", app.options.accountId, "settings"], function (newSettings) {
            if (!newSettings)
                newSettings = {};
            if (typeof newSettings.defaultAccess === "undefined")
                newSettings.defaultAccess = app.defaultSettings.defaultAccess;
            if (typeof newSettings.defaultInstantReporting === "undefined")
                newSettings.defaultInstantReporting = app.defaultSettings.defaultInstantReporting;
            if (typeof newSettings.active === "undefined")
                newSettings.active = app.defaultSettings.active;
            if (typeof newSettings.dailyMaximum === "undefined")
                newSettings.dailyMaximum = app.defaultSettings.dailyMaximum;
            if (typeof newSettings.defaultGranularity === "undefined")
                newSettings.defaultGranularity = app.defaultSettings.defaultGranularity;
            console.log("New account settings", newSettings);
            app.settings = newSettings;
            _this.gotAccountSettings = true;
            _this.gotSettingsTodayDataAndSites();
        });
        this.once(["accounts", app.options.accountId, "today"], function (dayData) {
            _this.todayData = dayData;
            _this.gotTodayData = true;
            _this.gotSettingsTodayDataAndSites();
        });
        this.get(["accounts", app.options.accountId, "sites"], function (newSites) {
            app.siteManager.sites = newSites || {};
            _this.gotSites = true;
            _this.gotSettingsTodayDataAndSites();
        });
    };
    DatabaseManager.prototype.gotSettingsTodayDataAndSites = function () {
        if (!this.gotAccountSettings
            || !this.gotTodayData
            || !this.gotSites)
            return;
        this.recalcTotal();
        if (this.afterLoginCallback && !this.afterLoginCalled) {
            this.afterLoginCalled = true;
            this.afterLoginCallback();
        }
        app.tabsMonitor.checkAllTabs({ settingsChanged: true });
    };
    DatabaseManager.prototype.recalcTotal = function () {
        var today = DatabaseManager.shortDate(new Date());
        this.todaysTotal = 0;
        for (var hostname in this.todayData) {
            var dailyRecord = this.todayData[hostname];
            var realHostName = dailyRecord.hostname;
        }
    };
    DatabaseManager.escapeKey = function (src) {
        var length = src.length;
        var result = [];
        for (var i = 0; i < length; i++) {
            var srcChar = src.charAt(i);
            var keyChar = DatabaseManager.escapeChars[srcChar];
            result.push(keyChar || srcChar);
        }
        return result.join("");
    };
    DatabaseManager.unescapeKey = function (src) {
        var length = src.length;
        var result = [];
        for (var i = 0; i < length; i++) {
            var keyChar = src.charAt(i);
            var srcChar = DatabaseManager.unescapeChars[keyChar];
            result.push(srcChar || keyChar);
        }
        return result.join("");
    };
    DatabaseManager.prototype.getRef = function (path) {
        if (Array.isArray(path)) {
            path = path.map(function (s) { return DatabaseManager.escapeKey(s); }).join("/");
        }
        else
            path = DatabaseManager.escapeKey(path);
        return firebase.database().ref(path);
    };
    DatabaseManager.prototype.get = function (path, onFunction) {
        this.getRef(path).on("value", function (snap) {
            onFunction(snap.val());
        });
    };
    DatabaseManager.prototype.once = function (path, onFunction) {
        this.getRef(path).once("value").then(function (snap) {
            onFunction(snap.val());
        });
    };
    DatabaseManager.prototype.set = function (path, value) {
        this.getRef(path).set(value);
    };
    DatabaseManager.prototype.push = function (path, value) {
        var ref = this.getRef(path);
        var key = ref.push(value).getKey();
        return key;
    };
    DatabaseManager.prototype.transaction = function (path, updateData, onSuccess, onError) {
        var ref = this.getRef(path);
        var data = ref.transaction(function (data, x, y) {
            data = updateData(data);
            return data;
        }, function (error, committed, snapshot) {
            var path = ref.path.toString();
            var val = val ? snapshot.val() : null;
            if (error) {
                console.log("Transaction failed abnormally.", error, "data:", path, val);
                if (onError)
                    onError();
            }
            else if (!committed) {
                console.log("Transaction aborted: No data provided.", path, val);
                if (onError)
                    onError();
            }
            else {
                console.log("Data saved", path, val);
                if (onSuccess)
                    onSuccess();
            }
        });
    };
    DatabaseManager.fullDate = function (d) {
        return d.getFullYear() + "-"
            + DatabaseManager.twoDigits(d.getMonth() + 1) + "-"
            + DatabaseManager.twoDigits(d.getDate()) + " "
            + DatabaseManager.twoDigits(d.getHours()) + ":"
            + DatabaseManager.twoDigits(d.getMinutes()) + ":"
            + DatabaseManager.twoDigits(d.getSeconds());
    };
    ;
    DatabaseManager.shortDate = function (d) {
        return d.getFullYear() + "-"
            + DatabaseManager.twoDigits(d.getMonth() + 1) + "-"
            + DatabaseManager.twoDigits(d.getDate());
    };
    DatabaseManager.twoDigits = function (n) {
        return n >= 10 ? n.toString() : "0" + n;
    };
    DatabaseManager.prototype.increment = function (history, increment, newDateString) {
        var result = {
            lastDate: newDateString
        };
        if (!history)
            history = {};
        var lastDate = new Date(history.lastDate);
        var newDate = new Date(newDateString);
        result.monthly = this.incrementInArray(history.monthly, increment, lastDate.getFullYear() * 12 + lastDate.getMonth(), newDate.getFullYear() * 12 + newDate.getMonth(), this.nbMonthMax);
        result.daily = this.incrementInArray(history.daily, increment, Math.floor((lastDate.getTime() - this.LOCAL_MILLENIUM_DAY) / 86400000), Math.floor((newDate.getTime() - this.LOCAL_MILLENIUM_DAY) / 86400000), this.nbDayMax);
        return result;
    };
    DatabaseManager.prototype.incrementInArray = function (array, increment, previousIndex, newIndex, max) {
        array = array ? array.slice() : [];
        if (array.length == 0)
            array.push(0);
        else {
            if (!previousIndex)
                previousIndex = 0;
            var nbToAdd = newIndex - previousIndex;
            if (nbToAdd > 0) {
                if (nbToAdd >= max) {
                    nbToAdd = max;
                    array = [];
                }
                else if (nbToAdd + array.length > max) {
                    array = array.slice(nbToAdd - max);
                }
                for (var i = 0; i < nbToAdd; i++)
                    array.push(0);
            }
        }
        array[array.length - 1] += increment;
        return array;
    };
    DatabaseManager.escapeChars = { ".": "\u2024", "$": "\uFF04", "[": "\u27E6", "]": "\u27E7", "#": "\uFF03", "/": "\u2044" };
    DatabaseManager.unescapeChars = { "\u2024": ".", "\uFF04": "$", "\u27E6": "[", "\u27E7": "]", "\uFF03": "#", "\u2044": "/" };
    return DatabaseManager;
}());
// class CachedSite {
//     constructor(readonly hostname: string) {
//     }
//     site: Site;
//     listeners: ((site: Site) => void)[] = [];
// }
var SiteManager = (function () {
    function SiteManager() {
        //cache: { [key: string]: CachedSite } = {};
        this.sites = {};
    }
    SiteManager.prototype.getSite = function (hostname) {
        return this.sites[DatabaseManager.escapeKey(hostname)] || {};
    };
    return SiteManager;
}());
var MonitoredPage = (function () {
    function MonitoredPage() {
    }
    return MonitoredPage;
}());
var MonitoredUrl = (function () {
    function MonitoredUrl(url, title, now) {
        if (!now)
            now = new Date();
        var realURL = new URL(url);
        this.hostname = realURL.hostname;
        this.path = realURL.pathname;
        this.query = realURL.search;
        this.url = url;
        this.title = title || "";
        this.startDate = DatabaseManager.fullDate(now);
        this.modified = false; // no need to save a blank url with 0 duration
        this.active = false;
        this.tabIds = [];
    }
    MonitoredUrl.prototype.isActive = function () {
        return this.active;
    };
    MonitoredUrl.prototype.setActive = function (newActive) {
        if (newActive != this.active) {
            this.active = newActive;
            this.modified = true;
            if (newActive)
                this.activatedTime = new Date();
            else
                this.deactivatedTime = new Date();
        }
    };
    MonitoredUrl.prototype.getSite = function () {
        return app.siteManager.getSite(this.hostname);
    };
    MonitoredUrl.prototype.setTitle = function (newTitle) {
        if (newTitle != this.title) {
            this.title = newTitle;
            this.modified = true;
        }
    };
    MonitoredUrl.prototype.remove = function () {
        this.setActive(false);
    };
    MonitoredUrl.prototype.saveIfModified = function (nowTime) {
        if (this.modified
            || this.active && ((new Date().getTime() - this.lastSaveTime.getTime()) >= MonitoredUrl.MinimalTimeSave)) {
            this.save();
            this.modified = false;
        }
    };
    MonitoredUrl.prototype.save = function () {
        var _this = this;
        // var isTiming = false;
        // var parts = TabsMonitor.parseURL(monitoredUrl.url as string);
        // monitoredUrl.lastSave = nowTime;
        this.lastSaveTime = new Date();
        var todayKey = ["accounts", app.options.accountId, "today", this.hostname];
        switch (this.getSite().historicGranularity || app.settings.defaultGranularity) {
            case HistoricGranularity.Domain:
                break;
            case HistoricGranularity.IndividualPage:
                todayKey.push(this.path);
                break;
            case HistoricGranularity.QueryString:
                todayKey.push(this.path + this.query);
                break;
            case HistoricGranularity.HashValues:
                todayKey.push(this.path + this.query + this.hash);
                break;
        }
        console.log("SaveIntoDatabase", this.url);
        app.databaseManager.transaction(todayKey, function (currentRecord) {
            var now = new Date();
            var increment = 0;
            if (_this.active && _this.activatedTime) {
                increment = (now.getTime() - _this.activatedTime.getTime()) / 1000;
            }
            else if (!_this.active && _this.activatedTime && _this.deactivatedTime) {
                increment = (_this.deactivatedTime.getTime() - _this.activatedTime.getTime()) / 1000;
            }
            if (currentRecord && currentRecord.lastSave && _this.activatedTime) {
                var savedTime = new Date(currentRecord.lastSave);
                var alreadySaved = (savedTime.getTime() - _this.activatedTime.getTime()) / 1000;
                if (alreadySaved > 0) {
                    increment -= alreadySaved;
                }
            }
            var newRecord = {
                // we store the real hostname despite it is also in the address
                // because it is encoded in the address.
                startDate: _this.startDate,
                title: _this.title,
                duration: (currentRecord ? currentRecord.duration : 0) + increment,
                active: _this.active,
                lastSave: DatabaseManager.fullDate(now)
            };
            return newRecord;
        });
    };
    MonitoredUrl.MinimalTimeSave = 15000; // 15 seconds
    return MonitoredUrl;
}());
var Access;
(function (Access) {
    Access[Access["Unknown"] = 0] = "Unknown";
    Access[Access["AllowedAndFree"] = 1] = "AllowedAndFree";
    Access[Access["AllowedButTimed"] = 2] = "AllowedButTimed";
    Access[Access["Forbidden"] = 3] = "Forbidden";
})(Access || (Access = {}));
var HistoricGranularity;
(function (HistoricGranularity) {
    HistoricGranularity[HistoricGranularity["Domain"] = 1] = "Domain";
    HistoricGranularity[HistoricGranularity["IndividualPage"] = 2] = "IndividualPage";
    HistoricGranularity[HistoricGranularity["QueryString"] = 3] = "QueryString";
    HistoricGranularity[HistoricGranularity["HashValues"] = 4] = "HashValues";
})(HistoricGranularity || (HistoricGranularity = {}));
var Site = (function () {
    function Site() {
    }
    return Site;
}());
var TabsMonitor = (function () {
    function TabsMonitor() {
        this.monitoredUrls = {};
        this.windows = {};
        this.clockFrequency = 60; // in minutes (max 60)
    }
    TabsMonitor.parseURL = function (url) {
        var parser = document.createElement("a");
        try {
            parser.href = url;
        }
        catch (error) {
        }
        // Convert query string to object
        return {
            protocol: parser.protocol,
            host: parser.host,
            hostname: parser.hostname,
            port: parser.port,
            pathname: parser.pathname,
            search: parser.search,
            hash: parser.hash
        };
    };
    TabsMonitor.prototype.checkWindowsAndTabs = function () {
        var _this = this;
        chrome.windows.getAll(function (windows) {
            for (var _i = 0, windows_1 = windows; _i < windows_1.length; _i++) {
                var w = windows_1[_i];
                _this.windows[w.id] = w;
            }
            _this.checkAllTabs();
        });
    };
    TabsMonitor.prototype.checkAllTabs = function (options) {
        var _this = this;
        if (!options)
            options = {};
        chrome.tabs.query({}, function (tabs) {
            var now = new Date();
            var nowTime = now.getTime();
            var tabIds = {};
            var activeTabs = {};
            for (var _i = 0, tabs_1 = tabs; _i < tabs_1.length; _i++) {
                var tab = tabs_1[_i];
                if (!tab.id || !tab.url)
                    continue;
                var url = tab.url || "";
                var monitoredUrl = _this.monitoredUrls[url];
                var window = _this.windows[tab.windowId];
                var active = (tab.active && (!window || window.state !== "minimized"))
                    || tab.audible;
                var tabIsNew = false;
                if (!monitoredUrl) {
                    console.log(" * New monitored url", url);
                    monitoredUrl = new MonitoredUrl(url, tab.title, now);
                    _this.monitoredUrls[url] = monitoredUrl;
                    tabIsNew = true;
                }
                if (!tabIds[url])
                    tabIds[url] = [];
                tabIds[url].push(tab.id);
                if (active)
                    activeTabs[url] = true;
                if (tab.title)
                    monitoredUrl.setTitle(tab.title);
                if (options.settingsChanged || tabIsNew) {
                    _this.sendLpcMessage(url, tab.id);
                }
                if (options.refreshTab) {
                    if (tab.url.substr(0, 9) !== "chrome://")
                        chrome.tabs.reload(tab.id);
                }
            }
            for (var url in _this.monitoredUrls) {
                var monitoredUrl = _this.monitoredUrls[url];
                monitoredUrl.setActive(activeTabs[url] || false);
                if (tabIds[url]) {
                    monitoredUrl.tabIds = tabIds[url];
                }
                else {
                    monitoredUrl.remove();
                    delete _this.monitoredUrls[url];
                }
                monitoredUrl.saveIfModified(nowTime);
            }
        });
    };
    TabsMonitor.prototype.getLpcMessage = function (url) {
        var monitoredUrl = this.monitoredUrls[url];
        var site = monitoredUrl.getSite();
        var access = (site && site.access) || app.settings.defaultAccess;
        var showPage = app.settings.active && access <= Access.AllowedButTimed;
        var message = {
            sender: "LPCBackground",
            showPage: showPage,
            message: (site && site.description) || "Leia Parental Control"
        };
        return message;
    };
    TabsMonitor.prototype.sendLpcMessage = function (url, tabId) {
        var message = this.getLpcMessage(url);
        chrome.tabs.sendMessage(tabId, message, function (response) {
            console.log("Start action sent");
        });
    };
    TabsMonitor.prototype.init = function () {
        var _this = this;
        chrome.tabs.onCreated.addListener(function (tab) {
            _this.checkAllTabs();
        });
        chrome.tabs.onActivated.addListener(function (tabinfo) {
            _this.checkAllTabs();
        });
        chrome.tabs.onUpdated.addListener(function (tabId) {
            _this.checkAllTabs();
        });
        chrome.tabs.onRemoved.addListener(function (tabId) {
            _this.checkAllTabs();
        });
        chrome.windows.onCreated.addListener(function (window) {
            _this.windows[window.id] = window;
        });
        chrome.windows.onFocusChanged.addListener(function (x, y) {
            _this.checkWindowsAndTabs();
        });
        chrome.windows.onRemoved.addListener(function (windowId) {
            delete _this.windows[windowId];
            _this.checkWindowsAndTabs();
        });
        this.setClock();
        this.checkWindowsAndTabs();
    };
    TabsMonitor.prototype.setClock = function () {
        var _this = this;
        var now = new Date();
        var nextTime = new Date(now);
        var newMinutes = Math.floor(now.getMinutes() / this.clockFrequency) * this.clockFrequency + this.clockFrequency;
        nextTime.setMinutes(newMinutes, 0, 0);
        var timeToNextTime = nextTime.getTime() - now.getTime();
        setTimeout(function () {
            _this.checkAllTabs();
            _this.setClock();
        }, timeToNextTime);
    };
    return TabsMonitor;
}());
var OptionManager = (function () {
    function OptionManager() {
    }
    OptionManager.prototype.init = function (callback) {
        app.options = {
            version: 1,
            accountId: "",
            parentsEmail: "",
            authKey: "",
        };
        chrome.storage.sync.get(app.options, function (newOptions) {
            app.options = newOptions;
            console.log("Extensions options loaded", app.options);
            callback();
        });
    };
    OptionManager.prototype.save = function () {
        chrome.storage.sync.set(app.options, function () {
            console.log("Extension options saved", app.options);
        });
    };
    return OptionManager;
}());
var firebase;
var app = new BackgroundApplication();
if (typeof ($) !== "undefined") {
    $(function () {
        app.run();
    });
}
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.sender !== "LPCOverlay")
        return;
    switch (message.message) {
        case "HELLO":
            if (sendResponse) {
                sendResponse(app.tabsMonitor.getLpcMessage(message.url));
            }
            break;
    }
});
