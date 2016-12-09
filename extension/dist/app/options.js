var app = chrome.extension.getBackgroundPage().app;
// Saves options to chrome.storage
function saveOptions() {
    var email1 = document.getElementById('email1').value;
    var email2 = document.getElementById('email2').value;
    var email3 = document.getElementById('email3').value;
    var saveMessage = document.getElementById("saveMessage");
    saveMessage.innerText = "Saving...";
    var emails = [];
    if (email1.length > 0)
        emails.push(email1);
    if (email2.length > 0)
        emails.push(email2);
    if (email3.length > 0)
        emails.push(email3);
    app.databaseManager.saveEmailsSetting(emails);
    setTimeout(function () {
        saveMessage.textContent = '';
        setTimeout(function () { return window.close(); }, 250);
    }, 1000);
}
// Main tabs
document.addEventListener("DOMContentLoaded", function (event) {
    var okButton = document.getElementById('okButton');
    var cancelButton = document.getElementById('cancelButton');
    okButton.addEventListener('click', saveOptions);
    cancelButton.addEventListener('click', function () { return window.close(); });
    var emails = app.databaseManager.getEmailsSetting();
    document.getElementById('email1').value = emails[0] || "";
    document.getElementById('email2').value = emails[1] || "";
    document.getElementById('email3').value = emails[2] || "";
});
