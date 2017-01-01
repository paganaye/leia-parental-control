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

const enum Access {
    Unknown = 0,
    AllowedAndFree = 1,
    AllowedButTimed = 2,
    Forbidden = 3,
    InstantClose = 4
}
const AccessNames = ["unknown", "allowed", "timed", "forbidden", "forbidden"];

const enum HistoricGranularity {
    Domain = 1,
    IndividualPage = 2,
    QueryString = 3,
    HashValues = 4
}


type DatabaseUpdates = { [key: string]: any };

interface UserSettings {
    defaultAccess: Access;
    defaultInstantReporting: boolean;
    dailyMaximum: number;
    active: boolean;
    defaultGranularity: HistoricGranularity;
    emails: string;

    site: { [hostname: string]: SiteSetting };
    url: { [hostname: string]: PageSetting }

    blockedFrom?: string;
    blockedTo?: string;
}

interface AggregateTimings {
    total: number;
    activated?: string | null;
    error?: string;
}

type TodayData = { [category: string]: CategoryData };
type CategoryData = { [name: string]: AggregateTimings };



interface ParsedUrl {
    protocol: string;
    host: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
}

interface AppOptions {
    version: number;
    accountId: string;
    authKey: string;
}


interface SiteException {
    description: string;
    pathRegex: string;
    titleRegex: string;
    contentRegex: string
    access: Access;
    instantReporting: boolean;
}

interface History {
    lastDate: string;
    daily: number[];
    monthly: number[];
}

interface PageSetting {
    description: string;
    access: Access;
    instantReporting: boolean;
    dailyMaximum?: number;
}

interface SiteSetting extends PageSetting {
    historicGranularity: HistoricGranularity;
}


const enum LpcAction {
    NewTab,
    HelloResponse,
    Activated,
    Deactivated,
    SettingsChanged,
    MinuteTimer
}

interface LpcMessage {
    sender: "LPCBackground";
    access: Access;
    message: string;
    todayTotal: number;
    todayMax: number;
    siteTotal: number;
    siteMax: number;
}

class BackgroundApplication {
    tabsMonitor: TabsMonitor;
    iconManager: IconManager;
    optionManager: OptionManager;
    databaseManager: DatabaseManager;
    startupTime: string;

    counting: boolean;
    options: AppOptions;
    defaultSettings: UserSettings;
    settings: UserSettings;
    todayData: TodayData;
    initComplete: boolean = false;

