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

const enum HistoricGranularity {
    Domain = 1,
    IndividualPage = 2,
    QueryString = 3,
    HashValues = 4
}

interface AppSettings {
    defaultAccess: Access;
    defaultInstantReporting: boolean;
    dailyMaximum: number;
    active: boolean;
    defaultGranularity: HistoricGranularity;
    emails: string;
    globalExceptions: { [key: string]: SiteException }
}


type SitesSettings = { [hostname: string]: SiteSetting };
type DatabaseUpdates = { [key: string]: any };

interface AggregateTimings {
    timed: number;
    activated?: string | null;
    error?: string;
}

interface DayHistorics {
    timings: AggregateTimings;
    sites: { [site: string]: SiteHistorics }
}

interface SiteHistorics {
    timings: AggregateTimings;
    pages: { [path: string]: PageHistorics };
}

interface PageHistorics {
    title: string;
    timings: AggregateTimings;
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

interface SiteSetting {
    hostname: string;
    description: string;
    historicGranularity: HistoricGranularity;
    access: Access;
    instantReporting: boolean;
    dailyMaximum?: number;
    exceptions: { [key: string]: SiteException }
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
    todaysTotal: number;
    todaysMax: number;
    sitesTotal: number;
    sitesMax: number;
}

class BackgroundApplication {
    tabsMonitor: TabsMonitor;
    iconManager: IconManager;
    optionManager: OptionManager;
    databaseManager: DatabaseManager;
    sitesSettings: SitesSettings = {};

    startupTime: string;

    counting: boolean;
    options: AppOptions;
    defaultSettings: AppSettings;
    settings: AppSettings;
    todaysDataSnap: firebase.DataSnapshot;
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
            globalExceptions: {}
        };

        app.settings = deepMerge(app.defaultSettings);

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
                ? recursiveMerge(destination[prop], mergeValue)
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
    LOCAL_MILLENIUM_DAY = new Date(2000, 0, 1).getTime();

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

    setSettings(emails: string[]) {

    }
}

class DatabaseManager {

    dbUid: string;


    firebaseApp: firebase.FirebaseApplication;
    database: firebase.Database;
    userRef: firebase.DatabaseReference;
    settingsRef: firebase.DatabaseReference;
    userSitesRef: firebase.DatabaseReference;
    todaysRef: firebase.DatabaseReference;



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
        if (!this.tabsMonitorInitDone) {
            this.tabsMonitorInitDone = true;
            app.tabsMonitor.init();
        }
        var gotAccountSettings = false;
        var gotSites = false;
        var gotTodayData = false;

        this.userRef = this.database.ref("users").child(this.dbUid);

        var checkTabs = () => {
            if (!gotAccountSettings
                || !gotTodayData
                || !gotSites) return;
            app.initComplete = true;

            app.tabsMonitor.checkAllTabs(CheckAllTabsReason.SettingsChanged);
        }

        var onSettingsChanged = (snap: firebase.DataSnapshot) => {
            var newSettings = snap.val();
            app.settings = deepMerge<AppSettings>(newSettings, app.defaultSettings);
            console.log("New account settings", app.settings);
            gotAccountSettings = true;
            checkTabs();
        };

        if (this.settingsRef) this.settingsRef.off("value", onSettingsChanged)
        this.settingsRef = this.userRef.child("settings");
        this.settingsRef.on("value", onSettingsChanged);

        var onUserSitesChanged = (snap: firebase.DataSnapshot) => {
            app.sitesSettings = snap.val() || {};
            gotSites = true;
            checkTabs();
        };

        if (this.userSitesRef) this.settingsRef.off("value", onUserSitesChanged)
        this.userSitesRef = this.userRef.child("sites");
        this.userSitesRef.on("value", onUserSitesChanged);

        var onDayHistoricsChanged = (snap: firebase.DataSnapshot) => {
            app.todaysDataSnap = snap;
            gotTodayData = true;
            checkTabs();
        }

        if (this.userSitesRef) this.settingsRef.off("value", onUserSitesChanged)
        this.todaysRef = this.userRef.child("today");
        this.todaysRef.on("value", onDayHistoricsChanged);

    }


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

    static getKey(parts: any[]) {
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

    static twoDigits(n: number): string {
        return n >= 10 ? n.toString() : "0" + n;
    }



}

abstract class TimedItem {
    private _active: boolean;
    private _activatedTime: Date;
    private _groups: TimedGroup[] = [];
    private _initialized: boolean;
    private _timings: AggregateTimings;
    private _timingsPath: string;

    constructor() {

    }

