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
var BackgroundApplication = (function () {
    function BackgroundApplication() {
        this.sitesSettings = {};
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
            globalExceptions: {}
        };
        app.settings = deepMerge(app.defaultSettings);
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
                ? recursiveMerge(destination[prop], mergeValue)
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
        this.LOCAL_MILLENIUM_DAY = new Date(2000, 0, 1).getTime();
    }
    HistoryManager.prototype.increment = function (history, increment, newDateString) {
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
    HistoryManager.prototype.incrementInArray = function (array, increment, previousIndex, newIndex, max) {
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
    HistoryManager.prototype.setSettings = function (emails) {
    };
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
        if (!this.tabsMonitorInitDone) {
            this.tabsMonitorInitDone = true;
            app.tabsMonitor.init();
        }
        var gotAccountSettings = false;
        var gotSites = false;
        var gotTodayData = false;
        this.userRef = this.database.ref("users").child(this.dbUid);
        var checkTabs = function () {
            if (!gotAccountSettings
                || !gotTodayData
                || !gotSites)
                return;
            app.initComplete = true;
            app.tabsMonitor.checkAllTabs(CheckAllTabsReason.SettingsChanged);
        };
        var onSettingsChanged = function (snap) {
            var newSettings = snap.val();
            app.settings = deepMerge(newSettings, app.defaultSettings);
            console.log("New account settings", app.settings);
            gotAccountSettings = true;
            checkTabs();
        };
        if (this.settingsRef)
            this.settingsRef.off("value", onSettingsChanged);
        this.settingsRef = this.userRef.child("settings");
        this.settingsRef.on("value", onSettingsChanged);
        var onUserSitesChanged = function (snap) {
            app.sitesSettings = snap.val() || {};
            gotSites = true;
            checkTabs();
        };
        if (this.userSitesRef)
            this.settingsRef.off("value", onUserSitesChanged);
        this.userSitesRef = this.userRef.child("sites");
        this.userSitesRef.on("value", onUserSitesChanged);
        var onDayHistoricsChanged = function (snap) {
            app.todaysDataSnap = snap;
            gotTodayData = true;
            checkTabs();
        };
        if (this.userSitesRef)
            this.settingsRef.off("value", onUserSitesChanged);
        this.todaysRef = this.userRef.child("today");
        this.todaysRef.on("value", onDayHistoricsChanged);
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
    DatabaseManager.twoDigits = function (n) {
        return n >= 10 ? n.toString() : "0" + n;
    };
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
    function TimedItem() {
        this._groups = [];
    }
    TimedItem.prototype.isActive = function () {
        return this._active;
    };
    TimedItem.prototype.start = function (updates) {
        var _this = this;
        if (!this._active) {
            if (!this._initialized) {
                this.onInitializeGroups(updates);
                var timingsPath = DatabaseManager.getKey(this.getTimingPath());
                this._timings = app.todaysDataSnap.child(timingsPath).val() || {};
                this._timingsPath = DatabaseManager.getKey(this.getTimingPath());
                this._initialized = true;
            }
            this._active = true;
            this._activatedTime = new Date();
            this._timings.activated = DatabaseManager.fullDate(this._activatedTime);
            updates[this._timingsPath] = this._timings;
            this._groups.forEach(function (p) { return p.memberStarted(_this, updates); });
        }
    };
    TimedItem.prototype.stop = function (updates) {
        var _this = this;
        if (!this._active)
            return;
        this._active = false;
        if (!this._activatedTime)
            return;
        var duration = (new Date().getTime() - this._activatedTime.getTime()) / 1000;
        delete this._timings.activated;
        this._timings.timed = OneDec((this._timings.timed || 0) + duration);
        updates[this._timingsPath] = this._timings;
        this._groups.forEach(function (p) { return p.memberStopped(_this, updates); });
    };
    TimedItem.prototype.getValue = function () {
        if (!this._initialized)
            return 0;
        var result = this._timings.timed || 0;
        if (this._activatedTime) {
            var d = (new Date().getTime() - this._activatedTime.getTime()) / 1000;
            result += d;
        }
        return Math.round(result);
    };
    TimedItem.prototype.joinGroup = function (group, updates) {
        if (this._groups.indexOf(group) >= 0)
            return;
        this._groups.push(group);
        if (this._active)
            group.memberStarted(this, updates);
    };
    TimedItem.prototype.leaveGroup = function (group, updates) {
        if (this._active)
            group.memberStopped(this, updates);
        this._groups = this._groups.filter(function (x) { return x !== group; });
    };
    return TimedItem;
}());
var TimedGroup = (function (_super) {
    __extends(TimedGroup, _super);
    function TimedGroup(timingPath) {
        _super.call(this);
        this.timingPath = timingPath;
        this._nbMembers = 0;
    }
    TimedGroup.prototype.memberStarted = function (child, updates) {
        this._nbMembers += 1;
        if (this._nbMembers > 0)
            this.start(updates);
    };
    TimedGroup.prototype.memberStopped = function (child, updates) {
        this._nbMembers -= 1;
        if (this._nbMembers == 0)
            this.stop(updates);
    };
    TimedGroup.prototype.getTimingPath = function () {
        return this.timingPath;
    };
    TimedGroup.prototype.onInitializeGroups = function (updates) {
    };
    return TimedGroup;
}(TimedItem));
var MonitoredSite = (function () {
    function MonitoredSite(hostname) {
        this.hostname = hostname;
        this.hostnameKey = DatabaseManager.escapeKey(hostname);
        this.timeGroup = new TimedGroup(["sites", hostname, "timings"]);
    }
    MonitoredSite.get = function (hostname, title) {
        var result = MonitoredSite.list[hostname];
        if (!result) {
            MonitoredSite.list[hostname] = result = new MonitoredSite(hostname);
        }
        return result;
    };
    MonitoredSite.prototype.getTiming = function () {
        return this.timeGroup;
    };
    Object.defineProperty(MonitoredSite.prototype, "historicGranularity", {
        get: function () {
            var siteSettings = app.sitesSettings[this.hostnameKey] || {};
            return siteSettings.historicGranularity || app.defaultSettings.defaultGranularity;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MonitoredSite.prototype, "access", {
        get: function () {
            var siteSettings = app.sitesSettings[this.hostnameKey] || {};
            return siteSettings.access || app.defaultSettings.defaultAccess;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MonitoredSite.prototype, "description", {
        get: function () {
            var siteSettings = app.sitesSettings[this.hostnameKey] || {};
            return siteSettings.description || "";
        },
        enumerable: true,
        configurable: true
    });
    MonitoredSite.prototype.onInitializeGroups = function (updates) {
    };
    MonitoredSite.prototype.getSitesTotal = function () {
        return this.timeGroup.getValue();
    };
    MonitoredSite.prototype.getSitesMax = function () {
        return 3600;
    };
    MonitoredSite.list = {};
    MonitoredSite.todayTimed = new TimedGroup(["timings", "todayTimed"]);
    MonitoredSite.todayUntimed = new TimedGroup(["timings", "todayUntimed"]);
    MonitoredSite.todayAudio = new TimedGroup(["timings", "todayAudio"]);
    return MonitoredSite;
}());
var MonitoredUrl = (function (_super) {
    __extends(MonitoredUrl, _super);
    function MonitoredUrl(url) {
        _super.call(this);
        var realURL = new URL(url);
        this.hostname = realURL.hostname.replace(/^www\./, '');
        this.path = realURL.pathname;
        this.query = realURL.search;
        this.url = url;
        this.tabIds = [];
        this.site = MonitoredSite.get(this.hostname);
    }
    MonitoredUrl.get = function (url, title) {
        var result = MonitoredUrl.list[url];
        if (!result) {
            MonitoredUrl.list[url] = result = new MonitoredUrl(url);
        }
        if (title)
            result.title = title;
        return result;
    };
    MonitoredUrl.prototype.getAccess = function () {
        return this.site.access;
    };
    MonitoredUrl.prototype.onInitializeGroups = function (updates) {
        this.joinGroup(this.site.getTiming(), updates);
        if (this.getAccess() === 1 /* AllowedAndFree */) {
            this.joinGroup(MonitoredSite.todayUntimed, updates);
        }
        else {
            this.joinGroup(MonitoredSite.todayTimed, updates);
        }
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
    // private getHostRef(): firebase.DatabaseReference {
    //     var hostRef = app.databaseManager.todaysRef &&
    //         app.databaseManager.todaysRef
    //             .child("sites")
    //             .child(DatabaseManager.escapeKey(this.hostname));
    //     return hostRef;
    // }
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
    // private getVisitsRef(): firebase.DatabaseReference {
    //     var path = this.getPagePath();
    //     var visitsRef = this.getHostRef()
    //         .child("pages")
    //         .child(DatabaseManager.escapeKey(path))
    //         .child("visits");
    //     return visitsRef;
    // }
    MonitoredUrl.prototype.getLpcMessage = function (action) {
        var access = app.settings.active ? this.site.access : 4 /* InstantClose */;
        var todaysTotal = MonitoredSite.todayTimed.getValue(); //app.databaseManager.todaysTotal
        var todaysMax = app.settings.dailyMaximum; //app.databaseManager.todaysTotal
        var sitesTotal = this.site.getSitesTotal(); //todaysSite ? todaysSite.total :
        var sitesMax = this.site.getSitesMax();
        var message = {
            sender: "LPCBackground",
            message: this.site.description || "Leia Parental Control",
            access: access,
            todaysTotal: todaysTotal,
            todaysMax: todaysMax,
            sitesTotal: sitesTotal,
            sitesMax: sitesMax
        };
        return message;
    };
    MonitoredUrl.prototype.sendLpcMessages = function (action) {
        if (!this.tabIds)
            return;
        for (var _i = 0, _a = this.tabIds; _i < _a.length; _i++) {
            var id = _a[_i];
            this.sendLpcMessage(id, action);
        }
        ;
    };
    MonitoredUrl.prototype.sendLpcMessage = function (tabId, action) {
        var message = this.getLpcMessage(action);
        if (message.access == 4 /* InstantClose */) {
            chrome.tabs.remove(tabId);
        }
        else
            chrome.tabs.sendMessage(tabId, message);
    };
    MonitoredUrl.prototype.dispose = function (updates) {
        if (this.isActive()) {
            debugger; // not normal
            this.stop(updates);
        }
        delete MonitoredUrl.list[this.url];
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
                _this.checkAllTabs(CheckAllTabsReason.TabChanged);
            });
        });
    };
    TabsMonitor.prototype.checkAllTabs = function (reason) {
        var _this = this;
        if (!app.initComplete)
            return;
        chrome.tabs.query({}, function (tabs) {
            var now = new Date();
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
                        monitoredUrl.sendLpcMessage(tab.id, 4 /* SettingsChanged */);
                    }
                }
            }
            _this.activeTabsIds = newActiveTabsIds;
            // It generate quite a bit of database noise to deactivate and reactivate a site
            // It is better to activate new tabs and the deactivate old ones.
            var updates = {};
            // So: first activate
            for (var url in MonitoredUrl.list) {
                var monitoredUrl = MonitoredUrl.list[url];
                if (monitoredUrl) {
                    monitoredUrl.tabIds = tabIds[url];
                    if (activeTabs[url] && !monitoredUrl.isActive()) {
                        monitoredUrl.start(updates);
                        monitoredUrl.sendLpcMessages(2 /* Activated */);
                    }
                }
            }
            // And then deactivate
            for (var url in MonitoredUrl.list) {
                var monitoredUrl = MonitoredUrl.list[url];
                if (monitoredUrl && !activeTabs[url]) {
                    if (monitoredUrl.isActive()) {
                        monitoredUrl.stop(updates);
                        monitoredUrl.sendLpcMessages(3 /* Deactivated */);
                    }
                    if (!tabIds[url]) {
                        monitoredUrl.dispose(updates);
                    }
                }
            }
            if (Object.keys(updates).length > 0) {
                console.log("Posting", updates);
                app.databaseManager.todaysRef.update(updates);
            }
        });
    };
    TabsMonitor.prototype.init = function () {
        var _this = this;
        chrome.tabs.onCreated.addListener(function (tab) {
            _this.checkAllTabs(CheckAllTabsReason.TabChanged);
        });
        chrome.tabs.onActivated.addListener(function (tabinfo) {
            _this.checkAllTabs(CheckAllTabsReason.TabChanged);
        });
        chrome.tabs.onUpdated.addListener(function (tabId) {
            _this.checkAllTabs(CheckAllTabsReason.TabChanged);
        });
        chrome.tabs.onRemoved.addListener(function (tabId) {
            _this.checkAllTabs(CheckAllTabsReason.TabChanged);
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
        this.checkAllTabs(CheckAllTabsReason.MinuteTimer);
        var now = new Date();
        var secondsToNextMinute = (60 - now.getSeconds());
        setTimeout(function () {
            _this.minuteClock();
        }, secondsToNextMinute * 1000);
    };
    TabsMonitor.prototype.secondClock = function () {
        for (var _i = 0, _a = app.tabsMonitor.activeTabsIds; _i < _a.length; _i++) {
            var x = _a[_i];
            x.monitoredUrl.sendLpcMessage(x.tabId, 5 /* MinuteTimer */);
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
                sendResponse(monitoredUrl.getLpcMessage(1 /* HelloResponse */));
            }
            break;
    }
});
//TODO: <a href="https://icons8.com/web-app/5770/Sad">Sad icon</a> by Icons8
//============================================================================
