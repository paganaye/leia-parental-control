var app: BackgroundApplication = (<any>chrome.extension.getBackgroundPage()).app;


document.addEventListener('DOMContentLoaded', function () {
  var cpt = 0;

  var options = <HTMLLIElement>document.getElementById("options");
  options.onclick = function () {
    chrome.runtime.openOptionsPage();
  };

  var home = <HTMLLIElement>document.getElementById("home");
  home.onclick = function () {
    var url = "https://leiaparentalcontrol.firebaseapp.com/?account=" + app.options.accountId;

    chrome.tabs.query({ currentWindow: true, url: url }, function (tabs) {
      if (tabs.length > 0) {
        chrome.tabs.update(<number>tabs[0].id, { active: true });
      }
      else chrome.tabs.create({ url: url });
      window.close();
    });
  };

  var li = <HTMLLIElement>document.getElementById("timeleft");

  function tickMenu() {
    //li.innerText = "Remaining " + background.getRemainingTimeString();
    setTimeout(tickMenu, 1000 - new Date().getMilliseconds());
  }
  tickMenu();
});