    isActive(): boolean {
        return this._active;
    }

    
    public start(updates: DatabaseUpdates): void {
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
            this._groups.forEach(p => p.memberStarted(this, updates));
        }
    }

    public stop(updates: DatabaseUpdates): void {        
        if (!this._active) return;
        this._active = false;
        if (!this._activatedTime) return;
        var duration = (new Date().getTime() - this._activatedTime.getTime()) / 1000;

        delete this._timings.activated;
        this._timings.timed = OneDec((this._timings.timed || 0) + duration);
        updates[this._timingsPath] = this._timings;
        this._groups.forEach(p => p.memberStopped(this, updates));
    }

    public getValue(): number {
        if (!this._initialized) return 0;
        var result = this._timings.timed || 0;
        if (this._activatedTime) {
            var d = (new Date().getTime() - this._activatedTime.getTime()) / 1000;
            result += d;
        }
        return Math.round(result);
    }

    abstract getTimingPath(): any[];
    abstract onInitializeGroups(updates: DatabaseUpdates): void;


    protected joinGroup(group: TimedGroup, updates: DatabaseUpdates) {
        if (this._groups.indexOf(group) >= 0) return;
        this._groups.push(group);
        if (this._active) group.memberStarted(this, updates);
    }

    protected leaveGroup(group: TimedGroup, updates: DatabaseUpdates) {
        if (this._active) group.memberStopped(this, updates)
        this._groups = this._groups.filter(x => x !== group);
    }
}

class TimedGroup extends TimedItem {
    private _nbMembers: number = 0;
    private name: string;

    constructor(private timingPath: string[]) {
        super();
    }

    public memberStarted(child: TimedItem, updates: DatabaseUpdates) {
        this._nbMembers += 1;
        if (this._nbMembers > 0) this.start(updates);
    }

    public memberStopped(child: TimedItem, updates: DatabaseUpdates) {
        this._nbMembers -= 1;
        if (this._nbMembers == 0) this.stop(updates);
    }

    getTimingPath(): any[] {
        return this.timingPath;
    }

    onInitializeGroups(updates: DatabaseUpdates): void {
    }

}

class MonitoredSite {
    private hostnameKey: string
    public static list: { [hostname: string]: MonitoredSite } = {};
    public static todayTimed: TimedGroup = new TimedGroup(["timings", "todayTimed"]);
    public static todayUntimed: TimedGroup = new TimedGroup(["timings", "todayUntimed"]);
    public static todayAudio: TimedGroup = new TimedGroup(["timings", "todayAudio"]);
    private timeGroup: TimedGroup;

    public static get(hostname: string, title?: string): MonitoredSite {
        var result = MonitoredSite.list[hostname];
        if (!result) {
            MonitoredSite.list[hostname] = result = new MonitoredSite(hostname);
        }
        return result;
    }

    private constructor(private hostname: string) {
        this.hostnameKey = DatabaseManager.escapeKey(hostname);
        this.timeGroup = new TimedGroup(["sites", hostname, "timings"])
    }

    public getTiming(): TimedGroup {
        return this.timeGroup;
    }

    public get historicGranularity(): HistoricGranularity {
        var siteSettings = app.sitesSettings[this.hostnameKey] || {};
        return siteSettings.historicGranularity || app.defaultSettings.defaultGranularity;
    }

    public get access(): Access {
        var siteSettings = app.sitesSettings[this.hostnameKey] || {};
        return siteSettings.access || app.defaultSettings.defaultAccess;
    }

    public get description(): string {
        var siteSettings = app.sitesSettings[this.hostnameKey] || {};
        return siteSettings.description || "";
    }

    onInitializeGroups(updates: DatabaseUpdates): void {
    }

