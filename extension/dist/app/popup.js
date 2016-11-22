var app = chrome.extension.getBackgroundPage().app;
document.addEventListener('DOMContentLoaded', function () {
    var cpt = 0;
    var options = document.getElementById("options");
    options.onclick = function () {
        chrome.runtime.openOptionsPage();
    };
    var home = document.getElementById("home");
    home.onclick = function () {
        var url = "https://leiaparentalcontrol.firebaseapp.com/?account=" + app.options.accountId;
        chrome.tabs.query({ currentWindow: true, url: url }, function (tabs) {
            if (tabs.length > 0) {
                chrome.tabs.update(tabs[0].id, { active: true });
            }
            else
                chrome.tabs.create({ url: url });
            window.close();
        });
    };
    var li = document.getElementById("timeleft");
    function tickMenu() {
        //li.innerText = "Remaining " + background.getRemainingTimeString();
        setTimeout(tickMenu, 1000 - new Date().getMilliseconds());
    }
    tickMenu();
});
