
//TODO: <a href="https://icons8.com/web-app/5770/Sad">Sad icon</a> by Icons8
//============================================================================
class BackgroundApplication {
    tabsMonitor: TabsMonitor;
    iconManager: IconManager;
    optionManager: OptionManager;
    databaseManager: DatabaseManager;
    siteManager: SiteManager;
    startupTime: string;

    counting: boolean;
    db: FirebaseClient;
    dbUid: string;
    options: AppOptions;
    defaultSettings: AccountSettings;
    settings: AccountSettings;

    run() {

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
        this.optionManager.init(
            () => {
                this.siteManager = new SiteManager();
                this.tabsMonitor = new TabsMonitor();
                this.iconManager = new IconManager();
                this.databaseManager = new DatabaseManager();

                this.databaseManager.init(() => {
                    this.tabsMonitor.init();
                });
            });
    }
}

interface AccountSettings {
    defaultAccess: Access;
    defaultInstantReporting: boolean;
    dailyMaximum: number;
    active: boolean;
    defaultGranularity: HistoricGranularity;
}


interface DaySetting {
    maximumToday: number;
}

class IconManager {
    badgeTickOnIcon = "images/happy-96.png";
    badgeTickOffIcon = "images/happySM-96.png";
    badgeTickOnTime = 250;
    badgeTickOffTime = 750;
    badgeDefaultIcon = "images/Parent Guardian-96.png";
    badgeTickCount: number = 0;

    badgeTick() {
        if (app.counting) {
            this.badgeTickCount++;
            if (this.badgeTickCount & 1) {
                chrome.browserAction.setIcon({ path: this.badgeTickOnIcon });
                setTimeout(this.badgeTick, this.badgeTickOnTime);
            } else {
                chrome.browserAction.setIcon({ path: this.badgeTickOffIcon });
                setTimeout(this.badgeTick, this.badgeTickOffTime);
            }
        }
        else chrome.browserAction.setIcon({ path: this.badgeDefaultIcon });
    }
}

class DatabaseManager {
    afterLoginCallback: () => void;
    afterLoginCalled = false;
    todaysTotal = 0;
    todayData: TodayData;
    // Initialize Firebase
    config = {
        apiKey: "AIzaSyC6iHEeS4kQ0eIZ0cNo7jPWCuGS-3gtAy4",
        authDomain: "leiaparentalcontrol.firebaseapp.com",
        databaseURL: "https://leiaparentalcontrol.firebaseio.com",
        storageBucket: "",
        messagingSenderId: "737945013874"
    };

    rand6(): string {
        return Math.floor(Math.random() * Math.pow(36, 6)).toString(36);
    }

    rand18(): string {
        return this.rand6() + this.rand6() + this.rand6();
    }

    init(callback: () => void) {
        this.afterLoginCallback = callback; "Signed in firebase"
        firebase.initializeApp(this.config);
        // Listening for auth state changes.

        firebase.auth().onAuthStateChanged((user: any) => {
            if (user) {
                app.dbUid = user.uid;
                console.log("Signed in firebase", user);
                this.afterSignin();
            } else {
                if (app.options.accountId == null || app.options.accountId.length == 0) {
                    app.options.accountId = this.rand18();
                    app.options.authKey = this.rand18();
                    app.optionManager.save();
                    this.signUp();
                }
                else {
                    this.signIn();
                }
            }
        });
    }


    signUp() {
        var email = "tmp" + app.options.accountId + "@ganaye.com";
        var password = app.options.authKey;
        firebase.auth().createUserWithEmailAndPassword(email, password).catch((err: any) => {
            // Handle Errors here.
            if (err) {
                alert("An error occured while signing up.")
            }
            else {
                console.log("userCreated");
            }
        });
    }

