var app: BackgroundApplication = (<any>chrome.extension.getBackgroundPage()).app;

// Saves options to chrome.storage
function saveOptions() {

  var email1 = (<HTMLInputElement>document.getElementById('email1')).value;
  var email2 = (<HTMLInputElement>document.getElementById('email2')).value;
  var email3 = (<HTMLInputElement>document.getElementById('email3')).value;
  var saveMessage = <HTMLSpanElement>document.getElementById("saveMessage");
  saveMessage.innerText = "Saving...";
  var emails: string[] = [];
  if (email1.length > 0) emails.push(email1);
  if (email2.length > 0) emails.push(email2);
  if (email3.length > 0) emails.push(email3);

  app.databaseManager.saveEmailsSetting(emails);
  setTimeout(function () {

    saveMessage.textContent = '';
    setTimeout(() => window.close(), 250);
  }, 1000);
}

// Main tabs
document.addEventListener("DOMContentLoaded", function (event) {
  var okButton = <HTMLInputElement>document.getElementById('okButton');
  var cancelButton = <HTMLInputElement>document.getElementById('cancelButton');

  okButton.addEventListener('click', saveOptions);
  cancelButton.addEventListener('click', () => window.close());

  var emails = app.databaseManager.getEmailsSetting();
  (<HTMLInputElement>document.getElementById('email1')).value = emails[0] || "";
  (<HTMLInputElement>document.getElementById('email2')).value = emails[1] || "";
  (<HTMLInputElement>document.getElementById('email3')).value = emails[2] || "";
});
