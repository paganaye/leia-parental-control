var app = chrome.extension.getBackgroundPage().app;
// Saves options to chrome.storage
function saveOptions() {
    // app.options.parentsEmail = parentsEmail.value;
    // console.log("Saving options...", app.options);
    // chrome.storage.sync.set(app.options, function () {
    //   // Update status to let user know options were saved.
    //   console.log("Options saved", app.options);
    //   saveMessage.textContent = 'Options saved.';
    // });
    // setTimeout(function () {
    //   saveMessage.textContent = '';
    //   window.close();
    // }, 1000);
}
function sendEmail() {
    // sendEmailMessage.innerText = "<not developped yet>";
    // setTimeout(function () {
    //   sendEmailMessage.textContent = '';
    // }, 1000);
}
// var accountId: HTMLSpanElement;
// var parentsEmail: HTMLInputElement;
// var sendEmailButton: HTMLInputElement;
// var sendEmailMessage: HTMLSpanElement;
// var saveButton: HTMLInputElement;
// var saveMessage: HTMLSpanElement;
var closeButton;
var accountPageLink;
function closeOptions() {
    // app.options.parentsEmail = parentsEmail.value;
    // console.log("Saving options...", app.options);
    // chrome.storage.sync.set(app.options, function () {
    //   // Update status to let user know options were saved.
    //   console.log("Options saved", app.options);
    //   saveMessage.textContent = 'Options saved.';
    // });
    // setTimeout(function () {
    //   saveMessage.textContent = '';
    // }, 1000);
    window.close();
}
// Main tabs
document.addEventListener("DOMContentLoaded", function (event) {
    var options = app.options || {};
    var closeButton = document.getElementById('closeButton');
    var accountPageLink = document.getElementById('accountPageLink');
    // accountId = <HTMLSpanElement>document.getElementById('accountId');
    // parentsEmail = <HTMLInputElement>document.getElementById('parentsEmail');
    // sendEmailButton = <HTMLInputElement>document.getElementById('sendEmailButton');
    // sendEmailMessage = <HTMLSpanElement>document.getElementById('sendEmailMessage');
    // saveButton = <HTMLInputElement>document.getElementById('saveButton');
    // saveMessage = <HTMLSpanElement>document.getElementById('saveMessage');
    // accountId.innerText = options.accountId;
    // parentsEmail.value = options.parentsEmail;
    // sendEmailButton.addEventListener('click', sendEmail)
    // saveButton.addEventListener('click', saveOptions);
    accountPageLink.href = "https://leiaparentalcontrol.firebaseapp.com/?account=" + app.options.accountId;
    closeButton.addEventListener('click', closeOptions);
});
