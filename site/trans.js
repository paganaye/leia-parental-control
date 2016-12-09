var counter = document.getElementById("counter");
var button1 = document.getElementById("button1");

var database = firebase.database();
var counterRef = database.ref("/sandbox/counter");

counterRef.on('value', (snap) => {
    counterValue = snap.val();
    counter.innerText = counterValue;
});

button1.addEventListener("click", () => {
    counterRef.transaction(function (post) {
        alert("In Transaction - Counter current value = " + post);
        return (post == null ? null :  post + 1);
    });
});
