/**
 * This page records the time spent on a page, on a site and on the internet.
 *
 * A page is considered active either if the tab is active or the music is playing.
 * When the computer is idle. I got to stop the counting but haven't done it yet.
 *
 * When two pages are active together, the time spent on the site and on the internet
 * will be smaller than the sum of its part.
 * This is why:
 *    - there is nop point adding individual counters together
 *    - we record more than just one counter
 *
 * Example:
 *
 * Time spent on the internet
 *          - Duration : 125.0 s
 *
 * Time spent in newTab
 *          - Duration : 5.0 s
 *
 * Time spent on youtube
 *          - Duration : 111.0 s
 *
 * Time spent in youtube /watch?v=2S1fYLHABy4
 *          - Duration : 110 s
 *
 * Time spent in youtube /watch?v=NwXLC9xY-xQ
 *          - Duration : 110 s
 *
 */
//var firebase: FirebaseClient;
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var AccessNames = ["unknown", "allowed", "timed", "forbidden", "forbidden"];
var BackgroundApplication = (function () {
    function BackgroundApplication() {
        this.initComplete = false;
    }
    BackgroundApplication.prototype.run = function () {
        this.startupTime = new Date().toString();
        app.defaultSettings = {
            active: true,
            dailyMaximum: 2700,
            defaultAccess: 2 /* AllowedButTimed */,
            defaultInstantReporting: false,
            defaultGranularity: 2 /* IndividualPage */,
            emails: "",
            site: {},
            url: {}
        };
        app.settings = deepMerge(app.defaultSettings, {});
        this.tabsMonitor = new TabsMonitor();
        this.iconManager = new IconManager();
        this.databaseManager = new DatabaseManager();
        this.optionManager = new OptionManager();
        this.optionManager.init();
    };
    return BackgroundApplication;
}());
function deepMerge(object1, object2, overwrite) {
    var recursiveMerge = function (destination, merge) {
        for (var prop in merge) {
            if (!merge.hasOwnProperty(prop))
                continue;
            if (destination === undefined)
                destination = {};
            if (destination.hasOwnProperty(prop) && !overwrite)
                continue;
            var mergeValue = merge[prop];
            destination[prop] = (typeof mergeValue === "object")
                ? recursiveMerge(destination[prop] || {}, mergeValue)
                : mergeValue;
        }
        return destination;
    };
    var result = recursiveMerge({}, object1 || {});
    if (object2)
        result = recursiveMerge(result, object2);
    return result;
}
function OneDec(n) {
    return Math.round(n * 10) / 10;
}
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
var HistoryManager = (function () {
    function HistoryManager() {
        this.nbMonthMax = 100;
        this.nbDayMax = 100;
    }
    return HistoryManager;
}());
var DatabaseManager = (function () {
    function DatabaseManager() {
        this.config = {
            apiKey: "AIzaSyC6iHEeS4kQ0eIZ0cNo7jPWCuGS-3gtAy4",
            authDomain: "leiaparentalcontrol.firebaseapp.com",
            databaseURL: "https://leiaparentalcontrol.firebaseio.com",
            storageBucket: "",
            messagingSenderId: "737945013874"
        };
    }
    DatabaseManager.prototype.rand6 = function () {
        return Math.floor(Math.random() * Math.pow(36, 6)).toString(36);
    };
    DatabaseManager.prototype.rand18 = function () {
        return this.rand6() + this.rand6() + this.rand6();
    };
    DatabaseManager.prototype.init = function () {
        var _this = this;
        firebase.database.enableLogging(true);
        this.firebaseApp = firebase.initializeApp(this.config);
        this.database = this.firebaseApp.database();
        this.firebaseApp.auth().onAuthStateChanged(function (user) {
            if (user) {
                _this.dbUid = user.uid;
                _this.userRef = _this.database.ref("user").child(_this.dbUid);
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
    DatabaseManager.prototype.saveEmailsSetting = function (emailArray) {
        var emails = {};
        var cpt = 0;
        emailArray.forEach(function (s) { return emails[DatabaseManager.escapeKey(s)] = cpt++; });
        //this.set(this.emailRef, emails);
    };
    DatabaseManager.prototype.getEmailsSetting = function () {
        var result = [];
        // for (var x in app.settings.emails) {
        //     result[app.settings.emails[x]] = DatabaseManager.unescapeKey(x);
        // }
        return result;
    };
    DatabaseManager.prototype.signUp = function () {
        var email = "tmp" + app.options.accountId + "@ganaye.com";
        var password = app.options.authKey;
        this.firebaseApp.auth().createUserWithEmailAndPassword(email, password).catch(function (err) {
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
        this.firebaseApp.auth().signInWithEmailAndPassword(email, password).catch(function (err) {
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
        console.log("afterSignin");
        if (!this.tabsMonitorInitDone) {
            this.tabsMonitorInitDone = true;
            app.tabsMonitor.init();
        }
        var gotSettings = false;
        var gotTodayData = false;
        var now = new Date();
        var checkTabs = function () {
            if (!gotSettings
                || !gotTodayData)
                return;
            app.initComplete = true;
            app.tabsMonitor.checkAllTabs(CheckAllTabsReason.SettingsChanged, now);
            //this.checkTodayData();
        };
        var onSettingsChanged = function (snap) {
            var newSettings = snap.val() || {};
            app.settings = deepMerge(newSettings, app.defaultSettings);
            console.log("New account settings", app.settings);
            gotSettings = true;
            checkTabs();
        };
        if (this.settingsRef)
            this.settingsRef.off("value", onSettingsChanged);
        this.settingsRef = this.userRef.child("settings");
        this.settingsRef.on("value", onSettingsChanged);
        var onGotTodayData = function (snap) {
            app.todayData = snap.val() || {};
            gotTodayData = true;
            checkTabs();
        };
        this.dateSignature = DatabaseManager.getHistoricSignature(now);
        this.getTodayRef().once("value", onGotTodayData);
    };
    DatabaseManager.prototype.getDateSignature = function () {
        return this.dateSignature;
    };
    DatabaseManager.prototype.setDateSignature = function (value) {
        if (value == this.dateSignature)
            return;
        this.dateSignature = value;
        app.todayData = {};
    };
    DatabaseManager.prototype.getTodayRef = function () {
        return this.userRef.child("records").child(this.dateSignature);
    };
    DatabaseManager.reverseObject = function (src) {
        return Object.keys(src).reduce(function (out, val) {
            out[src[val]] = val;
            return out;
        }, {});
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
    DatabaseManager.getKey = function (parts) {
        var result = parts.map(function (p) {
            switch (typeof (p)) {
                case "object":
                    if (p instanceof Date)
                        return DatabaseManager.fullDate(p);
                    else if (p == null)
                        return "null";
                    else
                        return p.toString();
                // no break;                    
                default:
                    return DatabaseManager.escapeKey(p.toString());
            }
        }).join("/");
        return result;
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
    DatabaseManager.getHistoricSignature = function (d) {
        return d.getFullYear() + "-"
            + DatabaseManager.twoDigits(d.getMonth() + 1) + "-"
            + DatabaseManager.twoDigits(d.getDate());
        // + " "
        // + DatabaseManager.twoDigits(d.getHours()) + "-"
        // + DatabaseManager.twoDigits(d.getMinutes())        
    };
    ;
    DatabaseManager.twoDigits = function (n) {
        return n >= 10 ? n.toString() : "0" + n;
    };
    // private checkTodayData() {
    //     console.log("CheckToday");
    //     var nowString = DatabaseManager.shortDate(new Date());
    //     var todayData: TodayData = app.todayDataSnap.val();
    //     if (todayData.started == nowString) return;
    //     // we stop everything
    //     app.tabsMonitor.checkAllTabs(CheckAllTabsReason.NewDay);
    //     var activatedDate = todayData.timings.activated;
    //     var updates: any = {};
    //     for (var hostname in todayData.sites) {
    //         var site = todayData.sites[hostname];
    //         var realHostName = DatabaseManager.unescapeKey(hostname);
    //         var pages = site.pages;
    //         for (var pageName in pages) {
    //             var page = pages[pageName];
    //         }
    //         /*
    //         var page = dailyRecord.pages[];
    //         if (dailyRecord.startDate < today) {
    //             // put this in history
    //             var perSiteKey = ["accounts", app.options.accountId, "history", dailyRecord.hostname];
    //             app.databaseManager.transaction(perSiteKey, (history: History) => {
    //                 if (history == null || history.lastDate <= dailyRecord.startDate) {
    //                     history = app.databaseManager.increment(history, dailyRecord.duration, dailyRecord.startDate);
    //                 }
    //                 app.databaseManager.set(["accounts", app.options.accountId, "today", dailyRecord.hostname], null);
    //                 return history;
    //             });
    //         } else {
    //             var site = app.siteManager.getSite(realHostName)
    //             var access = (site && site.access)
    //                 ? site.access : app.settings.defaultAccess;
    //             if (access == Access.AllowedButTimed) {
    //                 this.todayTotal += dailyRecord.duration;
    //             }
    //         }
    //         */
    //     }
    //     updates["today"] = { started: nowString };
    //     console.log("updates", updates);
    // }
    DatabaseManager.escapeChars = {
        ".": "\u2024",
        "$": "\uFF04",
        "[": "\u27E6",
        "]": "\u27E7",
        "#": "\uFF03",
        "/": "\u2044"
    };
    DatabaseManager.unescapeChars = DatabaseManager.reverseObject(DatabaseManager.escapeChars);
    return DatabaseManager;
}());
var TimedItem = (function () {
    function TimedItem(category, name) {
        this.category = category;
        this.name = name;
        this._active = 0;
        this._timingsPath = DatabaseManager.getKey([category, name]);
        TimedItem.list[this._timingsPath] = this;
    }
    TimedItem.get = function (category, name) {
        var timingsPath = DatabaseManager.getKey([category, name]);
        var result = TimedItem.list[timingsPath];
        if (!result) {
            result = new TimedItem(category, name);
        }
        return result;
    };
    TimedItem.prototype.isActive = function () {
        return this._active > 0;
    };
    TimedItem.prototype.start = function (updates, now) {
        if (!this._active) {
            if (!this._initialized) {
                var category = app.todayData[this.category] || {};
                this._timings = category[this.name] || {};
                this._initialized = true;
            }
            this._activatedTime = now;
            this._timings.activated = DatabaseManager.fullDate(this._activatedTime);
            updates[this._timingsPath] = this._timings;
        }
        this._active += 1;
    };
    TimedItem.prototype.stop = function (updates, now) {
        if (!this._active)
            return;
        this._active -= 1;
        if (!this._active) {
            if (!this._activatedTime)
                return;
            var duration = (now.getTime() - this._activatedTime.getTime()) / 1000;
            delete this._timings.activated;
            this._timings.total = OneDec((this._timings.total || 0) + duration);
            updates[this._timingsPath] = this._timings;
        }
    };
    TimedItem.prototype.getTotal = function (now) {
        if (!this._initialized)
            return 0;
        var result = this._timings.total || 0;
        if (this._activatedTime) {
            var d = (now.getTime() - this._activatedTime.getTime()) / 1000;
            result += d;
        }
        return Math.round(result);
    };
    TimedItem.prototype.dispose = function () {
        delete TimedItem.list[this._timingsPath];
    };
    TimedItem.resetToZero = function () {
        for (var item in TimedItem.list) {
            var timings = TimedItem.list[item]._timings;
            if (timings)
                delete timings.total;
        }
    };
    TimedItem.list = {};
    return TimedItem;
}());
var MonitoredSite = (function (_super) {
    __extends(MonitoredSite, _super);
    function MonitoredSite(hostname) {
        _super.call(this, "site", hostname);
        this.hostname = hostname;
        this.hostnameKey = DatabaseManager.escapeKey(hostname);
        this.accessTimedItem = TimedItem.get("access", AccessNames[this.access]);
    }
    MonitoredSite.get = function (hostname, title) {
        var result = MonitoredSite.list[hostname];
        if (!result) {
            MonitoredSite.list[hostname] = result = new MonitoredSite(hostname);
        }
        return result;
    };
    Object.defineProperty(MonitoredSite.prototype, "historicGranularity", {
        get: function () {
            var siteSettings = app.settings.site[this.hostnameKey] || {};
            return siteSettings.historicGranularity || app.defaultSettings.defaultGranularity;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MonitoredSite.prototype, "access", {
        get: function () {
            var siteSettings = app.settings.site[this.hostnameKey] || {};
            return siteSettings.access || app.defaultSettings.defaultAccess;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MonitoredSite.prototype, "description", {
        get: function () {
            var siteSettings = app.settings.site[this.hostnameKey] || {};
            return siteSettings.description || "";
        },
        enumerable: true,
        configurable: true
    });
    MonitoredSite.prototype.getDailyMaximum = function () {
        return 3600;
    };
    MonitoredSite.prototype.start = function (updates, now) {
        _super.prototype.start.call(this, updates, now);
        this.accessTimedItem.start(updates, now);
    };
    MonitoredSite.prototype.stop = function (updates, now) {
        _super.prototype.stop.call(this, updates, now);
        this.accessTimedItem.stop(updates, now);
    };
    MonitoredSite.prototype.dispose = function () {
        _super.prototype.dispose.call(this);
        delete MonitoredSite.list[this.hostname];
    };
    MonitoredSite.list = {};
    return MonitoredSite;
}(TimedItem));
var MonitoredUrl = (function (_super) {
    __extends(MonitoredUrl, _super);
    function MonitoredUrl(normalizedUrl) {
        _super.call(this, "url", normalizedUrl);
        var realURL = new URL("http://" + normalizedUrl);
        this.hostname = realURL.hostname;
        this.path = realURL.pathname;
        this.query = realURL.search;
        this.url = normalizedUrl;
        this.tabIds = [];
        this.site = MonitoredSite.get(this.hostname);
    }
    MonitoredUrl.get = function (url, title) {
        var result = MonitoredUrl.list[url];
        if (!result) {
            var realURL = new URL(url);
            var hostName = realURL.hostname.replace(/^www\./, "").toLowerCase();
            var site = MonitoredSite.get(hostName);
            var normalizedUrl;
            switch (site.historicGranularity) {
                case 1 /* Domain */:
                    normalizedUrl = hostName;
                    break;
                case 3 /* QueryString */:
                    normalizedUrl = hostName + realURL.pathname + realURL.search;
                    break;
                case 4 /* HashValues */:
                    normalizedUrl = hostName + realURL.pathname + realURL.search + realURL.hash;
                    break;
                case 2 /* IndividualPage */:
                default:
                    normalizedUrl = hostName + realURL.pathname;
                    break;
            }
            var result = MonitoredUrl.list[normalizedUrl];
            if (!result) {
                result = new MonitoredUrl(normalizedUrl);
                MonitoredUrl.list[normalizedUrl] = result;
            }
        }
        if (title)
            result.title = title;
        return result;
    };
    MonitoredUrl.prototype.getAccess = function () {
        return this.site.access;
    };
    MonitoredUrl.prototype.getTimingPath = function () {
        return [
            "sites", this.hostname,
            "pages", this.getPagePath(),
            "timings"];
    };
    MonitoredUrl.prototype.setTitle = function (newTitle) {
        if (newTitle != this.title) {
            this.title = newTitle;
        }
    };
    MonitoredUrl.prototype.getPagePath = function () {
        var path;
        switch (this.site.historicGranularity || app.settings.defaultGranularity) {
            case 2 /* IndividualPage */:
                path = this.path;
                break;
            case 3 /* QueryString */:
                path = this.path + this.query;
                break;
            case 4 /* HashValues */:
                path = this.path + this.query + this.hash;
                break;
            case 1 /* Domain */:
            default:
                path = "/";
                break;
        }
        return path;
    };
    MonitoredUrl.prototype.getLpcMessage = function (action, now) {
        var access = app.settings.active ? this.site.access : 4 /* InstantClose */;
        var todayTotal = TimedItem.get("access", "timed");
        var todayMax = app.settings.dailyMaximum;
        var siteTotal = this.site.getTotal(now);
        var siteMax = this.site.getDailyMaximum();
        var message = {
            sender: "LPCBackground",
            message: this.site.description || "Leia Parental Control",
            access: access,
            todayTotal: todayTotal.getTotal(now),
            todayMax: todayMax,
            siteTotal: siteTotal,
            siteMax: siteMax
        };
        return message;
    };
    MonitoredUrl.prototype.sendLpcMessages = function (action, now) {
        if (!this.tabIds)
            return;
        for (var _i = 0, _a = this.tabIds; _i < _a.length; _i++) {
            var id = _a[_i];
            this.sendLpcMessage(id, action, now);
        }
        ;
    };
    MonitoredUrl.prototype.sendLpcMessage = function (tabId, action, now) {
        var message = this.getLpcMessage(action, now);
        if (message.access == 4 /* InstantClose */) {
            chrome.tabs.remove(tabId);
        }
        else
            chrome.tabs.sendMessage(tabId, message);
    };
    MonitoredUrl.prototype.dispose = function () {
        _super.prototype.dispose.call(this);
        delete MonitoredUrl.list[this.url];
    };
    MonitoredUrl.prototype.start = function (updates, now) {
        _super.prototype.start.call(this, updates, now);
        this.site.start(updates, now);
    };
    MonitoredUrl.prototype.stop = function (updates, now) {
        _super.prototype.stop.call(this, updates, now);
        this.site.stop(updates, now);
    };
    MonitoredUrl.prototype.getNormalizedUrl = function () {
        return this.url;
    };
    MonitoredUrl.list = {};
    return MonitoredUrl;
}(TimedItem));
var CheckAllTabsReason;
(function (CheckAllTabsReason) {
    CheckAllTabsReason[CheckAllTabsReason["SettingsChanged"] = 0] = "SettingsChanged";
    CheckAllTabsReason[CheckAllTabsReason["TabChanged"] = 1] = "TabChanged";
    CheckAllTabsReason[CheckAllTabsReason["MinuteTimer"] = 2] = "MinuteTimer";
})(CheckAllTabsReason || (CheckAllTabsReason = {}));
var TabsMonitor = (function () {
    function TabsMonitor() {
        this.windows = {};
        this.activeTabsIds = [];
        this.minuteCounter = 0;
    }
    TabsMonitor.prototype.checkWindowsAndTabs = function () {
        var _this = this;
        setTimeout(function () {
            // this is a bit fiddly, we are trying to detect minimized and closed windows here
            chrome.windows.getAll(function (windows) {
                for (var _i = 0, windows_1 = windows; _i < windows_1.length; _i++) {
                    var w = windows_1[_i];
                    _this.windows[w.id] = w;
                }
                _this.checkAllTabs(CheckAllTabsReason.TabChanged, new Date());
            });
        });
    };
    TabsMonitor.prototype.checkAllTabs = function (reason, now) {
        var _this = this;
        if (!app.initComplete)
            return;
        chrome.tabs.query({}, function (tabs) {
            var newDateSignature = DatabaseManager.getHistoricSignature(now);
            if (newDateSignature != app.databaseManager.getDateSignature()) {
                _this.postUpdates({}, {}, now);
                app.databaseManager.setDateSignature(newDateSignature);
                TimedItem.resetToZero();
            }
            var nowTime = now.getTime();
            var tabIds = {};
            var activeTabs = {};
            var newActiveTabsIds = [];
            for (var _i = 0, tabs_1 = tabs; _i < tabs_1.length; _i++) {
                var tab = tabs_1[_i];
                if (!tab.id || !tab.url)
                    continue;
                var url = tab.url || "";
                var monitoredUrl = MonitoredUrl.get(url, tab.title);
                url = monitoredUrl.getNormalizedUrl();
                var window = _this.windows[tab.windowId];
                var active = (tab.active && (!window || window.state !== "minimized"))
                    || tab.audible;
                var tabIsNew = false;
                if (!tabIds[url])
                    tabIds[url] = [];
                tabIds[url].push(tab.id);
                if (active)
                    activeTabs[url] = true;
                if (tab.title)
                    monitoredUrl.setTitle(tab.title);
                if (tab.active) {
                    newActiveTabsIds.push({ tabId: tab.id, monitoredUrl: monitoredUrl });
                    if (reason == CheckAllTabsReason.SettingsChanged) {
                        monitoredUrl.sendLpcMessage(tab.id, 4 /* SettingsChanged */, now);
                    }
                }
            }
            _this.activeTabsIds = newActiveTabsIds;
            _this.postUpdates(tabIds, activeTabs, now);
        });
    };
    TabsMonitor.prototype.postUpdates = function (tabIds, activeTabs, now) {
        // It generate quite a bit of database noise to deactivate and reactivate a site
        // It is better to activate new tabs and the deactivate old ones.
        var updates = {};
        // So: first activate
        for (var url in MonitoredUrl.list) {
            var monitoredUrl = MonitoredUrl.list[url];
            if (monitoredUrl) {
                monitoredUrl.tabIds = tabIds[url];
                if (activeTabs[url] && !monitoredUrl.isActive()) {
                    monitoredUrl.start(updates, now);
                    monitoredUrl.sendLpcMessages(2 /* Activated */, now);
                }
            }
        }
        // And then deactivate
        for (var url in MonitoredUrl.list) {
            var monitoredUrl = MonitoredUrl.list[url];
            if (monitoredUrl && !activeTabs[url]) {
                if (monitoredUrl.isActive()) {
                    monitoredUrl.stop(updates, now);
                    monitoredUrl.sendLpcMessages(3 /* Deactivated */, now);
                }
                if (!tabIds[url]) {
                    monitoredUrl.dispose();
                }
            }
        }
        if (Object.keys(updates).length > 0) {
            console.log("Posting", app.databaseManager.getDateSignature(), updates);
            app.databaseManager.getTodayRef().update(updates);
        }
    };
    TabsMonitor.prototype.init = function () {
        var _this = this;
        chrome.tabs.onCreated.addListener(function (tab) {
            _this.checkAllTabs(CheckAllTabsReason.TabChanged, new Date());
        });
        chrome.tabs.onActivated.addListener(function (tabinfo) {
            _this.checkAllTabs(CheckAllTabsReason.TabChanged, new Date());
        });
        chrome.tabs.onUpdated.addListener(function (tabId) {
            _this.checkAllTabs(CheckAllTabsReason.TabChanged, new Date());
        });
        chrome.tabs.onRemoved.addListener(function (tabId) {
            _this.checkAllTabs(CheckAllTabsReason.TabChanged, new Date());
        });
        chrome.windows.onCreated.addListener(function (window) {
            _this.windows[window.id] = window;
        });
        chrome.windows.onFocusChanged.addListener(function (x, y) {
            _this.checkWindowsAndTabs();
        });
        this.minuteClock();
        setInterval(function () { return _this.secondClock(); }, 1000);
    };
    TabsMonitor.prototype.minuteClock = function () {
        var _this = this;
        this.minuteCounter++;
        var now = new Date();
        this.checkAllTabs(CheckAllTabsReason.MinuteTimer, now);
        var secondsToNextMinute = (60 - now.getSeconds());
        setTimeout(function () {
            _this.minuteClock();
        }, secondsToNextMinute * 1000);
    };
    TabsMonitor.prototype.secondClock = function () {
        var now = new Date();
        for (var _i = 0, _a = app.tabsMonitor.activeTabsIds; _i < _a.length; _i++) {
            var x = _a[_i];
            x.monitoredUrl.sendLpcMessage(x.tabId, 5 /* MinuteTimer */, now);
        }
    };
    return TabsMonitor;
}());
var OptionManager = (function () {
    function OptionManager() {
    }
    OptionManager.prototype.init = function () {
        app.options = {
            version: 1,
            accountId: "",
            authKey: "",
        };
        chrome.storage.sync.get(app.options, function (newOptions) {
            app.options = newOptions;
            console.log("Extensions options loaded", app.options);
            // now that options are there we have the username so we can load the database
            app.databaseManager.init();
        });
    };
    OptionManager.prototype.save = function () {
        chrome.storage.sync.set(app.options, function () {
            console.log("Extension options saved", app.options);
        });
    };
    return OptionManager;
}());
var app = new BackgroundApplication();
var debug = false;
if (debug) {
    setTimeout(function () {
        debugger;
        app.run();
    }, 10000);
}
else {
    $(function () { return app.run(); });
}
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.sender !== "LPCOverlay")
        return;
    switch (message.message) {
        case "HELLO":
            if (sendResponse) {
                var monitoredUrl = MonitoredUrl.get(message.url);
                sendResponse(monitoredUrl.getLpcMessage(1 /* HelloResponse */, new Date()));
            }
            break;
    }
});
//TODO: <a href="https://icons8.com/web-app/5770/Sad">Sad icon</a> by Icons8
//============================================================================