    run() {
        this.startupTime = new Date().toString();

        app.defaultSettings = {
            active: true,
            dailyMaximum: 2700,
            defaultAccess: Access.AllowedButTimed,
            defaultInstantReporting: false,
            defaultGranularity: HistoricGranularity.IndividualPage,
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

    }
}

function deepMerge<T>(object1: T, object2?: any, overwrite?: boolean): T {
    var recursiveMerge = (destination: any, merge: any): any => {
        for (var prop in merge) {
            if (!merge.hasOwnProperty(prop)) continue;
            if (destination === undefined) destination = {};
            if (destination.hasOwnProperty(prop) && !overwrite) continue;
            var mergeValue = merge[prop];
            destination[prop] = (typeof mergeValue === "object")
                ? recursiveMerge(destination[prop] || {}, mergeValue)
                : mergeValue;
        }
        return destination;
    }
    var result = recursiveMerge({}, object1 || {});
    if (object2) result = recursiveMerge(result, object2);
    return result as T;
}

function OneDec(n: number) {
    return Math.round(n * 10) / 10;
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

class HistoryManager {
    nbMonthMax = 100;
    nbDayMax = 100;
    //LOCAL_MILLENIUM_DAY = new Date(2000, 0, 1).getTime();

    // public increment(history: History, increment: number, newDateString: string): History {
    //     var result = <History>{
    //         lastDate: newDateString
    //     };
    //     if (!history) history = <History>{};
    //     var lastDate = new Date(history.lastDate);
    //     var newDate = new Date(newDateString)
    //     result.monthly = this.incrementInArray(history.monthly,
    //         increment,
    //         lastDate.getFullYear() * 12 + lastDate.getMonth(),
    //         newDate.getFullYear() * 12 + newDate.getMonth(),
    //         this.nbMonthMax);

    //     result.daily = this.incrementInArray(history.daily,
    //         increment,
    //         Math.floor((lastDate.getTime() - this.LOCAL_MILLENIUM_DAY) / 86400000),
    //         Math.floor((newDate.getTime() - this.LOCAL_MILLENIUM_DAY) / 86400000),
    //         this.nbDayMax);
    //     return result;
    // }

    // public incrementInArray(array: number[],
    //     increment: number,
    //     previousIndex: number,
    //     newIndex: number,
    //     max: number): number[] {
    //     array = array ? array.slice() : [];
    //     if (array.length == 0) array.push(0);
    //     else {
    //         if (!previousIndex) previousIndex = 0;
    //         var nbToAdd = newIndex - previousIndex;
    //         if (nbToAdd > 0) {
    //             if (nbToAdd >= max) {
    //                 nbToAdd = max;
    //                 array = [];
    //             }
    //             else if (nbToAdd + array.length > max) {
    //                 array = array.slice(nbToAdd - max)
    //             }
    //             for (var i = 0; i < nbToAdd; i++) array.push(0);
    //         }
    //     }
    //     array[array.length - 1] += increment;
    //     return array;
    // }

    // setSettings(emails: string[]) {
    //    }
}

class DatabaseManager {

    dbUid: string;


    firebaseApp: firebase.FirebaseApplication;
    database: firebase.Database;
    userRef: firebase.DatabaseReference;
    settingsRef: firebase.DatabaseReference;
    //userSitesRef: firebase.DatabaseReference;
    //userTodayRef: firebase.DatabaseReference;
    //todayRef: firebase.DatabaseReference;
    private dateSignature: string;



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

    init() {
        firebase.database.enableLogging(true);
        this.firebaseApp = firebase.initializeApp(this.config);
        this.database = this.firebaseApp.database();

        this.firebaseApp.auth().onAuthStateChanged((user: any) => {
            if (user) {
                this.dbUid = user.uid;
                this.userRef = this.database.ref("user").child(this.dbUid);
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

    saveEmailsSetting(emailArray: string[]) {
        var emails: { [key: string]: number } = {};
        var cpt = 0;
        emailArray.forEach(s => emails[DatabaseManager.escapeKey(s)] = cpt++);


        //this.set(this.emailRef, emails);
    }

    getEmailsSetting(): string[] {
        var result: string[] = [];
        // for (var x in app.settings.emails) {
        //     result[app.settings.emails[x]] = DatabaseManager.unescapeKey(x);
        // }
        return result;
    }


    signUp() {
        var email = "tmp" + app.options.accountId + "@ganaye.com";
        var password = app.options.authKey;

        this.firebaseApp.auth().createUserWithEmailAndPassword(email, password).catch((err: any) => {
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
        this.firebaseApp.auth().signInWithEmailAndPassword(email, password).catch((err: any) => {
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

    tabsMonitorInitDone: boolean;

    afterSignin() {
        console.log("afterSignin");
        if (!this.tabsMonitorInitDone) {
            this.tabsMonitorInitDone = true;
            app.tabsMonitor.init();
        }
        var gotSettings = false;
        var gotTodayData = false;
        var now = new Date();

        var checkTabs = () => {
            if (!gotSettings
                || !gotTodayData) return;
            app.initComplete = true;
            app.tabsMonitor.checkAllTabs(CheckAllTabsReason.SettingsChanged, now);
            //this.checkTodayData();
        }

        var onSettingsChanged = (snap: firebase.DataSnapshot) => {
            var newSettings: UserSettings = snap.val() || {};
            app.settings = deepMerge(newSettings, app.defaultSettings);
            console.log("New account settings", app.settings);
            gotSettings = true;
            checkTabs();
        };

        if (this.settingsRef) this.settingsRef.off("value", onSettingsChanged)
        this.settingsRef = this.userRef.child("settings");
        this.settingsRef.on("value", onSettingsChanged);

        var onGotTodayData = (snap: firebase.DataSnapshot) => {
            app.todayData = snap.val() || {};
            gotTodayData = true;
            checkTabs();
        }

        this.dateSignature = DatabaseManager.getHistoricSignature(now)
        this.getTodayRef().once("value", onGotTodayData);
    }

    getDateSignature(): string {
        return this.dateSignature;
    }

    setDateSignature(value: string) {
        if (value == this.dateSignature) return;
        this.dateSignature = value;

        app.todayData = <TodayData>{};
    }

    getTodayRef() {
        return this.userRef.child("records").child(this.dateSignature);
    }

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

    private static escapeChars: { [key: string]: string } = {
        ".": "\u2024",
        "$": "\uFF04",
        "[": "\u27E6",
        "]": "\u27E7",
        "#": "\uFF03",
        "/": "\u2044"
    };

    private static reverseObject(src: any): any {
        return Object.keys(src).reduce((out: any, val: any) => {
            out[src[val]] = val;
            return out
        }, {});
    }

    private static unescapeChars = DatabaseManager.reverseObject(DatabaseManager.escapeChars);

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

    static getKey(parts: any[]): string {
        var result = parts.map((p) => {
            switch (typeof (p)) {
                case "object":
                    if (p instanceof Date) return DatabaseManager.fullDate(p);
                    else if (p == null) return "null"
                    else return p.toString();
                // no break;                    
                default:
                    return DatabaseManager.escapeKey(p.toString());
            }
        }).join("/");
        return result;
    }

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

    static getHistoricSignature(d: Date): string {
        return d.getFullYear() + "-"
            + DatabaseManager.twoDigits(d.getMonth() + 1) + "-"
            + DatabaseManager.twoDigits(d.getDate());
            // + " "
            // + DatabaseManager.twoDigits(d.getHours()) + "-"
            // + DatabaseManager.twoDigits(d.getMinutes())        
    };

    static twoDigits(n: number): string {
        return n >= 10 ? n.toString() : "0" + n;
    }
}

class TimedItem {
    private _active: number = 0;
    private _activatedTime: Date;
    private _initialized: boolean;
    private _timings: AggregateTimings;
    private _timingsPath: string;

    public static list: { [path: string]: TimedItem } = {};

    public static get(category: string, name: string) {
        var timingsPath = DatabaseManager.getKey([category, name]);

        var result = TimedItem.list[timingsPath];
        if (!result) {
            result = new TimedItem(category, name);
        }
        return result;
    }

    protected constructor(private category: string, private name: string) {
        this._timingsPath = DatabaseManager.getKey([category, name]);
        TimedItem.list[this._timingsPath] = this;
    }

    isActive(): boolean {
        return this._active > 0;
    }


    public start(updates: DatabaseUpdates, now: Date): void {
        if (!this._active) {
            if (!this._initialized) {
                var category: CategoryData = app.todayData[this.category] || {};
                this._timings = category[this.name] || {};
                this._initialized = true;
            }
            this._activatedTime = now;
            this._timings.activated = DatabaseManager.fullDate(this._activatedTime);
            updates[this._timingsPath] = this._timings;
        }
        this._active += 1;
    }

    public stop(updates: DatabaseUpdates, now: Date): void {
        if (!this._active) return;
        this._active -= 1;
        if (!this._active) {
            if (!this._activatedTime) return;
            var duration = (now.getTime() - this._activatedTime.getTime()) / 1000;
            delete this._timings.activated;
            this._timings.total = OneDec((this._timings.total || 0) + duration);
            updates[this._timingsPath] = this._timings;
        }
    }

    public getTotal(now: Date): number {
        if (!this._initialized) return 0;
        var result = this._timings.total || 0;
        if (this._activatedTime) {
            var d = (now.getTime() - this._activatedTime.getTime()) / 1000;
            result += d;
        }
        return Math.round(result);
    }

    public dispose(): void {
        delete TimedItem.list[this._timingsPath];
    }

    public static resetToZero(): void {
        for (var item in TimedItem.list) {
            var timings = TimedItem.list[item]._timings;
            if (timings) delete timings.total;
        }
    }
}

class MonitoredSite extends TimedItem {
    private hostnameKey: string;
    public static list: { [hostname: string]: MonitoredSite } = {};

    public static get(hostname: string, title?: string): MonitoredSite {
        var result = MonitoredSite.list[hostname];
        if (!result) {
            MonitoredSite.list[hostname] = result = new MonitoredSite(hostname);
        }
        return result;
    }

    private constructor(private hostname: string) {
        super("site", hostname);
        this.hostnameKey = DatabaseManager.escapeKey(hostname);
        this.accessTimedItem = TimedItem.get("access", AccessNames[this.access]);
    }


    public get historicGranularity(): HistoricGranularity {
        var siteSettings = app.settings.site[this.hostnameKey] || {};
        return siteSettings.historicGranularity || app.defaultSettings.defaultGranularity;
    }

    public get access(): Access {
        var siteSettings = app.settings.site[this.hostnameKey] || {};
        return siteSettings.access || app.defaultSettings.defaultAccess;
    }

    public get description(): string {
        var siteSettings = app.settings.site[this.hostnameKey] || {};
        return siteSettings.description || "";
    }

    getDailyMaximum(): number {
        return 3600;
    }

    accessTimedItem: TimedItem;

    start(updates: DatabaseUpdates, now: Date): void {
        super.start(updates, now);
        this.accessTimedItem.start(updates, now);
    }

    stop(updates: DatabaseUpdates, now: Date): void {
        super.stop(updates, now);
        this.accessTimedItem.stop(updates, now);
    }

    public dispose(): void {
        super.dispose();
        delete MonitoredSite.list[this.hostname];
    }
}

interface TabIdAndMonitoredUrl {
    tabId: number;
    monitoredUrl: MonitoredUrl
}



class MonitoredUrl extends TimedItem {
    public static list: { [url: string]: MonitoredUrl } = {};
    private site: MonitoredSite;
    private hostname: string;
    private url: string;
    private title: string;
    private path: string;
    private query: string;
    private hash: string
    public tabIds: number[];

    public static get(url: string, title?: string): MonitoredUrl {
        var result = MonitoredUrl.list[url];
        if (!result) {
            var realURL = new URL(url);
            var hostName = realURL.hostname.replace(/^www\./, "").toLowerCase();
            var site = MonitoredSite.get(hostName);
            var normalizedUrl: string;
            switch (site.historicGranularity) {
                case HistoricGranularity.Domain:
                    normalizedUrl = hostName;
                    break;
                case HistoricGranularity.QueryString:
                    normalizedUrl = hostName + realURL.pathname + realURL.search;
                    break;
                case HistoricGranularity.HashValues:
                    normalizedUrl = hostName + realURL.pathname + realURL.search + realURL.hash;
                    break;
                case HistoricGranularity.IndividualPage:
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
        if (title) result.title = title;
        return result;
    }

    private constructor(normalizedUrl: string) {
        super("url", normalizedUrl);
        var realURL = new URL("http://" + normalizedUrl);
        this.hostname = realURL.hostname;
        this.path = realURL.pathname;
        this.query = realURL.search;

        this.url = normalizedUrl;
        this.tabIds = [];
        this.site = MonitoredSite.get(this.hostname);
    }

    getAccess(): Access {
        return this.site.access;
    }

    getTimingPath(): any[] {
        return [
            "sites", this.hostname,
            "pages", this.getPagePath(),
            "timings"];
    }

    setTitle(newTitle: string) {
        if (newTitle != this.title) {
            this.title = newTitle;
        }
    }

    private getPagePath(): string {
        var path: string;

        switch (this.site.historicGranularity || app.settings.defaultGranularity) {
            case HistoricGranularity.IndividualPage:
                path = this.path;
                break;
            case HistoricGranularity.QueryString:
                path = this.path + this.query;
                break;
            case HistoricGranularity.HashValues:
                path = this.path + this.query + this.hash;
                break;
            case HistoricGranularity.Domain:
            default:
                path = "/";
                break;
        }
        return path;
    }

    getLpcMessage(action: LpcAction, now: Date): LpcMessage {
        var access = app.settings.active ? this.site.access : Access.InstantClose;

        var todayTotal = TimedItem.get("access", "timed");
        var todayMax = app.settings.dailyMaximum;
        var siteTotal = this.site.getTotal(now);
        var siteMax = this.site.getDailyMaximum();

        var message: LpcMessage = {
            sender: "LPCBackground",
            message: this.site.description || "Leia Parental Control",
            access: access,
            todayTotal: todayTotal.getTotal(now),
            todayMax: todayMax,
            siteTotal: siteTotal,
            siteMax: siteMax

        };
        return message;
    }

    sendLpcMessages(action: LpcAction, now: Date) {
        if (!this.tabIds) return;
        for (var id of this.tabIds) {
            this.sendLpcMessage(id, action, now);
        };
    }

    sendLpcMessage(tabId: number, action: LpcAction, now: Date): void {
        var message = this.getLpcMessage(action, now);
        if (message.access == Access.InstantClose) {
            chrome.tabs.remove(tabId);
        }
        else chrome.tabs.sendMessage(tabId, message);
    }

    public dispose(): void {
        super.dispose();
        delete MonitoredUrl.list[this.url];
    }

    start(updates: DatabaseUpdates, now: Date): void {
        super.start(updates, now);
        this.site.start(updates, now);
    }

    stop(updates: DatabaseUpdates, now: Date): void {
        super.stop(updates, now);
        this.site.stop(updates, now);
    }

    getNormalizedUrl(): string {
        return this.url;
    }
}

enum CheckAllTabsReason {
    SettingsChanged,
    TabChanged,
    MinuteTimer
}

class TabsMonitor {
    windows: { [id: number]: chrome.windows.Window } = {};
    activeTabsIds: TabIdAndMonitoredUrl[] = [];

    checkWindowsAndTabs() {
        setTimeout(() => {
            // this is a bit fiddly, we are trying to detect minimized and closed windows here
            chrome.windows.getAll((windows) => {
                for (var w of windows) {
                    this.windows[w.id] = w;
                }
                this.checkAllTabs(CheckAllTabsReason.TabChanged, new Date());
            });
        });
    }


    checkAllTabs(reason: CheckAllTabsReason, now: Date): void {
        if (!app.initComplete) return;

        chrome.tabs.query({}, (tabs) => {
            var newDateSignature = DatabaseManager.getHistoricSignature(now);

            if (newDateSignature != app.databaseManager.getDateSignature()) {
                this.postUpdates({}, {}, now);
                app.databaseManager.setDateSignature(newDateSignature);
                TimedItem.resetToZero();
            }

            var nowTime: number = now.getTime();
            var tabIds: { [url: string]: number[] } = {};
            var activeTabs: { [url: string]: boolean } = {};
            var newActiveTabsIds: TabIdAndMonitoredUrl[] = [];


            for (var tab of tabs) {
                if (!tab.id || !tab.url) continue;
                var url = tab.url || "";
                var monitoredUrl = MonitoredUrl.get(url, tab.title);
                url = monitoredUrl.getNormalizedUrl();
                var window = this.windows[tab.windowId];
                var active = (tab.active && (!window || window.state !== "minimized"))
                    || tab.audible;
                var tabIsNew = false;
                if (!tabIds[url]) tabIds[url] = [];
                tabIds[url].push(tab.id);

                if (active) activeTabs[url] = true;
                if (tab.title) monitoredUrl.setTitle(tab.title);

                if (tab.active) {
                    newActiveTabsIds.push({ tabId: tab.id, monitoredUrl: monitoredUrl });
                    if (reason == CheckAllTabsReason.SettingsChanged) {
                        monitoredUrl.sendLpcMessage(tab.id, LpcAction.SettingsChanged, now);
                    }
                }
            }
            this.activeTabsIds = newActiveTabsIds;

            this.postUpdates(tabIds, activeTabs, now);
        });
    }

    postUpdates(tabIds: { [url: string]: number[] }, activeTabs: { [url: string]: boolean }, now: Date) {
        // It generate quite a bit of database noise to deactivate and reactivate a site
        // It is better to activate new tabs and the deactivate old ones.
        var updates: DatabaseUpdates = {};
        // So: first activate
        for (var url in MonitoredUrl.list) {
            var monitoredUrl = MonitoredUrl.list[url];
            if (monitoredUrl) {
                monitoredUrl.tabIds = tabIds[url];
                if (activeTabs[url] && !monitoredUrl.isActive()) {
                    monitoredUrl.start(updates, now);
                    monitoredUrl.sendLpcMessages(LpcAction.Activated, now);
                }
            }
        }
        // And then deactivate
        for (var url in MonitoredUrl.list) {
            var monitoredUrl = MonitoredUrl.list[url];
            if (monitoredUrl && !activeTabs[url]) {
                if (monitoredUrl.isActive()) {
                    monitoredUrl.stop(updates, now);
                    monitoredUrl.sendLpcMessages(LpcAction.Deactivated, now);
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
    }

    init() {
        chrome.tabs.onCreated.addListener((tab) => {
            this.checkAllTabs(CheckAllTabsReason.TabChanged, new Date());
        });
        chrome.tabs.onActivated.addListener((tabinfo) => {
            this.checkAllTabs(CheckAllTabsReason.TabChanged, new Date());
        });
        chrome.tabs.onUpdated.addListener((tabId) => {
            this.checkAllTabs(CheckAllTabsReason.TabChanged, new Date());
        });
        chrome.tabs.onRemoved.addListener((tabId) => {
            this.checkAllTabs(CheckAllTabsReason.TabChanged, new Date());
        });

        chrome.windows.onCreated.addListener((window) => {
            this.windows[window.id] = window;
        });

        chrome.windows.onFocusChanged.addListener((x, y) => {
            this.checkWindowsAndTabs();
        });

        this.minuteClock();
        setInterval(() => this.secondClock(), 1000);
    }

    minuteCounter = 0;

    minuteClock() {
        this.minuteCounter++;

        var now = new Date();
        this.checkAllTabs(CheckAllTabsReason.MinuteTimer, now);
        var secondsToNextMinute = (60 - now.getSeconds());

        setTimeout(() => {
            this.minuteClock();
        }, secondsToNextMinute * 1000);
    }

    secondClock() {
        var now = new Date();
        for (var x of app.tabsMonitor.activeTabsIds) {
            x.monitoredUrl.sendLpcMessage(x.tabId, LpcAction.MinuteTimer, now);
        }
    }

}

class OptionManager {

    init(): void {

        app.options = {
            version: 1,
            accountId: "",
            authKey: "",
        }

        chrome.storage.sync.get(app.options, (newOptions: AppOptions) => {
            app.options = newOptions;
            console.log("Extensions options loaded", app.options);
            // now that options are there we have the username so we can load the database
            app.databaseManager.init();
        });
    }


    save() {
        chrome.storage.sync.set(app.options, () => {
            console.log("Extension options saved", app.options);
        });
    }

}

var app = new BackgroundApplication();
var debug = false;

if (debug) {
    setTimeout(() => {
        debugger;
        app.run();
    }, 10000)
} else {
    $(() => app.run());
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.sender !== "LPCOverlay") return;
    switch (message.message) {
        case "HELLO":
            if (sendResponse) {
                var monitoredUrl = MonitoredUrl.get(message.url);
                sendResponse(monitoredUrl.getLpcMessage(LpcAction.HelloResponse, new Date()));
            }
            break;
    }
});
//TODO: <a href="https://icons8.com/web-app/5770/Sad">Sad icon</a> by Icons8
//============================================================================
