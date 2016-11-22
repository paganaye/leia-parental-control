var LpcOverlay = (function () {
    function LpcOverlay() {
    }
    LpcOverlay.prototype.start = function () {
        var _this = this;
        console.log(1);
        var overlay = this.overlay = document.createElement("div");
        overlay.id = "LeiaParentalControlOverlay";
        overlay.innerText = "Leia Parental Control";
        document.body.appendChild(overlay);
        document.addEventListener("DOMNodeRemovedFromDocument", function (e) {
            if (e.srcElement == overlay) {
                setTimeout(function () {
                    console.log("Overlay was removed...");
                    document.body.appendChild(overlay);
                });
            }
        });
        overlay.addEventListener("click", function () {
            _this.overlayClicked();
        });
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            _this.processMessage(request);
        });
        chrome.runtime.sendMessage({ sender: "LPCOverlay", message: "HELLO", url: document.URL }, function (response) {
            _this.processMessage(response);
        });
    };
    LpcOverlay.prototype.setFullScreen = function (value) {
        if (value) {
            this.overlay.classList.add('fullscreen');
            var videos = document.getElementsByTagName('video');
            if (videos.length && !(videos[0].paused)) {
                this.pausedVideo = videos[0];
                this.pausedVideo.pause();
            }
        }
        else {
            this.overlay.classList.remove('fullscreen');
            if (this.pausedVideo) {
                this.pausedVideo.play();
                this.pausedVideo = null;
            }
        }
    };
    LpcOverlay.prototype.overlayClicked = function () {
        {
            console.log("overlay clicked");
            if (chrome.runtime) {
                var isFullScreen = this.overlay.classList.contains('fullscreen');
                this.setFullScreen(!isFullScreen);
                chrome.runtime.sendMessage("I was clicked", function (response) {
                    console.log("response from extension:", response);
                });
            }
        }
    };
    LpcOverlay.prototype.processMessage = function (message) {
        if (message.sender != "LPCBackground")
            return;
        var overlay = document.getElementById("LeiaParentalControlOverlay");
        if (overlay) {
            if (message.message) {
                overlay.innerText = message.message;
            }
            if (message.showPage)
                overlay.classList.remove('fullscreen');
            else {
                overlay.classList.add('fullscreen');
            }
        }
    };
    return LpcOverlay;
}());
document.addEventListener("DOMContentLoaded", function (event) {
    setTimeout(function () {
        var overlay = new LpcOverlay();
        overlay.start();
    });
});