    getSitesTotal(): number {
        return this.timeGroup.getValue();
    }
    getSitesMax(): number {
        return 3600;
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
            MonitoredUrl.list[url] = result = new MonitoredUrl(url);
        }
        if (title) result.title = title;
        return result;
    }


    private constructor(url: string) {
        super();
        var realURL = new URL(url);
        this.hostname = realURL.hostname.replace(/^www\./, '');
        this.path = realURL.pathname;
        this.query = realURL.search;

        this.url = url;
        this.tabIds = [];
        this.site = MonitoredSite.get(this.hostname);
    }

    getAccess(): Access {
        return this.site.access;
    }

    onInitializeGroups(updates: DatabaseUpdates): void {
        this.joinGroup(this.site.getTiming(), updates);
        if (this.getAccess() === Access.AllowedAndFree) {
            this.joinGroup(MonitoredSite.todayUntimed, updates);
        }
        else {
            this.joinGroup(MonitoredSite.todayTimed, updates);
        }
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

    // private getHostRef(): firebase.DatabaseReference {
    //     var hostRef = app.databaseManager.todaysRef &&
    //         app.databaseManager.todaysRef
    //             .child("sites")
    //             .child(DatabaseManager.escapeKey(this.hostname));
    //     return hostRef;
    // }

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

    // private getVisitsRef(): firebase.DatabaseReference {
    //     var path = this.getPagePath();
    //     var visitsRef = this.getHostRef()
    //         .child("pages")
    //         .child(DatabaseManager.escapeKey(path))
    //         .child("visits");
    //     return visitsRef;
    // }

    getLpcMessage(action: LpcAction): LpcMessage {
        var access = app.settings.active ? this.site.access : Access.InstantClose;

        var todaysTotal = MonitoredSite.todayTimed.getValue(); //app.databaseManager.todaysTotal
        var todaysMax = app.settings.dailyMaximum; //app.databaseManager.todaysTotal
        var sitesTotal = this.site.getSitesTotal(); //todaysSite ? todaysSite.total :
        var sitesMax = this.site.getSitesMax();

        var message: LpcMessage = {
            sender: "LPCBackground",
            message: this.site.description || "Leia Parental Control",
            access: access,
            todaysTotal: todaysTotal,
            todaysMax: todaysMax,
            sitesTotal: sitesTotal,
            sitesMax: sitesMax

        };
        return message;
    }

    sendLpcMessages(action: LpcAction) {
        if (!this.tabIds) return;
        for (var id of this.tabIds) {
            this.sendLpcMessage(id, action);
        };
    }

    sendLpcMessage(tabId: number, action: LpcAction): void {
        var message = this.getLpcMessage(action);
        if (message.access == Access.InstantClose) {
            chrome.tabs.remove(tabId);
        }
        else chrome.tabs.sendMessage(tabId, message);
    }

    public dispose(updates: DatabaseUpdates): void {
        if (this.isActive()) {
            debugger; // not normal
            this.stop(updates);
        }
        delete MonitoredUrl.list[this.url];
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
                this.checkAllTabs(CheckAllTabsReason.TabChanged);
            });
        });
    }

    checkAllTabs(reason: CheckAllTabsReason): void {
        if (!app.initComplete) return;

        chrome.tabs.query({}, (tabs) => {
            var now = new Date();
            var nowTime: number = now.getTime();
            var tabIds: { [url: string]: number[] } = {};
            var activeTabs: { [url: string]: boolean } = {};
            var newActiveTabsIds: TabIdAndMonitoredUrl[] = [];

            for (var tab of tabs) {
                if (!tab.id || !tab.url) continue;
                var url = tab.url || "";
                var monitoredUrl = MonitoredUrl.get(url, tab.title);
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
                        monitoredUrl.sendLpcMessage(tab.id, LpcAction.SettingsChanged);
                    }
                }
            }
            this.activeTabsIds = newActiveTabsIds;
            // It generate quite a bit of database noise to deactivate and reactivate a site
            // It is better to activate new tabs and the deactivate old ones.
            var updates: DatabaseUpdates = {};
            // So: first activate
            for (var url in MonitoredUrl.list) {
                var monitoredUrl = MonitoredUrl.list[url];
                if (monitoredUrl) {
                    monitoredUrl.tabIds = tabIds[url];
                    if (activeTabs[url] && !monitoredUrl.isActive()) {
                        monitoredUrl.start(updates);
                        monitoredUrl.sendLpcMessages(LpcAction.Activated);
                    }
                }
            }
            // And then deactivate
            for (var url in MonitoredUrl.list) {
                var monitoredUrl = MonitoredUrl.list[url];
                if (monitoredUrl && !activeTabs[url]) {
                    if (monitoredUrl.isActive()) {
                        monitoredUrl.stop(updates);
                        monitoredUrl.sendLpcMessages(LpcAction.Deactivated);
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
    }

    init() {
        chrome.tabs.onCreated.addListener((tab) => {
            this.checkAllTabs(CheckAllTabsReason.TabChanged);
        });
        chrome.tabs.onActivated.addListener((tabinfo) => {
            this.checkAllTabs(CheckAllTabsReason.TabChanged);
        });
        chrome.tabs.onUpdated.addListener((tabId) => {
            this.checkAllTabs(CheckAllTabsReason.TabChanged);
        });
        chrome.tabs.onRemoved.addListener((tabId) => {
            this.checkAllTabs(CheckAllTabsReason.TabChanged);
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
        this.checkAllTabs(CheckAllTabsReason.MinuteTimer);

        var now = new Date();
        var secondsToNextMinute = (60 - now.getSeconds());
        setTimeout(() => {
            this.minuteClock();
        }, secondsToNextMinute * 1000);
    }

    secondClock() {
        for (var x of app.tabsMonitor.activeTabsIds) {
            x.monitoredUrl.sendLpcMessage(x.tabId, LpcAction.MinuteTimer);
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
                sendResponse(monitoredUrl.getLpcMessage(LpcAction.HelloResponse));
            }
            break;
    }
});
//TODO: <a href="https://icons8.com/web-app/5770/Sad">Sad icon</a> by Icons8
//============================================================================