    signIn() {
        var email = "tmp" + app.options.accountId + "@ganaye.com";
        var password = app.options.authKey;
        firebase.auth().signInWithEmailAndPassword(email, password).catch((err: any) => {
            // Handle Errors here.
            if (err) {
                if (err.code == "auth/user-not-found") {
                    // this is strange but perhaps the databae was cleared
                    this.signUp();
                } else if (err.code == "auth/user-disabled") {
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
    }

    afterSignin() {

        app.tabsMonitor.checkAllTabs({ refreshTab: true });

        this.get<AccountSettings>(["accounts", app.options.accountId, "settings"],
            (newSettings) => {
                if (!newSettings) newSettings = <AccountSettings>{};

                if (typeof newSettings.defaultAccess === "undefined") newSettings.defaultAccess = app.defaultSettings.defaultAccess;
                if (typeof newSettings.defaultInstantReporting === "undefined") newSettings.defaultInstantReporting = app.defaultSettings.defaultInstantReporting;
                if (typeof newSettings.active === "undefined") newSettings.active = app.defaultSettings.active;
                if (typeof newSettings.dailyMaximum === "undefined") newSettings.dailyMaximum = app.defaultSettings.dailyMaximum;
                if (typeof newSettings.defaultGranularity === "undefined") newSettings.defaultGranularity = app.defaultSettings.defaultGranularity;
                console.log("New account settings", newSettings);
                app.settings = newSettings;
                this.gotAccountSettings = true;
                this.gotSettingsTodayDataAndSites();
            });
        this.once<TodayData>(["accounts", app.options.accountId, "today"],
            (dayData) => {
                this.todayData = dayData;
                this.gotTodayData = true;
                this.gotSettingsTodayDataAndSites();
            });
        this.get<{ [hostname: string]: Site }>(["accounts", app.options.accountId, "sites"],
            (newSites) => {
                app.siteManager.sites = newSites || {};
                this.gotSites = true;
                this.gotSettingsTodayDataAndSites();
            });
    }

    gotAccountSettings: boolean;
    gotTodayData: boolean;
    gotSites: boolean;

    gotSettingsTodayDataAndSites() {
        if (!this.gotAccountSettings
            || !this.gotTodayData
            || !this.gotSites) return;

        this.recalcTotal();
        if (this.afterLoginCallback && !this.afterLoginCalled) {
            this.afterLoginCalled = true;
            this.afterLoginCallback();
        }
        app.tabsMonitor.checkAllTabs({ settingsChanged: true });

    }

    recalcTotal(): void {
        var today = DatabaseManager.shortDate(new Date());
        this.todaysTotal = 0;
        for (var hostname in this.todayData) {
            var dailyRecord = this.todayData[hostname];
            var realHostName = dailyRecord.hostname;
            /*
            var page = dailyRecord.pages[];
            if (dailyRecord.startDate < today) {
                // put this in history
                var perSiteKey = ["accounts", app.options.accountId, "history", dailyRecord.hostname];
                app.databaseManager.transaction(perSiteKey, (history: History) => {
                    if (history == null || history.lastDate <= dailyRecord.startDate) {
                        history = app.databaseManager.increment(history, dailyRecord.duration, dailyRecord.startDate);
                    }
                    app.databaseManager.set(["accounts", app.options.accountId, "today", dailyRecord.hostname], null);
                    return history;
                });
            } else {
                var site = app.siteManager.getSite(realHostName)
                var access = (site && site.access)
                    ? site.access : app.settings.defaultAccess;
                if (access == Access.AllowedButTimed) {
                    this.todaysTotal += dailyRecord.duration;
                }
            }
            */
        }

    }

    static escapeChars: { [key: string]: string } = { ".": "\u2024", "$": "\uFF04", "[": "\u27E6", "]": "\u27E7", "#": "\uFF03", "/": "\u2044" };
    static unescapeChars: { [key: string]: string } = { "\u2024": ".", "\uFF04": "$", "\u27E6": "[", "\u27E7": "]", "\uFF03": "#", "\u2044": "/" };

    public static escapeKey(src: string) {
        var length = src.length;
        var result: string[] = [];
        for (var i = 0; i < length; i++) {
            var srcChar: string = src.charAt(i);
            var keyChar: string = DatabaseManager.escapeChars[srcChar];
            result.push(keyChar || srcChar);
        }
        return result.join("");
    }

    public static unescapeKey(src: string) {
        var length = src.length;
        var result: string[] = [];
        for (var i = 0; i < length; i++) {
            var keyChar: string = src.charAt(i);
            var srcChar: string = DatabaseManager.unescapeChars[keyChar];
            result.push(srcChar || keyChar);
        }
        return result.join("");
    }

    public getRef(path: string | string[]): any {
        if (Array.isArray(path)) {
            path = path.map((s) => DatabaseManager.escapeKey(s)).join("/");
        }
        else path = DatabaseManager.escapeKey(path);
        return firebase.database().ref(path);
    }


    public get<T>(path: string | string[], onFunction: (value: T) => void): void {
        this.getRef(path).on("value", (snap: any) => {
            onFunction(<T>snap.val());
        });
    }

    public once<T>(path: string | string[], onFunction: (value: T) => void): void {
        this.getRef(path).once("value").then((snap: any) => {
            onFunction(<T>snap.val());
        });
    }


    public set(path: string | string[], value: any) {
        this.getRef(path).set(value);
    }

    public push(path: string | string[], value: any): string {
        var ref = this.getRef(path);
        var key = ref.push(value).getKey();
        return key;
    }

    public transaction<T>(path: string | string[], updateData: (data: T) => T, onSuccess?: () => void, onError?: () => void) {
        var ref = this.getRef(path);
        var data = ref.transaction((data: any, x: any, y: any) => {
            data = updateData(data);
            return data;
        }, (error: any, committed: boolean, snapshot: any) => {
            var path = ref.path.toString();
            var val: any = val ? snapshot.val() : null;
            if (error) {
                console.log("Transaction failed abnormally.", error, "data:", path, val);
                if (onError) onError();
            } else if (!committed) {
                console.log("Transaction aborted: No data provided.", path, val);
                if (onError) onError();
            } else {
                console.log("Data saved", path, val);
                if (onSuccess) onSuccess();
            }
        });

    }


    nbMonthMax = 100;
    nbDayMax = 100;
    LOCAL_MILLENIUM_DAY = new Date(2000, 0, 1).getTime();

    static fullDate(d: Date): string {
        return d.getFullYear() + "-"
            + DatabaseManager.twoDigits(d.getMonth() + 1) + "-"
            + DatabaseManager.twoDigits(d.getDate()) + " "
            + DatabaseManager.twoDigits(d.getHours()) + ":"
            + DatabaseManager.twoDigits(d.getMinutes()) + ":"
            + DatabaseManager.twoDigits(d.getSeconds());
    };

    static shortDate(d: Date): string {
        return d.getFullYear() + "-"
            + DatabaseManager.twoDigits(d.getMonth() + 1) + "-"
            + DatabaseManager.twoDigits(d.getDate());
    }

    static twoDigits(n: number): string {
        return n >= 10 ? n.toString() : "0" + n;
    }


    public increment(history: History, increment: number, newDateString: string): History {
        var result = <History>{
            lastDate: newDateString
        };
        if (!history) history = <History>{};
        var lastDate = new Date(history.lastDate);
        var newDate = new Date(newDateString)
        result.monthly = this.incrementInArray(history.monthly,
            increment,
            lastDate.getFullYear() * 12 + lastDate.getMonth(),
            newDate.getFullYear() * 12 + newDate.getMonth(),
            this.nbMonthMax);

        result.daily = this.incrementInArray(history.daily,
            increment,
            Math.floor((lastDate.getTime() - this.LOCAL_MILLENIUM_DAY) / 86400000),
            Math.floor((newDate.getTime() - this.LOCAL_MILLENIUM_DAY) / 86400000),
            this.nbDayMax);
        return result;
    }

    public incrementInArray(array: number[],
        increment: number,
        previousIndex: number,
        newIndex: number,
        max: number): number[] {
        array = array ? array.slice() : [];
        if (array.length == 0) array.push(0);
        else {
            if (!previousIndex) previousIndex = 0;
            var nbToAdd = newIndex - previousIndex;
            if (nbToAdd > 0) {
                if (nbToAdd >= max) {
                    nbToAdd = max;
                    array = [];
                }
                else if (nbToAdd + array.length > max) {
                    array = array.slice(nbToAdd - max)
                }
                for (var i = 0; i < nbToAdd; i++) array.push(0);
            }
        }
        array[array.length - 1] += increment;
        return array;
    }

}

// class CachedSite {
//     constructor(readonly hostname: string) {

//     }
//     site: Site;
//     listeners: ((site: Site) => void)[] = [];
// }
class SiteManager {
    //cache: { [key: string]: CachedSite } = {};
    sites: { [hostname: string]: Site } = {};

    getSite(hostname: string): Site {
        return this.sites[DatabaseManager.escapeKey(hostname)] || {};
    }
}

class MonitoredPage {

}

class MonitoredUrl {
    public static list: { [url: string]: MonitoredUrl } = {};

    public static get(url: string, title?: string, now?: Date): MonitoredUrl {
        var result = MonitoredUrl.list[url];
        if (!result) {
            result = new MonitoredUrl(url);
            if (!now) now = new Date();
            result.startDate = DatabaseManager.fullDate(now);
            result.title = "";
            MonitoredUrl.list[url] = result;
        }
        if (title) result.title = title;
        return result;
    }


    private constructor(url: string) {
        var realURL = new URL(url);
        this.hostname = realURL.hostname;
        this.path = realURL.pathname;
        this.query = realURL.search;

        this.url = url;
        this.modified = false; // no need to save a blank url with 0 duration
        this.active = false;
        this.tabIds = [];
    }


    private active: boolean;
    private modified: boolean;
    private hostname: string;
    private url: string;
    private title: string;
    private startDate: string;
    private startTime: string;
    private path: string;
    private query: string;
    private hash: string
    private activatedTime: Date | null;
    private deactivatedTime: Date | null;
    private lastSaveTime: Date;
    public tabIds: number[];

    isActive(): boolean {
        return this.active;
    }

    setActive(newActive: boolean) {
        if (newActive != this.active) {
            this.active = newActive;
            this.modified = true;
            if (newActive) this.activatedTime = new Date();
            else this.deactivatedTime = new Date();
        }
    }

    public getSite(): Site {
        return app.siteManager.getSite(this.hostname);
    }

    setTitle(newTitle: string) {
        if (newTitle != this.title) {
            this.title = newTitle;
            this.modified = true;
        }
    }

    remove() {
        this.setActive(false);
    }

    static MinimalTimeSave = 15000; // 15 seconds

    saveIfModified(nowTime: number) {
        if (this.modified
            || this.active && ((new Date().getTime() - this.lastSaveTime.getTime()) >= MonitoredUrl.MinimalTimeSave)) {
            this.save();
            this.modified = false;
        }
    }

    private save() {
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
        app.databaseManager.transaction(todayKey, (currentRecord: SitePage) => {
            var now = new Date();

            var increment = 0;

            var startTime = this.activatedTime;
            if (currentRecord && currentRecord.lastSave) {
                var lastSave = new Date(currentRecord.lastSave);
                if (!startTime || lastSave.getTime() > startTime.getTime()) startTime = lastSave;
            }
            var endTime = now;
            if (!this.active && this.deactivatedTime) {
                endTime = this.deactivatedTime;
            }
            if (endTime && startTime) {
                var elapsed = endTime.getTime() - startTime.getTime();
                if (elapsed > 0) increment = elapsed;
                console.log("Saving", todayKey.join(" "), "Elapsed", (Math.round(elapsed / 100.0)/10)+ "sec");
            }

            var newRecord: SitePage =
                {
                    // we store the real hostname despite it is also in the address
                    // because it is encoded in the address.
                    startDate: this.startDate,
                    title: this.title,
                    duration: (currentRecord ? currentRecord.duration : 0) + increment,
                    active: this.active,
                    lastSave: DatabaseManager.fullDate(now)
                }

            return newRecord;
        });
    }

}

interface ParsedUrl {
    protocol: string;
    host: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
}

enum Access {
    Unknown = 0,
    AllowedAndFree = 1,
    AllowedButTimed = 2,
    Forbidden = 3
}

enum HistoricGranularity {
    Domain = 1,
    IndividualPage = 2,
    QueryString = 3,
    HashValues = 4
}

interface SiteException {
    queryRegex: string;
    description: string;
    access: Access;
    instantReporting: boolean;
}


class Site {
    hostname: string;
    description: string;
    historicGranularity: HistoricGranularity;
    access: Access;
    instantReporting: boolean;

    exceptions: SiteException[]
}


interface History {
    lastDate: string;
    daily: number[];
    monthly: number[];
}

type TodayData = { [site: string]: SiteDailyRecord };
type WeekData = { [date: string]: TodayData };

interface SiteDailyRecord {
    hostname: string,
    pages: { [key: string]: SitePage }
}

interface SitePage {
    active: boolean
    startDate: string,
    title: string,
    duration: number,
    lastSave: string;
}

class TabsMonitor {

    lastNow: number;
    windows: { [id: number]: chrome.windows.Window } = {};

    public static parseURL(url: string): ParsedUrl {
        var parser = document.createElement("a");
        try {
            parser.href = url;
        } catch (error) {

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
    }

    checkWindowsAndTabs() {
        chrome.windows.getAll((windows) => {
            for (var w of windows) {
                this.windows[w.id] = w;
            }
            this.checkAllTabs();
        });
    }

    checkAllTabs(options?: any): void {
        if (!options) options = {};
        chrome.tabs.query({}, (tabs) => {
            var now = new Date();
            var nowTime: number = now.getTime();
            var tabIds: { [url: string]: number[] } = {};
            var activeTabs: { [url: string]: boolean } = {};

            for (var tab of tabs) {
                if (!tab.id || !tab.url) continue;
                var url = tab.url || "";
                var monitoredUrl = MonitoredUrl.get(url, tab.title, now);
                var window = this.windows[tab.windowId];
                var active = (tab.active && (!window || window.state !== "minimized"))
                    || tab.audible;
                var tabIsNew = false;
                if (!tabIds[url]) tabIds[url] = [];
                tabIds[url].push(tab.id);

                if (active) activeTabs[url] = true;
                if (tab.title) monitoredUrl.setTitle(tab.title);

                if (options.settingsChanged || tabIsNew) {
                    this.sendLpcMessage(url, tab.id);
                }
                if (options.refreshTab) {
                    if (tab.url.substr(0, 9) !== "chrome://")
                        chrome.tabs.reload(tab.id);
                }
            }
            for (var url in MonitoredUrl.list) {
                var monitoredUrl = MonitoredUrl.list[url];
                if (!monitoredUrl) continue;
                monitoredUrl.setActive(activeTabs[url] || false);
                if (tabIds[url]) {
                    monitoredUrl.tabIds = tabIds[url];
                }
                else {
                    monitoredUrl.remove();
                    delete MonitoredUrl.list[url];
                }
                monitoredUrl.saveIfModified(nowTime);
            }
        });
    }

    getLpcMessage(url: string): any {
        var monitoredUrl = MonitoredUrl.get(url);
        var site = monitoredUrl.getSite();
        var access = (site && site.access) || app.settings.defaultAccess;
        var showPage = app.settings.active && access <= Access.AllowedButTimed;

        var message = {
            sender: "LPCBackground",
            showPage: showPage,
            message: (site && site.description) || "Leia Parental Control"
        };
        return message;
    }

    sendLpcMessage(url: string, tabId: number) {
        var message = this.getLpcMessage(url);
        chrome.tabs.sendMessage(tabId, message, function (response) {
            console.log("Start action sent");
        });

    }

    init() {
        chrome.tabs.onCreated.addListener((tab) => {
            this.checkAllTabs();
        });
        chrome.tabs.onActivated.addListener((tabinfo) => {
            this.checkAllTabs();
        });
        chrome.tabs.onUpdated.addListener((tabId) => {
            this.checkAllTabs();
        });
        chrome.tabs.onRemoved.addListener((tabId) => {
            this.checkAllTabs();
        });

        chrome.windows.onCreated.addListener((window) => {
            this.windows[window.id] = window;
        });

        chrome.windows.onFocusChanged.addListener((x, y) => {
            this.checkWindowsAndTabs();
        });

        chrome.windows.onRemoved.addListener((windowId) => {
            delete this.windows[windowId];
            this.checkWindowsAndTabs();
        });
        this.setClock();

        this.checkWindowsAndTabs();
    }

    clockFrequency = 60; // in minutes (max 60)

    setClock() {
        var now = new Date();
        var nextTime = new Date(now);
        var newMinutes = Math.floor(now.getMinutes() / this.clockFrequency) * this.clockFrequency + this.clockFrequency;
        nextTime.setMinutes(newMinutes, 0, 0);
        var timeToNextTime = nextTime.getTime() - now.getTime();

        setTimeout(() => {
            this.checkAllTabs();
            this.setClock();
        }, timeToNextTime);
    }
}

interface AppOptions {
    version: number;
    accountId: string;
    parentsEmail: string;
    authKey: string;
}


class OptionManager {

    init(callback: () => void): void {

        app.options = {
            version: 1,
            accountId: "",
            parentsEmail: "",
            authKey: "",
        }

        chrome.storage.sync.get(app.options, (newOptions: AppOptions) => {
            app.options = newOptions;
            console.log("Extensions options loaded", app.options);
            callback();
        });
    }


    save() {
        chrome.storage.sync.set(app.options, () => {
            console.log("Extension options saved", app.options);
        });
    }

}

var firebase: any;
var app = new BackgroundApplication();

if (typeof ($) !== "undefined") {
    $(() => {
        app.run();
    });
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.sender !== "LPCOverlay") return;
    switch (message.message) {
        case "HELLO":
            if (sendResponse) {
                sendResponse(app.tabsMonitor.getLpcMessage(message.url));
            }
            break;
    }
});
